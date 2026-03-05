const mangayomiSources = [{
  name: "NovelFull",
  lang: "en",
  baseUrl: "https://novelfull.net",
  apiUrl: "",
  iconUrl: "https://novelfull.net/favicon.ico",
  typeSource: "single",
  itemType: 2,          // novels
  version: "0.0.1",
  dateFormat: "",
  dateFormatLocale: "",
  isNsfw: false,
  hasCloudflare: false,
  notes: ""
}];

class DefaultExtension extends MProvider {
  headers = {
    Referer: this.source.baseUrl,
    Origin: this.source.baseUrl,
    "User-Agent": "Mozilla/5.0"
  };

  // Browse / Popular
  async getPopular(page) {
    // TODO: replace selectors once you confirm NovelFull's HTML
    const url = `${this.source.baseUrl}/genre/all/${page}`;
    const res = await new Client().get(url, this.headers);

    const doc = new Document(res.body);

    // IMPORTANT: return { list: [...], hasNextPage: true/false }
    const list = doc.select(".list-novel .row").map((el) => {
      const a = el.selectFirst("h3 a");
      return {
        name: a?.text?.trim() ?? "",
        link: a?.getHref ?? ""
      };
    }).filter(x => x.name && x.link);

    const hasNextPage = list.length > 0; // crude; improve later
    return { list, hasNextPage };
  }

  // Latest
  async getLatestUpdates(page) {
    return this.getPopular(page); // placeholder
  }

  // Search
  async search(query, page, filters) {
    const url = `${this.source.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const res = await new Client().get(url, this.headers);
    const doc = new Document(res.body);

    const list = doc.select(".list-novel .row").map((el) => {
      const a = el.selectFirst("h3 a");
      return { name: a?.text?.trim() ?? "", link: a?.getHref ?? "" };
    }).filter(x => x.name && x.link);

    const hasNextPage = list.length > 0;
    return { list, hasNextPage };
  }

  // Details
  async getDetail(url) {
    const res = await new Client().get(url, this.headers);
    const doc = new Document(res.body);

    const title = doc.selectFirst("h3.title")?.text?.trim() ?? "";
    const description = doc.selectFirst(".desc-text")?.text?.trim() ?? "";
    const author = doc.selectFirst(".info a[href*='/author/']")?.text?.trim() ?? "";
    const genre = doc.select(".info a[href*='/genre/']").map(e => e.text.trim());

    // chapters
    const chapters = doc.select("#list-chapter a").map((a) => ({
      name: a.text.trim(),
      url: a.getHref,
      scanlator: "",
      dateUpload: null
    }));

    return {
      title,
      description,
      author,
      artist: "",
      genre,
      status: 5,
      imageUrl: doc.selectFirst(".book img")?.getSrc ?? "",
      chapters
    };
  }

  // Chapter text/pages (for novels you usually return an array of "pages" as strings)
  async getPageList(chapterUrl) {
    const res = await new Client().get(chapterUrl, this.headers);
    const doc = new Document(res.body);

    // Try common containers; adjust after inspecting HTML
    const content =
      doc.selectFirst("#chapter-content")?.text ??
      doc.selectFirst(".chapter-content")?.text ??
      "";

    // Mangayomi accepts array of strings
    return [content.trim()];
  }
}

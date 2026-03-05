// Novelfull (Novel) - Mangayomi JS Extension

const mangayomiSources = [
  {
    name: "NovelFull",
    baseUrl: "https://novelfull.net",
    lang: "en",
    iconUrl: "https://novelfull.net/favicon.ico",
    version: "1.0.0",
    isManga: false,
    isNsfw: false,
  },
];

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
  }

  // ---------- helpers ----------
  absoluteUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (!url.startsWith("/")) url = "/" + url;
    return this.source.baseUrl + url;
  }

  async fetchDocument(url) {
    const res = await this.client.get(url, {
      "User-Agent": "Mozilla/5.0",
      "Referer": this.source.baseUrl,
    });
    return new Document(res.body);
  }

  // Try multiple selectors because site themes change a lot.
  pickCover(el) {
    const img =
      el.selectFirst("img") ||
      el.selectFirst(".cover img") ||
      el.selectFirst(".book img");
    const src = img ? (img.attr("data-src") || img.attr("src")) : "";
    return this.absoluteUrl(src);
  }

  // ---------- Browse ----------
  async getPopular(page) {
    const url = `${this.source.baseUrl}/most-popular?page=${page}`;
    return await this.parseListing(url, page);
  }

  async getLatest(page) {
    const url = `${this.source.baseUrl}/latest-release-novel?page=${page}`;
    return await this.parseListing(url, page);
  }

  async search(query, page, filters) {
    // Common on this theme; if it 404s for you, tell me what URL the site uses in its search form action.
    const url = `${this.source.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    return await this.parseListing(url, page);
  }

  async parseListing(url, page) {
    const doc = await this.fetchDocument(url);

    // Listing entries usually contain an H3 title link.
    const titleLinks = doc.select("h3 a, .novel-title a, .book a");

    const seen = new Set();
    const list = [];

    for (const a of titleLinks) {
      const name = (a.text || "").trim();
      const link = a.attr("href") || "";
      const abs = this.absoluteUrl(link);
      if (!name || !abs || seen.has(abs)) continue;
      seen.add(abs);

      // walk up to find a container that also has an image
      const container =
        a.parent?.parent || a.parent || a;

      const cover = this.pickCover(container);

      list.push({
        name,
        url: abs,
        link: cover || "",
      });
    }

    // “hasNextPage” heuristic: if we got results, assume there’s another page.
    // You can improve this by detecting a disabled "Next" button if you want.
    return { list, hasNextPage: list.length > 0 };
  }

  // ---------- Details ----------
  async getDetail(url) {
    const doc = await this.fetchDocument(url);

    const title =
      (doc.selectFirst("h3")?.text || doc.selectFirst("h1")?.text || "").trim();

    // Description on this site is usually the first big paragraph under rating block
    const description =
      (doc.selectFirst(".desc-text")?.text ||
        doc.selectFirst(".summary")?.text ||
        doc.selectFirst("div:has(> h3:contains(Description))")?.text ||
        "").trim();

    // “Novel info” block usually has Author / Genres / Status
    const author =
      (doc.selectFirst("div:contains(Author) a")?.text ||
        doc.selectFirst(".info-holder a[href*='author']")?.text ||
        "").trim();

    const genreEls = doc.select("div:contains(Genres) a, .info-holder a[href*='/genre/']");
    const genre = genreEls.map(g => (g.text || "").trim()).filter(Boolean);

    const statusText =
      (doc.selectFirst("div:contains(Status)")?.text || "").toLowerCase();
    let status = 5; // unknown
    if (statusText.includes("ongoing")) status = 0;
    else if (statusText.includes("complete")) status = 1;

    const cover =
      this.absoluteUrl(
        doc.selectFirst("img")?.attr("data-src") ||
          doc.selectFirst("img")?.attr("src") ||
          ""
      );

    // Chapters are often in a list; also sometimes paginated.
    const chapters = await this.getChaptersFromDetail(doc);

    return {
      title,
      description,
      author,
      artist: "",
      genre,
      status,
      cover,
      chapters,
    };
  }

  async getChaptersFromDetail(doc) {
    const chapterLinks = doc.select(
      "ul.list-chapter a, .list-chapter a, a[href*='/chapter-'], a[href*='/volume-']"
    );

    const seen = new Set();
    const chapters = [];

    for (const a of chapterLinks) {
      const name = (a.text || "").trim();
      const href = a.attr("href") || "";
      const abs = this.absoluteUrl(href);
      if (!name || !abs || seen.has(abs)) continue;
      seen.add(abs);

      chapters.push({
        name,
        url: abs,
        scanlator: "",
        dateUpload: null,
      });
    }

    // Many sites list newest first; Mangayomi typically likes oldest->newest
    chapters.reverse();
    return chapters;
  }

  // ---------- Reader ----------
  async getPageList(chapterUrl) {
    const doc = await this.fetchDocument(chapterUrl);

    const contentEl =
      doc.selectFirst("#chapter-content") ||
      doc.selectFirst(".chapter-content") ||
      doc.selectFirst("div:has(> h2:contains(Chapter))");

    // Return one “page” containing HTML/text. (Mangayomi novel reader is fine with this.)
    const html = contentEl ? (contentEl.text || "").trim() : "";
    return [html];
  }
}

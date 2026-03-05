const BASE_URL = "https://novelfull.net";
const client = new Client();

async function parseNovelList(html) {
    const document = new Document(html);
    const novels = [];

    const items = document.select(".list-truyen .row");

    for (const item of items) {
        const a = item.selectFirst("h3.truyen-title a");

        novels.push({
            name: a.text.trim(),
            url: a.attr("href"),
            link: a.attr("href")
        });
    }

    return novels;
}

async function getPopular(page) {
    const res = await client.get(`${BASE_URL}/most-popular?page=${page}`);
    const novels = await parseNovelList(res.body);

    return {
        list: novels,
        hasNextPage: novels.length > 0
    };
}

async function getLatest(page) {
    const res = await client.get(`${BASE_URL}/latest-release-novel?page=${page}`);
    const novels = await parseNovelList(res.body);

    return {
        list: novels,
        hasNextPage: novels.length > 0
    };
}

async function search(query, page) {
    const res = await client.get(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}&page=${page}`);
    const novels = await parseNovelList(res.body);

    return {
        list: novels,
        hasNextPage: novels.length > 0
    };
}

async function getDetail(url) {
    const res = await client.get(url);
    const document = new Document(res.body);

    const title = document.selectFirst(".title").text.trim();
    const description = document.selectFirst("#tab-description").text.trim();

    const genres = [];
    const genreElements = document.select(".info a[href*='/genre/']");
    for (const g of genreElements) {
        genres.push(g.text.trim());
    }

    let status = 5;
    const statusText = document.selectFirst(".info").text.toLowerCase();
    if (statusText.includes("ongoing")) status = 0;
    if (statusText.includes("completed")) status = 1;

    const chapterElements = document.select("#list-chapter li a");
    const chapters = [];

    for (const ch of chapterElements) {
        chapters.push({
            name: ch.text.trim(),
            url: ch.attr("href"),
            scanlator: "",
            dateUpload: null
        });
    }

    chapters.reverse();

    return {
        title,
        description,
        genre: genres,
        status,
        chapters
    };
}

async function getPageList(url) {
    const res = await client.get(url);
    const document = new Document(res.body);

    const content = document.selectFirst("#chapter-content");

    let html = content.html.replaceAll("<br>", "\n");

    const page =
`<html>
<body style="font-family: serif; padding: 20px; line-height: 1.6;">
${html}
</body>
</html>`;

    return [
        {
            url: "data:text/html," + encodeURIComponent(page)
        }
    ];
}

const source = {
    getPopular,
    getLatest,
    search,
    getDetail,
    getPageList
};

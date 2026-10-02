// Find Malaysian TikTokers making septic tank / wastewater content.
// Run: node scrape-tiktok.mjs
import { readFileSync, writeFileSync } from "node:fs";

// 1. Load the API key from .env
const env = readFileSync(".env", "utf8");
const TOKEN = env.match(/^APIFY_API_TOKEN=(.+)$/m)[1].trim();

// 2. What to search for (Malay + English)
const input = {
  searchQueries: [
    "tangki septik",
    "septic tank malaysia",
    "sedut tangki najis",
    "indah water",
    "air sisa kumbahan",
    "wastewater malaysia",
  ],
  hashtags: ["tangkiseptik", "septictank", "indahwater", "kumbahan"],
  resultsPerPage: 30,
  proxyCountryCode: "MY",
};

// 3. Run the Apify TikTok Scraper and wait for the results
console.log("Scraping TikTok... (takes a few minutes)");
const res = await fetch(
  "https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?timeout=600",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }
);
if (!res.ok) throw new Error(`Apify error ${res.status}: ${await res.text()}`);
const videos = await res.json();
writeFileSync("tiktok-videos.json", JSON.stringify(videos, null, 2));
console.log(`Got ${videos.length} videos`);

// 4. Group videos by creator
const creators = {};
for (const v of videos) {
  const a = v.authorMeta;
  if (!a?.name) continue;
  const c = (creators[a.name] ??= {
    username: a.name,
    nickname: a.nickName ?? "",
    followers: a.fans ?? 0,
    region: a.region ?? "",
    videos: 0,
    totalViews: 0,
    topVideo: "",
    topViews: 0,
  });
  c.videos++;
  c.totalViews += v.playCount ?? 0;
  if ((v.playCount ?? 0) > c.topViews) {
    c.topViews = v.playCount ?? 0;
    c.topVideo = v.webVideoUrl ?? "";
  }
}

// 5. Rank: most views on this topic first
const ranked = Object.values(creators).sort((a, b) => b.totalViews - a.totalViews);

// 6. Save as CSV (opens in Excel / Google Sheets)
const cols = ["username", "nickname", "followers", "region", "videos", "totalViews", "topViews", "topVideo"];
const esc = (x) => `"${String(x).replace(/"/g, '""')}"`;
const csv = [cols.join(","), ...ranked.map((c) => cols.map((k) => esc(c[k])).join(","))].join("\n");
writeFileSync("tiktok-creators.csv", csv);

console.table(ranked.slice(0, 20).map(({ topVideo, ...c }) => c));
console.log("Saved tiktok-creators.csv and tiktok-videos.json");

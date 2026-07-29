import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedJob } from "./lib/dedupe";

export interface ScrapeConfig {
  type: "static";
  listSelector: string;
  titleSelector: string;
  linkSelector: string;
  dateSelector?: string;
}

// A config-driven scraper for simple, server-rendered notification tables/lists.
// This covers UPSC, SSC, and FreeJobAlert to start (see SOURCES.md). Sites that
// render listings client-side with JS will need a Playwright-based scraper
// instead — add it as a sibling module and branch on scrapeConfig.type.
//
// IMPORTANT: the selectors seeded in prisma/seed.ts are placeholders. Before
// the first real run, open each source's recruitment/notification page in a
// browser, inspect the DOM, and replace them with the actual selectors.
export async function scrapeStaticSource(
  sourceName: string,
  baseUrl: string,
  category: string,
  config: ScrapeConfig
): Promise<ScrapedJob[]> {
  const { data: html } = await axios.get(baseUrl, {
    headers: { "User-Agent": "my-job-board-scraper/0.1 (contact: memoubuntu14@gmail.com)" },
    timeout: 15000
  });

  const $ = cheerio.load(html);
  const jobs: ScrapedJob[] = [];

  $(config.listSelector).each((_, el) => {
    const row = $(el);
    const title = row.find(config.titleSelector).first().text().trim();
    let link = row.find(config.linkSelector).first().attr("href") ?? "";
    if (!title || !link) return;

    if (link.startsWith("/")) link = new URL(link, baseUrl).toString();

    jobs.push({
      sourceUrl: link,
      title,
      organization: sourceName,
      category,
      sourceSite: sourceName
    });
  });

  return jobs;
}

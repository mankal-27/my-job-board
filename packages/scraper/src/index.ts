import { PrismaClient } from "@prisma/client";
import { scrapeStaticSource, ScrapeConfig } from "./genericScraper";
import { upsertScrapedJobs } from "./lib/dedupe";

const prisma = new PrismaClient();

async function main() {
  const sources = await prisma.source.findMany({ where: { isActive: true } });
  console.log(`Running scrape for ${sources.length} active source(s)`);

  for (const source of sources) {
    const config = source.scrapeConfig as unknown as ScrapeConfig;
    const startedAt = new Date();

    try {
      const jobs = await scrapeStaticSource(source.name, source.baseUrl, source.name, config);
      const stats = await upsertScrapedJobs(prisma, jobs);

      await prisma.scrapeLog.create({
        data: {
          sourceId: source.id,
          runAt: startedAt,
          status: "success",
          jobsFound: stats.jobsFound,
          jobsNew: stats.jobsNew,
          jobsUpdated: stats.jobsUpdated
        }
      });
      await prisma.source.update({
        where: { id: source.id },
        data: { lastScrapedAt: new Date() }
      });

      console.log(`${source.name}: found ${stats.jobsFound}, new ${stats.jobsNew}, updated ${stats.jobsUpdated}`);
    } catch (err: any) {
      await prisma.scrapeLog.create({
        data: {
          sourceId: source.id,
          runAt: startedAt,
          status: "error",
          errorMessage: String(err?.message ?? err)
        }
      });
      console.error(`${source.name} failed:`, err?.message ?? err);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

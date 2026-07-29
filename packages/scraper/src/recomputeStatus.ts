import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Runs independently of scraping: flips upcoming -> ongoing -> closed purely
// from each job's own dates, so status stays correct even for rows the
// scraper hasn't touched today. Schedule right after the scrape job.
async function main() {
  const now = new Date();

  const toOngoing = await prisma.job.updateMany({
    where: { status: "upcoming", applicationStartDate: { lte: now }, isActive: true },
    data: { status: "ongoing" }
  });

  const toClosed = await prisma.job.updateMany({
    where: { status: "ongoing", applicationEndDate: { lt: now }, isActive: true },
    data: { status: "closed" }
  });

  console.log(`Flipped ${toOngoing.count} job(s) to ongoing, ${toClosed.count} job(s) to closed`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

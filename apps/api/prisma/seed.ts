import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Phase 1 starter sources — see SOURCES.md for why these three were picked first.
const sources = [
  {
    name: "UPSC",
    baseUrl: "https://www.upsc.gov.in/recruitment/recruitment-advertisement",
    scrapeConfig: {
      type: "static",
      listSelector: "table tr",
      // TODO: inspect actual DOM and fill in real selectors before first run
      titleSelector: "td:nth-child(2) a",
      linkSelector: "td:nth-child(2) a",
      dateSelector: "td:nth-child(3)"
    }
  },
  {
    name: "SSC",
    baseUrl: "https://ssc.nic.in/",
    scrapeConfig: {
      type: "static",
      listSelector: ".notice-board li",
      titleSelector: "a",
      linkSelector: "a"
    }
  },
  {
    name: "FreeJobAlert",
    baseUrl: "https://www.freejobalert.com/",
    scrapeConfig: {
      type: "static",
      listSelector: "table.latest-jobs tr",
      titleSelector: "td a",
      linkSelector: "td a"
    }
  }
];

async function main() {
  for (const source of sources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: { baseUrl: source.baseUrl, scrapeConfig: source.scrapeConfig },
      create: source
    });
  }
  console.log(`Seeded ${sources.length} sources`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

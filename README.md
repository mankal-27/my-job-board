# My Job Board — Phase 0/1 scaffold

Indian government job board: Next.js frontend, Express + Prisma API, PostgreSQL, and a daily-cron scraper with dedup/upsert. See `ARCHITECTURE.md` for the full system design and phased plan, and `SOURCES.md` for the source list and legal notes.

## Structure

```
apps/web       Next.js frontend (App Router)
apps/api       Express API + Prisma schema/migrations
packages/scraper   Scraper workers + dedup/upsert logic, run by GitHub Actions daily
.github/workflows/scrape.yml   Daily cron (03:00 UTC)
```

## One-time account setup (you need to do this — I can't create accounts on your behalf)

1. **Database**: sign up at [neon.tech](https://neon.tech) (or supabase.com), create a project, copy the connection string.
2. **Frontend hosting**: sign up at [vercel.com](https://vercel.com), import this repo, set root directory to `apps/web`, add env var `NEXT_PUBLIC_API_URL` pointing at your deployed API.
3. **API hosting**: sign up at [render.com](https://render.com) (or railway.app), create a Web Service from this repo with root directory `apps/api`, build command `npm install && npm run build && npm run generate`, start command `npm start`, and set `DATABASE_URL`.
4. **GitHub Actions secret**: in your GitHub repo settings → Secrets → Actions, add `DATABASE_URL` so the daily scrape workflow can reach your database.

## Local development

```bash
cp .env.example .env          # fill in DATABASE_URL
npm install
npm run db:migrate --workspace=apps/api   # creates tables from prisma/schema.prisma
npm run db:seed --workspace=apps/api      # inserts the 3 Phase 1 starter sources
npm run dev:api                            # starts API on :4000
npm run dev:web                            # starts frontend on :3000 (separate terminal)
```

## Before the first real scrape

The selectors in `apps/api/prisma/seed.ts` are placeholders. Open each source's notification page in a browser, inspect the actual HTML (dev tools → Elements), and update `scrapeConfig` for each source (either by editing the seed file and re-seeding, or directly in the `sources` table) before running:

```bash
npm run scrape
```

## Next steps (Phase 1)

- Fix real selectors for UPSC, SSC, and FreeJobAlert against live HTML.
- Verify field mapping — dates, vacancy counts, and PDF links differ per source and need small parsing tweaks in `genericScraper.ts` or a dedicated scraper module per source if the generic one doesn't fit.
- Deploy, then confirm `npm run scrape` run via the GitHub Actions workflow populates the database end to end.

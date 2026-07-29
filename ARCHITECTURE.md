# Indian Government Job Board — System Architecture and Implementation Plan

Stack: Next.js (frontend) + Node/Express (backend API) + PostgreSQL, deployed on free/low-cost tiers (Vercel + Render/Railway + Neon/Supabase). Scraper runs on a daily cron, dedupes against existing records, and upserts changes.

## 1. What the app does

A public site listing Indian government job notifications split into three buckets: **upcoming** (notification released, applications not yet open), **ongoing** (applications open), and **past** (closed / result declared). Users can search and filter by category (SSC, UPSC, Railways, Banking, State PSC, Defence, etc.), qualification, location, and organization, and view each notification's key details plus a link to the official PDF.

Behind it, a scraper pulls listings from government and aggregator sites once a day, compares each listing against what's already in the database, inserts new postings, updates changed ones, and leaves unchanged ones alone.

## 2. High-level architecture

The diagram above shows the pipeline. In words:

1. **Government job sources** — official sites (ssc.nic.in, upsc.gov.in, ibps.in, indianrailways.gov.in, state PSC portals) and reputable aggregators (Employment News, Sarkari Result-type listing pages) publish new notifications.
2. **Scraper workers** — a Node script (Cheerio for static HTML, Playwright for JS-rendered pages) runs once daily via a scheduled GitHub Actions workflow, hits each configured source, and extracts structured job records.
3. **Dedup and upsert engine** — for every scraped record, compute a content hash from its key fields and compare it to what's stored. New URL → insert. Existing URL with same hash → skip. Existing URL with different hash → update and log what changed. A second, independent daily job flips each posting's status (upcoming → ongoing → closed) purely from its own start/end dates, so status stays correct even between scrapes.
4. **PostgreSQL database** — single source of truth: jobs, sources (scrape configs), and scrape run logs.
5. **Express API layer** — REST endpoints for listing, filtering, searching, and serving a single job's detail; also an internal endpoint the admin dashboard uses to review/edit/hide listings.
6. **Next.js frontend** — server-rendered/ISR pages for SEO (government job seekers search Google heavily), category and state landing pages, job detail pages, and a search/filter UI.
7. **Job seeker's browser** — the end user.

Two components sit alongside this pipeline and are worth calling out even though they're not in the diagram: a lightweight **admin dashboard** (Phase 2) for manually reviewing ambiguous scrape results before they go live, and **monitoring** (Phase 4) so a broken scraper selector doesn't fail silently for weeks.

## 3. Data model

**`jobs`**
| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| source_url | text, unique | primary dedup key |
| content_hash | text | sha256 of normalized (title, org, dates, vacancies) — detects updates |
| title | text | |
| organization | text | e.g. "Staff Selection Commission" |
| category | text | SSC / UPSC / Railways / Banking / Defence / State-PSC / Teaching / Other |
| state | text, nullable | for state-level postings |
| qualification | text | |
| vacancies | int, nullable | |
| location | text | |
| notification_date | date | |
| application_start_date | date | |
| application_end_date | date | |
| exam_date | date, nullable | |
| official_pdf_url | text | |
| apply_link | text | |
| status | enum | upcoming / ongoing / closed / result_declared |
| source_site | text | which scraper produced this |
| is_active | boolean | soft-hide without deleting |
| scraped_at | timestamptz | |
| updated_at | timestamptz | |

**`sources`** — id, name, base_url, scrape_config (JSON: selectors / API endpoint), is_active, last_scraped_at.

**`scrape_logs`** — id, source_id, run_at, status (success/error), jobs_found, jobs_new, jobs_updated, error_message. This is what makes "if new create, if duplicate ignore, if changed update" auditable rather than a black box.

Indexes: unique on `source_url`, btree on `(status, category)`, and a Postgres full-text (`tsvector`) index on `title || organization` for search — no external search engine needed until scale demands it.

## 4. Dedup and update logic (the core requirement)

```
for each scraped record:
    normalize fields (trim, lowercase org names, parse dates consistently)
    hash = sha256(title + organization + application_start_date + application_end_date + vacancies)
    existing = SELECT * FROM jobs WHERE source_url = record.url

    if not existing:
        INSERT new row, status computed from dates
        log: jobs_new += 1
    elif existing.content_hash != hash:
        UPDATE row (fields + content_hash + updated_at), keep same id
        log: jobs_updated += 1, record what changed
    else:
        skip — no-op
```

A separate nightly job (no scraping involved) recomputes `status` for every active row purely from today's date vs. `application_start_date` / `application_end_date`, so a job flips from upcoming to ongoing on the right day even if the scraper doesn't touch that row.

## 5. Tools and frameworks by layer

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TailwindCSS | SSR/ISR gives good SEO for job search queries; one framework covers listing, detail, search pages |
| Backend API | Node.js + Express, Prisma ORM | Matches frontend language (one codebase to maintain solo); Prisma gives type-safe DB access and migrations |
| Scraper | Node + Cheerio/Axios (static pages), Playwright (JS-heavy pages) | Same language as backend; Playwright only where actually needed to keep runs fast |
| Scheduling | GitHub Actions scheduled workflow (`cron:`) | Free (2,000 min/month), runs up to 6 hours, avoids serverless function timeouts that would kill a Playwright-based scrape on Vercel's free tier |
| Database | PostgreSQL, hosted on Neon or Supabase (free tier) | Relational fit for structured job records; both offer generous free tiers and connection pooling |
| Search | Postgres full-text search (Phase 1–3), Meilisearch self-hosted (Phase 4+ if needed) | Avoid a second infra piece until traffic justifies it |
| Queue (later) | BullMQ + Redis (Upstash free tier) | Only needed once you have 20+ sources and want retries/concurrency control |
| Hosting | Vercel (frontend), Render or Railway (Express API + Postgres if not using Neon) | Free/low-cost, matches your stated preference |
| Monitoring | Sentry (errors), a scrape_logs dashboard page, UptimeRobot (uptime) | Catches silent scraper breakage from source-site HTML changes |
| CI/CD | GitHub Actions | Same platform already running the cron, no extra tool |
| Auth (if user accounts) | NextAuth.js | For "save job" / email alert features in later phases |
| Email alerts (later) | Resend | Free tier, simple API |

## 6. Legal and ethical scraping notes

Prefer official government domains as primary sources over aggregators where possible — they're authoritative and lower-risk. Before scraping any site: check `robots.txt`, read the terms of service, rate-limit requests (1 request per few seconds per domain, not parallel hammering), identify your scraper with a descriptive User-Agent, and cache/re-check rather than re-scraping unchanged pages every run. Government sites occasionally publish official RSS feeds or APIs — use those instead of HTML scraping wherever they exist.

## 7. Phased implementation plan

**Phase 0 — Planning (3–5 days)**
Finalize the first 3–5 source sites, confirm their robots.txt/ToS allow scraping, design the schema above, set up the monorepo (Next.js app + Express API + Prisma), provision free Postgres (Neon) and free hosting (Vercel + Render).

**Phase 1 — MVP (2–3 weeks)**
Build scrapers for the first 2–3 sources (start with ones with the simplest, most stable HTML). Implement the dedup/upsert logic and `scrape_logs`. Build the Express API (list, filter, detail endpoints). Build Next.js pages: home (upcoming/ongoing/past tabs), category listing, job detail. Manual `npm run scrape` trigger, no automation yet. Deploy.

**Phase 2 — Automation and admin (2 weeks)**
Wire the scraper into a GitHub Actions daily cron. Add the status auto-transition job. Build a minimal admin dashboard (password-protected Next.js route) to review new/updated postings, edit misparsed fields, and deactivate bad entries. Expand to 8–10 sources.

**Phase 3 — User-facing features (2 weeks)**
Full-text search, filters (state, qualification, category, vacancy count), "save job" and email alerts for saved searches (requires basic auth via NextAuth.js), sitemap.xml and `JobPosting` structured data (schema.org) for SEO.

**Phase 4 — Scale and reliability (2–3 weeks)**
Introduce BullMQ + Redis for scraper job queuing, retries, and concurrency limits once you're past ~20 sources. Add Sentry error tracking and uptime monitoring. Add proxy rotation only if a source starts blocking you (avoid pre-emptively — most govt sites don't rate-limit aggressively). Move search to Meilisearch if Postgres full-text search stops being fast enough.

**Phase 5 — Growth (ongoing)**
Performance tuning (ISR revalidation windows, image optimization), analytics, and optionally a React Native mobile app or WhatsApp/Telegram bot for daily job alerts, reusing the same Express API.

## 8. Rough monthly cost at MVP scale

Vercel (frontend): free tier. Render or Railway (Express API): free tier or ~$7/month once you outgrow it. Neon/Supabase Postgres: free tier up to ~0.5GB, fine for tens of thousands of job rows. GitHub Actions: free tier (2,000 min/month) comfortably covers one daily scrape run across dozens of sources. Total to start: $0/month; expect ~$10–20/month once traffic or scraper runtime outgrows free tiers.

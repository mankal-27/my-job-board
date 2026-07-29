# Source quantification — Indian government job data

Checked robots.txt and basic reachability directly for each domain below on 2026-07-29. "No robots.txt" means the request returned empty/404 — by convention that means no crawling restriction is published (still respect general scraping etiquette: low rate, identify your bot, re-check occasionally since sites can add one later).

## Tier 1 — National recruiting bodies (official, primary sources)

| Source | Domain | Robots.txt status | Notes |
|---|---|---|---|
| National Career Service | ncs.gov.in (listings on betacloud.ncs.gov.in) | Main domain restricts only internal `_layouts` paths; job-listing subdomain has no robots.txt | Single biggest source — 21,800+ live jobs, govt + private, run by Ministry of Labour. Best ROI: one integration covers most of India instead of scraping 30 boards individually |
| UPSC | upsc.gov.in | No robots.txt found | Civil Services, Defence, Engineering Services, Combined Medical, etc. |
| SSC | ssc.nic.in | No robots.txt found | CGL, CHSL, MTS, Stenographer, etc. |
| IBPS | ibps.in | No robots.txt found | Banking (PO/Clerk/SO across public sector banks) |
| RRB (Railways) | rrbcdg.gov.in | No robots.txt found | Central coordinating page for all 21 zonal Railway Recruitment Boards |
| Employment News | employmentnews.gov.in | No robots.txt found | Govt of India's official weekly recruitment gazette |
| Armed forces | joinindianarmy.nic.in (+ Navy/Air Force equivalents) | No robots.txt found | Defence recruitment, not yet individually verified for Navy/Air Force domains |

**Count: 6–7 national bodies**, of which NCS alone covers the largest volume.

## Tier 2 — State Public Service Commissions

27–28 state/UT-level PSCs exist under Article 315 of the Constitution (one per state, some UTs share a joint commission). Spot-checked:

| Source | Domain | Robots.txt status |
|---|---|---|
| Tamil Nadu PSC | tnpsc.gov.in | No robots.txt found |
| Kerala PSC | keralapsc.gov.in | Standard Drupal robots.txt — blocks only `/admin`, `/search`, `/user/login` etc.; public notification pages are unrestricted |
| Punjab, West Bengal, Maharashtra, Chhattisgarh, Uttarakhand, Arunachal Pradesh PSCs | ppsc.gov.in, psc.wb.gov.in, mpsc.gov.in, psc.cg.gov.in, psc.uk.gov.in | Identified, not individually crawl-tested yet |

**Count: ~27–28 state-level bodies**, structurally similar (each publishes a "notifications" or "advertisements" page) but each needs its own scraper selector config since none share a common CMS.

## Tier 3 — Aggregators (secondary/cross-check, not primary)

| Source | Robots.txt status | Verdict |
|---|---|---|
| freejobalert.com | Explicit `User-agent: *` → `Allow: /`, and explicitly allow-lists AI crawlers (ClaudeBot, GPTBot, PerplexityBot, etc.) | Green light — most scrape-friendly source checked. 1 crore+ monthly visitors, covers UPSC/SSC/Railway/Banking/State PSC/Police/Defence in one place |
| sarkariresult.com | robots.txt only whitelists Googlebot/Google-Image/Mediapartners — no generic `Allow`/`Disallow` for other bots | Ambiguous by design — they scoped rules to Google specifically. Treat as backup-only, scrape at low rate, don't rely on it as a primary source |
| sarkarijobs.com, adda247.com/jobs, nayawork.in | Not yet checked | Backup candidates for Phase 2+, verify individually before adding |

## What this means for source count

- **Phase 1 target: 3 sources** — UPSC, SSC, and freejobalert.com. These are the most stable HTML, cover the largest share of "central government job" searches, and freejobalert.com alone provides a cross-check against the two official sites plus early coverage of Railways/Banking/State PSC/Defence before you've built dedicated scrapers for each.
- **Phase 2 target: 8–10 sources** — add NCS (highest volume single source), IBPS, RRB, Employment News, and the 3–4 largest state PSCs by population (UP, Maharashtra, Tamil Nadu, West Bengal).
- **Full coverage target: ~35–40 sources** — all ~28 state PSCs + 7 national bodies + 1–2 aggregators as cross-check, reached by end of Phase 4.

## Legal note

None of the checked sites' robots.txt files block general crawling of public notification pages. That's necessary but not sufficient — it's still worth a quick manual read of each site's Terms of Use page before adding it as a source, particularly for the two aggregators, since robots.txt only governs crawlers, not the separate legal terms of use.

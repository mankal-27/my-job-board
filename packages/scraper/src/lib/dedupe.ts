import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

export interface ScrapedJob {
  sourceUrl: string;
  title: string;
  organization: string;
  category: string;
  state?: string;
  qualification?: string;
  vacancies?: number;
  location?: string;
  notificationDate?: Date;
  applicationStartDate?: Date;
  applicationEndDate?: Date;
  examDate?: Date;
  officialPdfUrl?: string;
  applyLink?: string;
  sourceSite: string;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Hash only the fields that indicate a *meaningful* change — cosmetic
// whitespace or re-scrapes of unchanged listings must not trigger an update.
export function computeContentHash(job: ScrapedJob): string {
  const basis = [
    normalize(job.title),
    normalize(job.organization),
    job.applicationStartDate?.toISOString() ?? "",
    job.applicationEndDate?.toISOString() ?? "",
    String(job.vacancies ?? "")
  ].join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

function computeStatus(job: ScrapedJob): "upcoming" | "ongoing" | "closed" {
  const now = new Date();
  if (job.applicationStartDate && now < job.applicationStartDate) return "upcoming";
  if (job.applicationEndDate && now > job.applicationEndDate) return "closed";
  return "ongoing";
}

export interface UpsertStats {
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
}

// Core requirement: "if duplicate ignore, if new create, if changed update".
export async function upsertScrapedJobs(
  prisma: PrismaClient,
  jobs: ScrapedJob[]
): Promise<UpsertStats> {
  const stats: UpsertStats = { jobsFound: jobs.length, jobsNew: 0, jobsUpdated: 0 };

  for (const job of jobs) {
    const contentHash = computeContentHash(job);
    const status = computeStatus(job);
    const existing = await prisma.job.findUnique({ where: { sourceUrl: job.sourceUrl } });

    if (!existing) {
      await prisma.job.create({
        data: { ...job, contentHash, status }
      });
      stats.jobsNew += 1;
    } else if (existing.contentHash !== contentHash) {
      await prisma.job.update({
        where: { sourceUrl: job.sourceUrl },
        data: { ...job, contentHash, status }
      });
      stats.jobsUpdated += 1;
    }
    // else: identical hash — skip, no-op, this is the "duplicate ignore" case
  }

  return stats;
}

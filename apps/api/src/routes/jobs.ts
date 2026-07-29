import { Router } from "express";
import { prisma } from "../db";

export const jobsRouter = Router();

// GET /api/jobs?status=ongoing&category=SSC&q=clerk&page=1
jobsRouter.get("/", async (req, res) => {
  const { status, category, state, q, page = "1" } = req.query as Record<string, string>;
  const pageSize = 20;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const where: any = { isActive: true };
  if (status) where.status = status;
  if (category) where.category = category;
  if (state) where.state = state;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { organization: { contains: q, mode: "insensitive" } }
    ];
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { notificationDate: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize
    }),
    prisma.job.count({ where })
  ]);

  res.json({ jobs, total, page: pageNum, pageSize });
});

// GET /api/jobs/:id
jobsRouter.get("/:id", async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Job {
  id: string;
  title: string;
  organization: string;
  status: string;
  qualification?: string;
  vacancies?: number;
  applicationStartDate?: string;
  applicationEndDate?: string;
  officialPdfUrl?: string;
}

async function getJob(id: string): Promise<Job | null> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) return <main style={{ padding: "2rem" }}>Job not found.</main>;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <a href="/">&larr; Back</a>
      <h1>{job.title}</h1>
      <p>{job.organization}</p>
      <p>Status: {job.status}</p>
      {job.qualification && <p>Qualification: {job.qualification}</p>}
      {job.vacancies && <p>Vacancies: {job.vacancies}</p>}
      {job.applicationStartDate && <p>Applications open: {job.applicationStartDate}</p>}
      {job.applicationEndDate && <p>Applications close: {job.applicationEndDate}</p>}
      {job.officialPdfUrl && (
        <p>
          <a href={job.officialPdfUrl} target="_blank" rel="noreferrer">
            Official notification (PDF)
          </a>
        </p>
      )}
    </main>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Job {
  id: string;
  title: string;
  organization: string;
  status: string;
  category: string;
}

async function getJobs(status: string): Promise<Job[]> {
  const res = await fetch(`${API_URL}/api/jobs?status=${status}`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.jobs ?? [];
}

export default async function HomePage() {
  const [upcoming, ongoing] = await Promise.all([getJobs("upcoming"), getJobs("ongoing")]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1>Sarkari Jobs Board</h1>

      <section>
        <h2>Ongoing applications</h2>
        <JobList jobs={ongoing} />
      </section>

      <section>
        <h2>Upcoming notifications</h2>
        <JobList jobs={upcoming} />
      </section>
    </main>
  );
}

function JobList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return <p>No jobs yet — run the scraper to populate the database.</p>;
  return (
    <ul>
      {jobs.map((job) => (
        <li key={job.id}>
          <a href={`/job/${job.id}`}>{job.title}</a> — {job.organization}
        </li>
      ))}
    </ul>
  );
}

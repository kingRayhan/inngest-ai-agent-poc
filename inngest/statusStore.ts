export type JobStatus = "pending" | "completed" | "error";

export interface JobRecord {
  status: JobStatus;
  response?: string;
  raw?: unknown;
  error?: string;
}

const jobs = new Map<string, JobRecord>();

export function setJobPending(id: string): void {
  jobs.set(id, { status: "pending" });
}

export function setJobCompleted(id: string, response: string, raw: unknown): void {
  jobs.set(id, { status: "completed", response, raw });
}

export function setJobError(id: string, error: string): void {
  jobs.set(id, { status: "error", error });
}

export function getJob(id: string): JobRecord | null {
  return jobs.get(id) ?? null;
}


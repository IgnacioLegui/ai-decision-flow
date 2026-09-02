export type StepResult = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
  nextNodeId: string | null;
};

export type RunState = {
  status: "running" | "done" | "error";
  startedAt: number;
  steps: StepResult[];
  error?: string;
  failedNodeId?: string;
};

const runs = new Map<string, RunState>();

export function createRun(runId: string) {
  runs.set(runId, { status: "running", startedAt: Date.now(), steps: [] });
}

export function appendStep(runId: string, step: StepResult) {
  const run = runs.get(runId);
  if (!run) return;
  run.steps.push(step);
}

export function finishRun(runId: string) {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "done";
}

export function failRun(runId: string, error: string, failedNodeId?: string) {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "error";
  run.error = error;
  run.failedNodeId = failedNodeId;
}

export function getRun(runId: string): RunState | undefined {
  return runs.get(runId);
}

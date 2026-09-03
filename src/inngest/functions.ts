import { inngest } from "./client";
import { askYesNo } from "@/lib/llm";
import { appendStep, finishRun, failRun } from "@/lib/execution-store";

type FlowNode = { id: string; data: { prompt: string } };
type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
};

const MAX_STEPS = 25;

export const runFlow = inngest.createFunction(
  { id: "run-flow", triggers: { event: "flow/run.requested" } },
  async ({ event, step }) => {
    const { runId, nodes, edges, startNodeId, input } = event.data as {
      runId: string;
      nodes: FlowNode[];
      edges: FlowEdge[];
      startNodeId: string;
      input?: string;
    };

    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const outgoingByNode = new Map<string, FlowEdge[]>();
    for (const edge of edges) {
      const list = outgoingByNode.get(edge.source) ?? [];
      list.push(edge);
      outgoingByNode.set(edge.source, list);
    }

    let currentId: string | null = startNodeId;
    let iterations = 0;

    try {
      while (currentId && iterations < MAX_STEPS) {
        const node = nodesById.get(currentId);
        if (!node) break;

        const nodeId = currentId;
        const stepIndex = iterations;
        const outgoing = outgoingByNode.get(nodeId) ?? [];

        if (outgoing.length === 0) {
          // Terminal node (e.g. "Support" / "Sales") — this is a final
          // destination, not a question to ask the LLM. Record it and stop.
          await step.run(`land-${stepIndex}-${nodeId}`, async () => {
            appendStep(runId, {
              nodeId,
              prompt: node.data.prompt,
              answer: null,
              nextNodeId: null,
            });
          });
          currentId = null;
          break;
        }

        const result: { nextNodeId: string | null } = await step.run(
          `decide-${stepIndex}-${nodeId}`,
          async () => {
            const answer = await askYesNo(node.data.prompt, input);
            const match = outgoing.find((e) => e.sourceHandle === answer.toLowerCase());
            const nextNodeId = match ? match.target : null;

            appendStep(runId, {
              nodeId,
              prompt: node.data.prompt,
              answer,
              nextNodeId,
            });

            return { nextNodeId };
          },
        );

        currentId = result.nextNodeId;
        iterations += 1;
      }

      await step.run("finish-run", async () => {
        finishRun(runId);
      });
    } catch (err) {
      const failedNodeId = currentId ?? undefined;
      await step.run("fail-run", async () => {
        failRun(runId, err instanceof Error ? err.message : "Unknown error", failedNodeId);
      });
      throw err;
    }

    return { runId, steps: iterations };
  },
);

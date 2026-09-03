import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { inngest } from "@/inngest/client";
import { createRun } from "@/lib/execution-store";

type FlowNode = { id: string; data: { prompt: string } };
type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    nodes: FlowNode[];
    edges: FlowEdge[];
    startNodeId?: string;
    input?: string;
  };
  const { nodes, edges, startNodeId, input } = body;

  if (!nodes?.length) {
    return NextResponse.json({ error: "Add at least one node before running." }, { status: 400 });
  }

  let startNode = startNodeId ? nodes.find((n) => n.id === startNodeId) : undefined;
  if (!startNode) {
    const targets = new Set(edges.map((e) => e.target));
    startNode = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
  }

  const runId = randomUUID();
  createRun(runId);

  await inngest.send({
    name: "flow/run.requested",
    data: { runId, nodes, edges, startNodeId: startNode.id, input },
  });

  return NextResponse.json({ runId });
}

"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SplitIcon, FlagIcon, AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { useRetryNode } from "./flow-context";

export type DecisionNodeData = {
  prompt: string;
  status?: "idle" | "active" | "visited" | "error";
  isTerminal?: boolean;
};

const statusRing: Record<NonNullable<DecisionNodeData["status"]>, string> = {
  idle: "border-border",
  active: "border-blue-500 ring-2 ring-blue-400 animate-pulse",
  visited: "border-emerald-500/70 ring-1 ring-emerald-400/50",
  error: "border-red-500 ring-2 ring-red-400",
};

function DecisionNodeComponent({ id, data, selected }: NodeProps) {
  const { prompt, status = "idle", isTerminal } = data as DecisionNodeData;
  const { updateNodeData } = useReactFlow();
  const retryNode = useRetryNode();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { prompt: e.target.value });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`w-64 rounded-lg border bg-card p-3 shadow-md transition-colors ${
        selected ? "border-primary ring-2 ring-primary/40" : statusRing[status]
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!h-3 !w-3 !bg-zinc-400"
      />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {isTerminal ? (
            <FlagIcon className="h-3.5 w-3.5" />
          ) : (
            <SplitIcon className="h-3.5 w-3.5" />
          )}
          {isTerminal ? "Terminal node" : "Decision node"}
        </div>
        {status === "error" && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
      </div>

      <Textarea
        value={prompt}
        onChange={handleChange}
        placeholder={
          isTerminal
            ? "Label for this destination, e.g. “Route to Support team”"
            : "Yes/no question to ask the LLM, e.g. “Is this a support request?”"
        }
        className="nodrag nowheel min-h-16 resize-none text-sm"
      />

      {status === "error" && (
        <Button
          size="sm"
          variant="outline"
          className="nodrag mt-2 h-7 w-full gap-1.5 border-red-300 text-xs text-red-600 hover:bg-red-50"
          onClick={() => retryNode(id)}
        >
          <RotateCcwIcon className="h-3 w-3" />
          Retry from here
        </Button>
      )}

      <div className="mt-2 flex justify-between px-1 text-[10px] font-semibold uppercase tracking-wide">
        <span className="text-red-500">No</span>
        <span className="text-emerald-500">Yes</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "25%" }}
        className="!h-3 !w-3 !bg-red-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "75%" }}
        className="!h-3 !w-3 !bg-emerald-500"
      />
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);

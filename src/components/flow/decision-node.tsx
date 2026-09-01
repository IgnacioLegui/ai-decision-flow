"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";

export type DecisionNodeData = {
  prompt: string;
};

function DecisionNodeComponent({ id, data, selected }: NodeProps) {
  const { prompt } = data as DecisionNodeData;
  const { updateNodeData } = useReactFlow();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { prompt: e.target.value });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`w-64 rounded-lg border bg-card p-3 shadow-md ${
        selected ? "border-primary ring-2 ring-primary/40" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!h-3 !w-3 !bg-zinc-400"
      />

      <div className="mb-2 text-xs font-semibold text-muted-foreground">
        Decision node
      </div>

      <Textarea
        value={prompt}
        onChange={handleChange}
        placeholder="Is this a support request?"
        className="nodrag nowheel min-h-16 resize-none text-sm"
      />

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

"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

function makeDecisionEdge(
  label: string,
  labelClassName: string,
  strokeColor: string,
) {
  function DecisionEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
  }: EdgeProps) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{ stroke: strokeColor, strokeWidth: selected ? 2.5 : 1.5 }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className={`nodrag nopan absolute rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${labelClassName}`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }

  return DecisionEdge;
}

export const YesEdge = makeDecisionEdge("YES", "bg-emerald-500", "#10b981");
export const NoEdge = makeDecisionEdge("NO", "bg-red-500", "#ef4444");

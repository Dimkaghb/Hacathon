"use client";

import React from 'react';
import { EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer } from '@xyflow/react';

const BRANCH_COLORS = [
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#06b6d4', // cyan
];

function getBranchColor(groupId?: string): string {
  if (!groupId) return '#8b5cf6';
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BRANCH_COLORS[Math.abs(hash) % BRANCH_COLORS.length];
}

export default function BranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const branchColor = getBranchColor(data?.branchGroupId as string);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: branchColor,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: '6 3',
          opacity: selected ? 1 : 0.7,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease',
        }}
      />
      {data?.branchLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: branchColor + '20',
              color: branchColor,
              border: `1px solid ${branchColor}40`,
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: 500,
            }}
          >
            {data.branchLabel as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

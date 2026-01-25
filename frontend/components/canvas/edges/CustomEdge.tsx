"use client";

import React from 'react';
import { EdgeProps, getBezierPath, BaseEdge } from '@xyflow/react';

export default function CustomEdge({
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
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: selected ? '#5a5a5a' : '#3a3a3a',
        strokeWidth: selected ? 2 : 1.5,
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
      }}
    />
  );
}

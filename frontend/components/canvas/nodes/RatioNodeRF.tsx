"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

const RATIO_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

export default function RatioNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
  const [aspectRatio, setAspectRatio] = useState(node.aspect_ratio || '16:9');

  useEffect(() => {
    setAspectRatio(node.aspect_ratio || '16:9');
  }, [node.aspect_ratio]);

  const handleRatioChange = (value: string) => {
    setAspectRatio(value);
    data.onUpdate?.({ aspect_ratio: value });
  };

  return (
    <div className={`rf-node rf-ratio-node ${selected ? 'selected' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="ratio-input"
        className="rf-handle"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="ratio-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Ratio</h3>
        <span className="rf-badge">{aspectRatio}</span>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="grid grid-cols-5 gap-1">
          {RATIO_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleRatioChange(option.value);
              }}
              className={`py-2 px-1 text-[10px] rounded transition-colors ${
                aspectRatio === option.value
                  ? 'bg-white text-black'
                  : 'bg-[#2a2a2a] text-[#808080] hover:bg-[#3a3a3a] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

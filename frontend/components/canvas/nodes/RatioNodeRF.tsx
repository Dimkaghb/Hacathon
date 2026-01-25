"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function RatioNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const [aspectRatio, setAspectRatio] = useState(node.aspect_ratio || '16:9');

  const ratioOptions = [
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
    { value: '4:3', label: '4:3' },
    { value: '21:9', label: '21:9' },
  ];

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
        <div className="grid grid-cols-3 gap-1.5">
          {ratioOptions.map(option => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleRatioChange(option.value);
              }}
              className={`px-2 py-1.5 text-[10px] rounded transition-colors ${
                aspectRatio === option.value
                  ? 'bg-white text-[#0f0f0f]'
                  : 'bg-[#2a2a2a] text-[#808080] hover:bg-[#3a3a3a]'
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

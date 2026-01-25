"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function RatioNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const [aspectRatio, setAspectRatio] = useState(node.aspect_ratio || '16:9');

  const ratioOptions = [
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '1:1', label: '1:1 (Square)' },
    { value: '4:3', label: '4:3 (Classic)' },
    { value: '21:9', label: '21:9 (Ultrawide)' },
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
        <h3 className="rf-node-title">Aspect Ratio</h3>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <select
          value={aspectRatio}
          onChange={(e) => handleRatioChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] focus:outline-none focus:border-[#6b7280] focus:ring-1 focus:ring-[#6b7280]/20 transition-all duration-200"
        >
          {ratioOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

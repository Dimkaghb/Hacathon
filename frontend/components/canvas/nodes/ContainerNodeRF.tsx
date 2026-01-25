"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function ContainerNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const [name, setName] = useState(node.name || '');

  useEffect(() => {
    setName(node.name || '');
  }, [node.name]);

  const handleNameChange = (value: string) => {
    setName(value);
    data.onUpdate?.({ name: value });
  };

  return (
    <div className={`rf-node rf-container-node ${selected ? 'selected' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="container-input"
        className="rf-handle"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="container-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Container</h3>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <input
          type="text"
          placeholder="Container name..."
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] placeholder-[#6b7280] focus:outline-none focus:border-[#6b7280] focus:ring-1 focus:ring-[#6b7280]/20 transition-all duration-200"
        />
      </div>
    </div>
  );
}

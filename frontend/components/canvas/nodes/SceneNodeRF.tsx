"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function SceneNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const [description, setDescription] = useState(node.description || '');

  useEffect(() => {
    setDescription(node.description || '');
  }, [node.description]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    data.onUpdate?.({ description: value });
  };

  return (
    <div className={`rf-node rf-scene-node ${selected ? 'selected' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="scene-input"
        className="rf-handle"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="scene-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Scene</h3>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Describe the scene..."
          className="w-full h-24 px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] placeholder-[#6b7280] focus:outline-none focus:border-[#6b7280] focus:ring-1 focus:ring-[#6b7280]/20 transition-all duration-200 resize-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

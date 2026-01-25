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
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Describe the scene..."
          className="rf-textarea h-24"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex justify-end mt-1.5">
          <span className="text-[9px] text-[#4a4a4a]">{description.length} chars</span>
        </div>
      </div>
    </div>
  );
}

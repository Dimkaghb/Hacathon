"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

export default function ContainerNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
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
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <input
          type="text"
          placeholder="Container name..."
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="rf-input"
        />
      </div>
    </div>
  );
}

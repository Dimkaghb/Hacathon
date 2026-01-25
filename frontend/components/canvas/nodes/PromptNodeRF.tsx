"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function PromptNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const [prompt, setPrompt] = useState(node.prompt || '');

  useEffect(() => {
    setPrompt(node.prompt || '');
  }, [node.prompt]);

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    data.onUpdate?.({ prompt: value });
  };

  return (
    <div className={`rf-node rf-prompt-node ${selected ? 'selected' : ''}`}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Prompt</h3>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder="Describe your video scene..."
          className="rf-textarea h-28"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex justify-end mt-1.5">
          <span className="text-[9px] text-[#4a4a4a]">{prompt.length} chars</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

export default function PromptNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
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
          className="rf-textarea"
          style={{ minHeight: '120px' }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex justify-end mt-1.5">
          <span className="text-[9px] text-[#4a4a4a]">{prompt.length} chars</span>
        </div>
      </div>
    </div>
  );
}

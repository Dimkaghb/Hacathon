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
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Enter your prompt..."
            className="w-full h-24 px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none placeholder:text-gray-500"
            onClick={(e) => e.stopPropagation()}
          />
          {prompt && (
            <div className="text-xs text-gray-500">
              {prompt.length} characters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

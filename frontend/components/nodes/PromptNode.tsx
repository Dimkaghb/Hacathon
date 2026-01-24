"use client";

import React, { useState, useEffect } from 'react';
import { Node } from '@/lib/types/node';
import BaseNode from './BaseNode';

interface PromptNodeProps {
  node: Node;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onConnectionStart?: (handleId: string, nodeId: string) => void;
  onConnectionEnd?: (handleId: string, nodeId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

export default function PromptNode({
  node,
  selected,
  onSelect,
  onMove,
  onDelete,
  onUpdate,
  onConnectionStart,
  onConnectionEnd,
  canvasScale,
  canvasOffset,
}: PromptNodeProps) {
  const [prompt, setPrompt] = useState(node.data?.prompt || '');

  useEffect(() => {
    setPrompt(node.data?.prompt || '');
  }, [node.data?.prompt]);

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onUpdate({ prompt: value });
  };

  const outputHandles = [
    { id: 'prompt-output', type: 'output' as const, position: { x: 0, y: 50 } },
  ];

  return (
    <BaseNode
      node={node}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onDelete={onDelete}
      outputHandles={outputHandles}
      onConnectionStart={onConnectionStart}
      onConnectionEnd={onConnectionEnd}
      canvasScale={canvasScale}
      canvasOffset={canvasOffset}
    >
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder="Enter your prompt..."
          className="w-full h-24 px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none placeholder:text-gray-500"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
        {prompt && (
          <div className="text-xs text-gray-500">
            {prompt.length} characters
          </div>
        )}
      </div>
    </BaseNode>
  );
}

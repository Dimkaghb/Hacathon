"use client";

import React from 'react';

interface CanvasToolbarProps {
  onAddNode: (type: 'image' | 'prompt' | 'video') => void;
}

export default function CanvasToolbar({ onAddNode }: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-[#2a2a2a] p-2 rounded-lg shadow-lg border border-gray-700">
      <button
        onClick={() => onAddNode('image')}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
      >
        + Image
      </button>
      <button
        onClick={() => onAddNode('prompt')}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
      >
        + Prompt
      </button>
      <button
        onClick={() => onAddNode('video')}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm font-medium"
      >
        + Video
      </button>
    </div>
  );
}

"use client";

import React from 'react';

interface CanvasToolbarProps {
  onAddNode: (type: 'image' | 'prompt' | 'video') => void;
}

export default function CanvasToolbar({ onAddNode }: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-1 bg-[var(--color-bg-tertiary)] p-1 rounded-md border border-[var(--color-border-default)]">
      <button
        onClick={() => onAddNode('image')}
        className="px-3 py-1.5 text-[var(--color-text-secondary)] rounded text-[11px] font-medium hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        + Image
      </button>
      <button
        onClick={() => onAddNode('prompt')}
        className="px-3 py-1.5 text-[var(--color-text-secondary)] rounded text-[11px] font-medium hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        + Prompt
      </button>
      <button
        onClick={() => onAddNode('video')}
        className="px-3 py-1.5 text-[var(--color-text-secondary)] rounded text-[11px] font-medium hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        + Video
      </button>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { Node } from '@/lib/types/node';
import BaseNode from './BaseNode';

interface VideoNodeProps {
  node: Node;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onGenerate: () => void;
  onConnectionStart?: (handleId: string, nodeId: string) => void;
  onConnectionEnd?: (handleId: string, nodeId: string) => void;
  connectedPrompt?: string;
  connectedImageUrl?: string;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

export default function VideoNode({
  node,
  selected,
  onSelect,
  onMove,
  onDelete,
  onUpdate,
  onGenerate,
  onConnectionStart,
  onConnectionEnd,
  connectedPrompt,
  connectedImageUrl,
  canvasScale,
  canvasOffset,
}: VideoNodeProps) {
  const [duration, setDuration] = useState(node.data?.duration || 8);
  const [resolution, setResolution] = useState(node.data?.resolution || '1080p');

  const inputHandles = [
    { id: 'prompt-input', type: 'input' as const, position: { x: 0, y: 30 } },
    { id: 'image-input', type: 'input' as const, position: { x: 0, y: 70 } },
  ];

  const canGenerate = !!(connectedPrompt && connectedPrompt.trim().length > 0);

  const handleGenerate = () => {
    if (canGenerate) {
      onUpdate({ duration, resolution });
      onGenerate();
    }
  };

  return (
    <BaseNode
      node={node}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onDelete={onDelete}
      inputHandles={inputHandles}
      onConnectionStart={onConnectionStart}
      onConnectionEnd={onConnectionEnd}
      canvasScale={canvasScale}
      canvasOffset={canvasOffset}
    >
      <div className="space-y-3">
        {/* Connected Inputs Status */}
        <div className="space-y-1 text-xs">
          <div className={`flex items-center gap-2 ${connectedPrompt && connectedPrompt.trim() ? 'text-green-400' : 'text-gray-500'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            Prompt: {connectedPrompt && connectedPrompt.trim() ? `Connected (${connectedPrompt.trim().length} chars)` : 'Not connected'}
          </div>
          <div className={`flex items-center gap-2 ${connectedImageUrl ? 'text-green-400' : 'text-gray-500'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            Image: {connectedImageUrl ? 'Connected' : 'Optional'}
          </div>
          {connectedPrompt && !connectedPrompt.trim() && (
            <div className="text-xs text-yellow-400 mt-1">
              ⚠️ Prompt node is connected but empty. Please enter a prompt.
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Duration (seconds)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={duration}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 8;
                setDuration(val);
                onUpdate({ duration: val });
              }}
              className="w-full px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => {
                setResolution(e.target.value);
                onUpdate({ resolution: e.target.value });
              }}
              className="w-full px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleGenerate();
          }}
          disabled={!canGenerate || node.status === 'processing'}
          className={`w-full py-2 px-4 rounded font-semibold text-sm transition-colors ${
            canGenerate && node.status !== 'processing'
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          title={!canGenerate ? 'Connect a prompt node and enter a prompt to generate video' : 'Generate video'}
        >
          {node.status === 'processing' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </span>
          ) : !canGenerate ? (
            'Generate Video (Connect Prompt)'
          ) : (
            'Generate Video'
          )}
        </button>

        {/* Status Messages */}
        {node.status === 'processing' && (
          <div className="text-xs text-yellow-400 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Generating... {node.data?.progress ? `${node.data.progress}%` : ''}</span>
          </div>
        )}
        {/* Show video if it exists, regardless of status (in case status wasn't updated) */}
        {node.data?.video_url && (
          <div className="space-y-2">
            {node.status === 'completed' && (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span>✓</span>
                <span>Video generated successfully</span>
              </div>
            )}
            {node.data.video_url.startsWith('gs://') ? (
              <div className="text-xs text-yellow-400">
                ⚠️ Video stored in GCS. Download URL needed for playback.
              </div>
            ) : (
              <div className="space-y-2">
                <video
                  src={node.data.video_url}
                  controls
                  preload="metadata"
                  className="w-full rounded border border-gray-700 max-h-48"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  Your browser does not support the video tag.
                </video>
                <a
                  href={node.data.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open in new tab →
                </a>
              </div>
            )}
          </div>
        )}
        {node.status === 'failed' && node.error_message && (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>{node.error_message}</span>
          </div>
        )}
        {connectedPrompt && node.status !== 'processing' && (
          <div className="text-xs text-gray-400 italic truncate">
            "{connectedPrompt.substring(0, 50)}..."
          </div>
        )}
      </div>
    </BaseNode>
  );
}

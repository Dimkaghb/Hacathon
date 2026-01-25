"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function VideoNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  // Connected data passed from parent
  const connectedPrompt = data.connectedPrompt || '';
  const connectedImageUrl = data.connectedImageUrl || '';

  // Settings
  const [duration, setDuration] = useState(node.duration || 8);
  const [resolution, setResolution] = useState(node.resolution || '1080p');

  const canGenerate = !!(connectedPrompt && connectedPrompt.trim().length > 0);

  const handleGenerate = () => {
    if (canGenerate) {
      data.onUpdate?.({ duration, resolution });
      data.onGenerate?.();
    }
  };

  return (
    <div className={`rf-node rf-video-node ${selected ? 'selected' : ''}`}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        className="rf-handle"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="rf-handle"
        style={{ top: '70%' }}
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">Video</h3>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
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
                  data.onUpdate?.({ duration: val });
                }}
                className="w-full px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => {
                  setResolution(e.target.value);
                  data.onUpdate?.({ resolution: e.target.value });
                }}
                className="w-full px-3 py-2 bg-[#151515] text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
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
            disabled={!canGenerate || status === 'processing'}
            className={`w-full py-2 px-4 rounded font-semibold text-sm transition-colors ${
              canGenerate && status !== 'processing'
                ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            title={!canGenerate ? 'Connect a prompt node and enter a prompt to generate video' : 'Generate video'}
          >
            {status === 'processing' ? (
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

          {/* Status Messages - Detailed Progress */}
          {status === 'processing' && (
            <div className="space-y-2 p-2 bg-[#1a1a1a] rounded border border-yellow-500/30">
              <div className="text-xs text-yellow-400 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">
                  {node.progress_message || `Generating... ${node.progress || 0}%`}
                </span>
              </div>
              {node.progress !== undefined && (
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              )}
              {node.stage && (
                <div className="text-xs text-gray-400">
                  Stage: <span className="text-gray-300 capitalize">{node.stage}</span>
                </div>
              )}
              {node.progress !== undefined && (
                <div className="text-xs text-gray-400">
                  Progress: <span className="text-gray-300">{node.progress}%</span>
                </div>
              )}
            </div>
          )}
          {/* Show video if it exists, regardless of status */}
          {node.video_url && (
            <div className="space-y-2">
              {status === 'completed' && (
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span>✓</span>
                  <span>Video generated successfully</span>
                </div>
              )}
              {node.video_url.startsWith('gs://') ? (
                <div className="text-xs text-yellow-400">
                  ⚠️ Video stored in GCS. Download URL needed for playback.
                </div>
              ) : (
                <div className="space-y-2">
                  <video
                    src={node.video_url}
                    controls
                    preload="metadata"
                    className="w-full rounded border border-gray-700 max-h-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <a
                    href={node.video_url}
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
          {status === 'failed' && (
            <div className="space-y-2 p-2 bg-[#1a1a1a] rounded border border-red-500/30">
              <div className="text-xs text-red-400 flex items-center gap-1 font-semibold">
                <span>⚠️</span>
                <span>Generation Failed</span>
              </div>
              {errorMessage && (
                <div className="text-xs text-red-300 whitespace-pre-wrap break-words">
                  {errorMessage}
                </div>
              )}
              {node.progress_message && node.progress_message !== errorMessage && (
                <div className="text-xs text-gray-400">
                  Last status: {node.progress_message}
                </div>
              )}
              {node.stage && (
                <div className="text-xs text-gray-500">
                  Failed at stage: {node.stage}
                </div>
              )}
            </div>
          )}
          {connectedPrompt && status !== 'processing' && (
            <div className="text-xs text-gray-400 italic truncate">
              "{connectedPrompt.substring(0, 50)}..."
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

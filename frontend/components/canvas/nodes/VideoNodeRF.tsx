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
            <div className={`flex items-center gap-2 ${connectedPrompt && connectedPrompt.trim() ? 'text-[#9ca3af]' : 'text-[#6b7280]'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Prompt: {connectedPrompt && connectedPrompt.trim() ? 'Connected' : 'Not connected'}
            </div>
            <div className={`flex items-center gap-2 ${connectedImageUrl ? 'text-[#9ca3af]' : 'text-[#6b7280]'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Image: {connectedImageUrl ? 'Connected' : 'Optional'}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#9ca3af] block mb-1.5">Duration (seconds)</label>
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
                className="w-full px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] focus:outline-none focus:border-[#6b7280] focus:ring-1 focus:ring-[#6b7280]/20 transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="text-xs text-[#9ca3af] block mb-1.5">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => {
                  setResolution(e.target.value);
                  data.onUpdate?.({ resolution: e.target.value });
                }}
                className="w-full px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] focus:outline-none focus:border-[#6b7280] focus:ring-1 focus:ring-[#6b7280]/20 transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4k">4K</option>
              </select>
            </div>
          </div>

          {/* Progress/Status Display */}
          {status === 'processing' && (
            <div className="space-y-2 py-2 px-3 bg-[#0a0a0a]/30 rounded-lg border border-[#374151]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#6b7280] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-[#9ca3af]">Generating...</span>
              </div>
              {node.progress_message && (
                <p className="text-xs text-[#6b7280] truncate">{node.progress_message}</p>
              )}
              {typeof node.progress === 'number' && node.progress > 0 && (
                <div className="w-full bg-[#374151] rounded-full h-1">
                  <div 
                    className="bg-[#d1d9e6] h-1 rounded-full transition-all duration-300"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {status === 'failed' && errorMessage && (
            <div className="py-2 px-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <p className="text-xs text-red-400 truncate">{errorMessage}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={!canGenerate || status === 'processing'}
            className={`w-full py-2 px-4 rounded-lg font-light text-sm transition-all duration-200 ${
              canGenerate && status !== 'processing'
                ? 'bg-[#d1d9e6] hover:bg-white text-black cursor-pointer'
                : 'bg-[#374151] text-[#6b7280] cursor-not-allowed'
            }`}
            title={!canGenerate ? 'Connect a prompt node and enter a prompt to generate video' : 'Generate video'}
          >
            {status === 'processing' ? (
              'Generating...'
            ) : status === 'failed' ? (
              'Retry Generation'
            ) : (
              'Generate Video'
            )}
          </button>

          {/* Video Display */}
          {node.video_url && !node.video_url.startsWith('gs://') && (
            <video
              src={node.video_url}
              controls
              preload="metadata"
              className="w-full rounded-lg border border-[#374151] max-h-48"
              onClick={(e) => e.stopPropagation()}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}

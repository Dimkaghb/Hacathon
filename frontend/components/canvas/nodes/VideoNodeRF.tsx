"use client";

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

export default function VideoNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  // Connected data passed from parent
  const connectedPrompt = data.connectedPrompt || '';
  const connectedImageUrl = data.connectedImageUrl || '';

  // Settings - duration only, resolution fixed to 720p
  const [duration, setDuration] = useState(node.duration || 8);

  const canGenerate = !!(connectedPrompt && connectedPrompt.trim().length > 0);

  const handleGenerate = () => {
    if (canGenerate) {
      data.onUpdate?.({ duration, resolution: '720p' });
      data.onGenerate?.();
    }
  };

  // Check if video can be extended
  const canBeExtended = !!(node.video_url && (node.veo_video_uri || node.veo_video_name));

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

      {/* Output Handle - for connecting to Extension nodes */}
      {canBeExtended && (
        <Handle
          type="source"
          position={Position.Right}
          id="video-output"
          className="rf-handle rf-handle-source"
          style={{ top: '50%' }}
        />
      )}

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">Video</h3>
        <span className="rf-badge">720p</span>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="space-y-3">
          {/* Connected Inputs Status - minimal */}
          <div className="space-y-1">
            <div className={`flex items-center gap-2 text-[10px] ${connectedPrompt?.trim() ? 'text-[#808080]' : 'text-[#3a3a3a]'}`}>
              <span className="rf-status-dot" />
              <span>Prompt {connectedPrompt?.trim() ? '' : '(required)'}</span>
            </div>
            <div className={`flex items-center gap-2 text-[10px] ${connectedImageUrl ? 'text-[#808080]' : 'text-[#3a3a3a]'}`}>
              <span className="rf-status-dot" />
              <span>Image {connectedImageUrl ? '' : '(optional)'}</span>
            </div>
          </div>

          {/* Duration Setting */}
          <div>
            <label className="rf-label">Duration</label>
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
              className="rf-input"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Progress Display */}
          {status === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-[#4a4a4a] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-[#606060]">
                  {node.progress_message || 'Generating...'}
                </span>
              </div>
              {typeof node.progress === 'number' && node.progress > 0 && (
                <div className="rf-progress">
                  <div
                    className="rf-progress-bar"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {status === 'failed' && errorMessage && (
            <div className="rf-message rf-message-error">
              {errorMessage}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={!canGenerate || status === 'processing'}
            className={`rf-button ${canGenerate && status !== 'processing' ? 'rf-button-primary' : ''}`}
          >
            {status === 'processing' ? 'Generating...' : status === 'failed' ? 'Retry' : 'Generate'}
          </button>

          {/* Video Display */}
          {node.video_url && !node.video_url.startsWith('gs://') && (
            <video
              src={node.video_url}
              controls
              preload="metadata"
              className="w-full rounded-md max-h-36"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

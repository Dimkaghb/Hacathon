"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

export default function ExtensionNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  // Connected data passed from parent
  const connectedPrompt = data.connectedPrompt || '';
  const connectedVideo = data.connectedVideo || null;

  // Extension count tracking
  const currentExtensionCount = connectedVideo?.extension_count || node.extension_count || 0;
  const remainingExtensions = 20 - currentExtensionCount;
  const canExtend = !!(
    connectedVideo?.veo_video_uri &&
    connectedPrompt &&
    connectedPrompt.trim().length > 0 &&
    remainingExtensions > 0
  );

  // Check if this extension node has completed video
  const hasCompletedVideo = !!(node.video_url && (node.veo_video_uri || node.veo_video_name));

  const handleExtend = () => {
    if (canExtend) {
      data.onExtend?.();
    }
  };

  return (
    <div className={`rf-node rf-extension-node ${selected ? 'selected' : ''}`}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="video-input"
        className="rf-handle"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        className="rf-handle"
        style={{ top: '70%' }}
      />

      {/* Output Handle - for chaining extensions */}
      {hasCompletedVideo && (
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
        <h3 className="rf-node-title">Extend</h3>
        <span className="rf-badge">{currentExtensionCount}/20</span>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="space-y-3">
          {/* Connected Inputs Status */}
          <div className="space-y-1">
            <div className={`flex items-center gap-2 text-[10px] ${connectedVideo?.video_url ? 'text-[#808080]' : 'text-[#3a3a3a]'}`}>
              <span className="rf-status-dot" />
              <span>Video {connectedVideo?.video_url ? '' : '(required)'}</span>
            </div>
            <div className={`flex items-center gap-2 text-[10px] ${connectedPrompt?.trim() ? 'text-[#808080]' : 'text-[#3a3a3a]'}`}>
              <span className="rf-status-dot" />
              <span>Prompt {connectedPrompt?.trim() ? '' : '(required)'}</span>
            </div>
          </div>

          {/* Resolution Notice */}
          <div className="text-[9px] text-[#4a4a4a]">
            Resolution locked at 720p for extensions
          </div>

          {/* Extension Limit Warning */}
          {remainingExtensions <= 5 && remainingExtensions > 0 && (
            <div className="rf-message rf-message-warning">
              {remainingExtensions} extension{remainingExtensions !== 1 ? 's' : ''} left
            </div>
          )}

          {remainingExtensions <= 0 && connectedVideo && (
            <div className="rf-message rf-message-error">
              Max extensions reached
            </div>
          )}

          {/* Progress Display */}
          {status === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-[#4a4a4a] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-[#606060]">
                  {node.progress_message || 'Extending...'}
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

          {/* Extend Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExtend();
            }}
            disabled={!canExtend || status === 'processing'}
            className={`rf-button ${canExtend && status !== 'processing' ? 'rf-button-primary' : ''}`}
          >
            {status === 'processing' ? 'Extending...' : status === 'failed' ? 'Retry' : 'Extend'}
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

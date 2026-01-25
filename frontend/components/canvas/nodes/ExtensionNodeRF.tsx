"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export default function ExtensionNodeRF({ data, selected }: NodeProps) {
  // Access backend node data
  const node = data.data || {};
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

  // Check if this extension node has completed video (can be extended further)
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
        <h3 className="rf-node-title">Extension</h3>
        {/* Extension count badge */}
        <span className="text-xs px-2 py-0.5 bg-[#374151] rounded text-[#9ca3af]">
          {currentExtensionCount > 0 ? `${currentExtensionCount}/20` : '0/20'}
        </span>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="space-y-3">
          {/* Connected Inputs Status */}
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-2 ${connectedVideo?.video_url ? 'text-[#22c55e]' : 'text-[#6b7280]'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Video: {connectedVideo?.video_url ? 'Connected' : 'Not connected'}
            </div>
            <div className={`flex items-center gap-2 ${connectedPrompt && connectedPrompt.trim() ? 'text-[#22c55e]' : 'text-[#6b7280]'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Prompt: {connectedPrompt && connectedPrompt.trim() ? 'Connected' : 'Not connected'}
            </div>
          </div>

          {/* Resolution Notice */}
          <div className="text-xs text-[#6b7280] bg-[#0a0a0a]/30 px-3 py-2 rounded-lg border border-[#374151]">
            Resolution: 720p (locked for extensions)
          </div>

          {/* Extension Limit Warning */}
          {remainingExtensions <= 5 && remainingExtensions > 0 && (
            <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/30">
              {remainingExtensions} extension{remainingExtensions !== 1 ? 's' : ''} remaining
            </div>
          )}

          {remainingExtensions <= 0 && connectedVideo && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
              Maximum 20 extensions reached
            </div>
          )}

          {/* Progress/Status Display */}
          {status === 'processing' && (
            <div className="space-y-2 py-2 px-3 bg-[#0a0a0a]/30 rounded-lg border border-[#374151]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#6b7280] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-[#9ca3af]">Extending video...</span>
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

          {/* Extend Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExtend();
            }}
            disabled={!canExtend || status === 'processing'}
            className={`w-full py-2 px-4 rounded-lg font-light text-sm transition-all duration-200 ${
              canExtend && status !== 'processing'
                ? 'bg-[#d1d9e6] hover:bg-white text-black cursor-pointer'
                : 'bg-[#374151] text-[#6b7280] cursor-not-allowed'
            }`}
            title={
              !connectedVideo?.veo_video_uri 
                ? 'Connect a generated video first' 
                : !connectedPrompt?.trim() 
                  ? 'Connect a prompt node'
                  : remainingExtensions <= 0
                    ? 'Maximum extensions reached'
                    : 'Extend video'
            }
          >
            {status === 'processing' ? (
              'Extending...'
            ) : status === 'failed' ? (
              'Retry Extension'
            ) : (
              'Extend Video'
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

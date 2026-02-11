"use client";

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';
import { CreditCostBadge } from '@/components/ui/CreditCostBadge';
import { CREDIT_COSTS } from '@/lib/types/subscription';

export default function VideoNodeRF({ data, selected }: CustomNodeProps) {
  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  // Connected data passed from parent
  const connectedPrompt = data.connectedPrompt || '';
  const connectedImageUrl = data.connectedImageUrl || '';
  const connectedCharacter = data.connectedCharacter || null;
  const connectedProduct = data.connectedProduct || null;
  const connectedSetting = data.connectedSetting || null;

  // Settings
  const [duration, setDuration] = useState(node.duration || 8);
  const [useFastModel, setUseFastModel] = useState(node.use_fast_model || false);

  const canGenerate = !!(connectedPrompt && connectedPrompt.trim().length > 0);
  const creditCost = useFastModel ? CREDIT_COSTS.video_generation_fast : CREDIT_COSTS.video_generation_standard;

  const handleGenerate = () => {
    if (canGenerate) {
      data.onUpdate?.({ duration, resolution: '720p', use_fast_model: useFastModel });
      data.onGenerate?.();
    }
  };

  // Check if video can be extended (has completed video with Veo URI)
  const hasVideo = !!node.video_url;
  const canBeExtended = !!(node.video_url && (node.veo_video_uri || node.veo_video_name));

  return (
    <div className={`rf-node rf-video-node ${selected ? 'selected' : ''}`}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        className="rf-handle"
        style={{ top: '15%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="rf-handle"
        style={{ top: '35%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        className="rf-handle"
        style={{ top: '55%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="product-input"
        className="rf-handle"
        style={{ top: '75%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="setting-input"
        className="rf-handle"
        style={{ top: '95%' }}
      />

      {/* Output Handle - always visible for workflow setup, styled based on video availability */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        className={`rf-handle ${hasVideo ? 'rf-handle-source' : ''}`}
        style={{ 
          top: '50%',
          background: hasVideo ? '#22c55e' : '#374151',
          opacity: hasVideo ? 1 : 0.5
        }}
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">Video</h3>
        <span className="rf-badge">720p</span>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        {/* Connected Inputs Status */}
        <div className="space-y-1 mb-3">
          <div className={`flex items-center gap-1.5 text-[10px] ${connectedPrompt?.trim() ? 'text-[#22c55e]' : 'text-[#3a3a3a]'}`}>
            <span className="rf-status-dot" style={{ background: connectedPrompt?.trim() ? '#22c55e' : '#374151' }} />
            <span>Prompt{connectedPrompt?.trim() ? ' ✓' : ' (required)'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] ${connectedImageUrl ? 'text-[#22c55e]' : 'text-[#3a3a3a]'}`}>
            <span className="rf-status-dot" style={{ background: connectedImageUrl ? '#22c55e' : '#374151' }} />
            <span>Image{connectedImageUrl ? ' ✓' : ' (optional)'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] ${connectedCharacter ? 'text-[#22c55e]' : 'text-[#3a3a3a]'}`}>
            <span className="rf-status-dot" style={{ background: connectedCharacter ? '#22c55e' : '#374151' }} />
            <span>Character{connectedCharacter ? ' ✓' : ''}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] ${connectedProduct ? 'text-[#22c55e]' : 'text-[#3a3a3a]'}`}>
            <span className="rf-status-dot" style={{ background: connectedProduct ? '#22c55e' : '#374151' }} />
            <span>Product{connectedProduct ? ' ✓' : ''}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] ${connectedSetting ? 'text-[#22c55e]' : 'text-[#3a3a3a]'}`}>
            <span className="rf-status-dot" style={{ background: connectedSetting ? '#22c55e' : '#374151' }} />
            <span>Setting{connectedSetting ? ' ✓' : ''}</span>
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-3">
          <label className="rf-label">Model</label>
          <div
            className="flex rounded-md overflow-hidden border border-[#2a2a2a]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setUseFastModel(false);
                data.onUpdate?.({ use_fast_model: false });
              }}
              className={`flex-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                !useFastModel
                  ? 'bg-[#2a2a2a] text-white'
                  : 'bg-transparent text-[#606060] hover:text-[#808080]'
              }`}
            >
              Veo 3.1
            </button>
            <button
              onClick={() => {
                setUseFastModel(true);
                data.onUpdate?.({ use_fast_model: true });
              }}
              className={`flex-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                useFastModel
                  ? 'bg-[#2a2a2a] text-white'
                  : 'bg-transparent text-[#606060] hover:text-[#808080]'
              }`}
            >
              Veo 3.1 Fast
            </button>
          </div>
        </div>

        {/* Duration Setting */}
        <div className="mb-3">
          <label className="rf-label">Duration (s)</label>
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
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 border-2 border-[#3a3a3a] border-t-[#808080] rounded-full animate-spin" />
              <span className="text-[10px] text-[#606060]">
                {node.progress_message || 'Generating...'}
              </span>
            </div>
            {typeof node.progress === 'number' && node.progress > 0 && (
              <div className="rf-progress">
                <div className="rf-progress-bar" style={{ width: `${node.progress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {status === 'failed' && errorMessage && (
          <div className="rf-message rf-message-error mb-3">{errorMessage}</div>
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
          <span className="flex items-center justify-center gap-1.5">
            {status === 'processing' ? 'Generating...' : status === 'failed' ? 'Retry' : 'Generate'}
            {status !== 'processing' && <CreditCostBadge credits={creditCost} />}
          </span>
        </button>

        {/* Video Display */}
        {node.video_url && !node.video_url.startsWith('gs://') && (
          <video
            src={node.video_url}
            controls
            preload="metadata"
            className="w-full rounded-md mt-3"
            style={{ maxHeight: '140px' }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

const TRANSITIONS = ['cut', 'fade', 'crossfade'] as const;
const ASPECT_RATIOS = ['16:9', '9:16', '4:5', '1:1'] as const;

const MAX_INPUTS = 6; // Number of visible input handles

interface ConnectedVideo {
  source_node_id: string;
  handle: string;
  video_url: string;
}

export default function StitchNodeRF({ data, selected }: CustomNodeProps) {
  const node = (data.data || {}) as Record<string, any>;
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  const connectedVideos: ConnectedVideo[] = (data.connectedVideos || []).filter(
    (v: ConnectedVideo) => v.video_url
  );
  const hasEnoughVideos = connectedVideos.length >= 2;
  const hasVideo = !!node.video_url;

  // Local state kept in sync with node.data via onUpdate
  const [transitions, setTransitions] = useState<string[]>(node.transitions || []);
  const [aspectRatio, setAspectRatio] = useState<string>(node.aspect_ratio || '16:9');

  // Keep local state in sync when node data changes externally
  useEffect(() => {
    setTransitions(node.transitions || []);
  }, [JSON.stringify(node.transitions)]);

  useEffect(() => {
    setAspectRatio(node.aspect_ratio || '16:9');
  }, [node.aspect_ratio]);

  const handleTransitionChange = (index: number, value: string) => {
    const newTransitions = [...transitions];
    newTransitions[index] = value;
    setTransitions(newTransitions);
    data.onUpdate?.({ transitions: newTransitions });
  };

  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value);
    data.onUpdate?.({ aspect_ratio: value });
  };

  const handleStitch = () => {
    if (hasEnoughVideos && status !== 'processing') {
      data.onStitch?.();
    }
  };

  return (
    <div className={`rf-node rf-stitch-node ${selected ? 'selected' : ''}`} style={{ minWidth: 200 }}>
      {/* Input Handles — one per slot */}
      {Array.from({ length: MAX_INPUTS }, (_, i) => (
        <Handle
          key={`video-input-${i}`}
          type="target"
          position={Position.Left}
          id={`video-input-${i}`}
          className="rf-handle"
          style={{ top: `${((i + 1) / (MAX_INPUTS + 1)) * 100}%` }}
        />
      ))}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        className={`rf-handle ${hasVideo ? 'rf-handle-source' : ''}`}
        style={{
          top: '50%',
          background: hasVideo ? '#22c55e' : '#374151',
          opacity: hasVideo ? 1 : 0.5,
        }}
      />

      {/* Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">Stitch</h3>
        <span className="rf-badge">{connectedVideos.length} clips</span>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Content */}
      <div className="rf-node-content">
        {/* Connected Videos List */}
        <div className="space-y-1 mb-3">
          {connectedVideos.length === 0 ? (
            <div className="text-[10px] text-[#606060] text-center py-2">
              Connect video nodes to left handles
            </div>
          ) : (
            connectedVideos.map((v, i) => (
              <React.Fragment key={v.source_node_id}>
                {/* Clip row */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[#808080] w-3 shrink-0">{i + 1}</span>
                  <div className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                    <span
                      className="rf-status-dot"
                      style={{ background: '#22c55e', flexShrink: 0 }}
                    />
                    <span className="truncate">Clip {i + 1} ✓</span>
                  </div>
                </div>

                {/* Transition selector between this clip and next */}
                {i < connectedVideos.length - 1 && (
                  <div className="flex items-center gap-1 pl-4 py-0.5">
                    <span className="text-[9px] text-[#505050]">↕</span>
                    <select
                      value={transitions[i] || 'cut'}
                      onChange={(e) => handleTransitionChange(i, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] bg-[#2a2a2a] text-[#909090] border border-[#3a3a3a] rounded px-1 py-0.5 cursor-pointer"
                    >
                      {TRANSITIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Warning: not enough clips */}
        {connectedVideos.length > 0 && connectedVideos.length < 2 && (
          <div className="rf-message rf-message-warning mb-2">
            Need at least 2 clips
          </div>
        )}

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#707070] shrink-0">Output:</span>
          <select
            value={aspectRatio}
            onChange={(e) => handleAspectRatioChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-[10px] bg-[#2a2a2a] text-[#909090] border border-[#3a3a3a] rounded px-1 py-0.5 cursor-pointer"
          >
            {ASPECT_RATIOS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Progress */}
        {status === 'processing' && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 border-2 border-[#3a3a3a] border-t-[#808080] rounded-full animate-spin" />
              <span className="text-[10px] text-[#606060]">
                {node.progress_message || 'Stitching...'}
              </span>
            </div>
            {typeof node.progress === 'number' && node.progress > 0 && (
              <div className="rf-progress">
                <div className="rf-progress-bar" style={{ width: `${node.progress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'failed' && errorMessage && (
          <div className="rf-message rf-message-error mb-2">{errorMessage}</div>
        )}

        {/* Stitch Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleStitch(); }}
          disabled={!hasEnoughVideos || status === 'processing'}
          className={`rf-button ${hasEnoughVideos && status !== 'processing' ? 'rf-button-primary' : ''}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            {status === 'processing'
              ? 'Stitching...'
              : status === 'failed'
              ? 'Retry Stitch'
              : 'Stitch Videos'}
            {status !== 'processing' && (
              <span className="text-[9px] text-[#606060] opacity-70">free</span>
            )}
          </span>
        </button>

        {/* Result Video */}
        {hasVideo && !node.video_url.startsWith('gs://') && (
          <div className="mt-3">
            <video
              src={node.video_url}
              controls
              preload="metadata"
              className="w-full rounded-md"
              style={{ maxHeight: '140px' }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-1 mt-1.5">
              <a
                href={node.video_url}
                download="stitched.mp4"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 py-1 text-[10px] text-center text-[#3b82f6] hover:text-[#60a5fa] border border-[#3a3a3a] rounded transition-colors"
              >
                Download
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); data.onExport?.(); }}
                className="flex-1 py-1 text-[10px] text-[#808080] hover:text-white border border-[#3a3a3a] hover:border-[#555] rounded transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

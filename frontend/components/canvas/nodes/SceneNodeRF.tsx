"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';
import { IconClock, IconMovie, IconPlayerPlay, IconRefresh } from '@tabler/icons-react';

const CATEGORY_COLORS: Record<string, string> = {
  hook: 'bg-amber-500/20 text-amber-400',
  body: 'bg-blue-500/20 text-blue-400',
  closer: 'bg-emerald-500/20 text-emerald-400',
};

export default function SceneNodeRF({ data, selected }: CustomNodeProps) {
  const node = (data.data || {}) as Record<string, any>;
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  const hasSceneType = !!node.scene_definition_id;
  const sceneName = node.scene_name || 'Scene';
  const sceneCategory = node.scene_category || '';
  const sceneTone = node.scene_tone || '';
  const sceneDuration = node.scene_duration || node.duration || 5;

  const [scriptText, setScriptText] = useState(node.script_text || node.default_script || '');

  useEffect(() => {
    setScriptText(node.script_text || node.default_script || '');
  }, [node.script_text, node.default_script]);

  const handleScriptChange = (value: string) => {
    setScriptText(value);
    data.onUpdate?.({ script_text: value });
  };

  const hasVideo = !!node.video_url;

  return (
    <div className={`rf-node rf-scene-node ${selected ? 'selected' : ''}`}>
      {/* Input Handles - Left */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        className="rf-handle"
        style={{ top: '20%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="product-input"
        className="rf-handle"
        style={{ top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="setting-input"
        className="rf-handle"
        style={{ top: '80%' }}
      />

      {/* Scene chain input - Top */}
      <Handle
        type="target"
        position={Position.Top}
        id="scene-chain-input"
        className="rf-handle"
      />

      {/* Scene chain output - Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="scene-chain-output"
        className="rf-handle rf-handle-source"
      />

      {/* Scene output - Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="scene-output"
        className={`rf-handle ${hasVideo ? 'rf-handle-source' : ''}`}
        style={{
          top: '50%',
          background: hasVideo ? '#22c55e' : '#374151',
          opacity: hasVideo ? 1 : 0.5,
        }}
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">{hasSceneType ? sceneName : 'Scene'}</h3>
        {sceneCategory && (
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${CATEGORY_COLORS[sceneCategory] || 'bg-[#2a2a2a] text-[#888]'}`}>
            {sceneCategory}
          </span>
        )}
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">&times;</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        {hasSceneType ? (
          <>
            {/* Duration & Tone info */}
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-[10px] text-[#777]">
                <IconClock size={11} />
                {sceneDuration}s
              </span>
              {sceneTone && (
                <span className="text-[10px] text-[#555]">
                  {sceneTone}
                </span>
              )}
            </div>

            {/* Script Editor */}
            <label className="rf-label">Script</label>
            <textarea
              value={scriptText}
              onChange={(e) => handleScriptChange(e.target.value)}
              placeholder="Write your script..."
              className="rf-textarea"
              style={{ minHeight: '70px' }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[9px] text-[#4a4a4a]">{scriptText.length} chars</span>
            </div>

            {/* Progress */}
            {status === 'processing' && (
              <div className="mt-2 mb-2">
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

            {/* Error */}
            {status === 'failed' && errorMessage && (
              <div className="rf-message rf-message-error mt-2 mb-2">{errorMessage}</div>
            )}

            {/* Generate Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onGenerateScene?.();
              }}
              disabled={status === 'processing'}
              className={`rf-button mt-2 ${status !== 'processing' ? 'rf-button-primary' : ''}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {status === 'processing' ? (
                  'Generating...'
                ) : status === 'completed' && hasVideo ? (
                  <>
                    <IconRefresh size={12} />
                    Regenerate
                  </>
                ) : (
                  <>
                    <IconPlayerPlay size={12} />
                    Generate Scene
                  </>
                )}
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

            {/* Change scene type */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSceneGallery?.();
              }}
              className="mt-2 w-full text-[9px] text-[#555] hover:text-[#999] transition-colors py-1"
            >
              Change scene type
            </button>
          </>
        ) : (
          /* No scene type selected */
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <IconMovie size={28} className="text-[#3a3a3a]" />
            <span className="text-[11px] text-[#666]">No scene type selected</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSceneGallery?.();
              }}
              className="rf-button rf-button-primary"
            >
              <span className="flex items-center gap-1.5">
                <IconMovie size={12} />
                Choose Scene Type
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

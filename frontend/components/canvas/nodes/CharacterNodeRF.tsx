"use client";

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';
import CharacterLibraryPanel from '../CharacterLibraryPanel';
import { CharacterLibraryItem, WardrobePresetItem } from '@/lib/api';

export default function CharacterNodeRF({ data, selected }: CustomNodeProps) {
  const node = (data.data || {}) as Record<string, any>;
  const [panelOpen, setPanelOpen] = useState(false);

  const name = node.name || 'No Character';
  const imageUrl = node.image_url || null;
  const wardrobeName = node.wardrobe_name || null;

  const handleSelect = (char: CharacterLibraryItem, wardrobe?: WardrobePresetItem) => {
    const imgUrl = char.source_image_url || (char.source_images[0]?.url ?? null);
    data.onUpdate?.({
      character_id: char.id,
      name: char.name,
      image_url: imgUrl,
      wardrobe_preset_id: wardrobe?.id || null,
      wardrobe_name: wardrobe?.name || null,
    });
    setPanelOpen(false);
  };

  return (
    <div className={`rf-node rf-character-node ${selected ? 'selected' : ''}`}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="character-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Character</h3>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        {imageUrl ? (
          <div className="flex items-center gap-2 mb-2">
            <img
              src={imageUrl}
              alt={name}
              className="w-10 h-10 rounded-full object-cover border border-[#333]"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-white truncate">{name}</span>
              {wardrobeName && (
                <span className="text-[9px] text-[#888]">{wardrobeName}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3">
            <span className="text-[10px] text-[#666]">No character selected</span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setPanelOpen(true); }}
          className="rf-button mt-1"
        >
          {node.character_id ? 'Change' : 'Select Character'}
        </button>

        {node.character_id && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[9px] text-[#888]">Connected</span>
          </div>
        )}
      </div>

      {/* Character Library Panel */}
      <CharacterLibraryPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSelect={handleSelect}
        selectedCharacterId={node.character_id}
      />
    </div>
  );
}

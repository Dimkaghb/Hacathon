"use client";

import React, { useState, useEffect } from 'react';
import { characterLibraryApi, CharacterLibraryItem, WardrobePresetItem } from '@/lib/api';
import { IconX, IconUser, IconHanger, IconCheck } from '@tabler/icons-react';

interface CharacterLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (character: CharacterLibraryItem, wardrobe?: WardrobePresetItem) => void;
  selectedCharacterId?: string;
}

export default function CharacterLibraryPanel({
  open,
  onClose,
  onSelect,
  selectedCharacterId,
}: CharacterLibraryPanelProps) {
  const [characters, setCharacters] = useState<CharacterLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchCharacters();
    }
  }, [open]);

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const data = await characterLibraryApi.list();
      setCharacters(data);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const getImageUrl = (char: CharacterLibraryItem) => {
    if (char.source_image_url) return char.source_image_url;
    if (char.source_images.length > 0) return char.source_images[0].url || null;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-80 h-full bg-[#141414] border-l border-[#2a2a2a] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-medium text-white">Character Library</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-[11px] text-[#666]">Loading...</span>
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <IconUser size={24} className="text-[#4a4a4a]" />
              <span className="text-[11px] text-[#666]">No characters yet</span>
              <span className="text-[10px] text-[#555]">Create one from the Character API</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {characters.map((char) => {
                const imgUrl = getImageUrl(char);
                const isSelected = char.id === selectedCharacterId;
                const isExpanded = expandedId === char.id;

                return (
                  <div key={char.id} className="flex flex-col">
                    {/* Character Row */}
                    <button
                      onClick={() => {
                        if (char.wardrobe_presets.length > 0) {
                          setExpandedId(isExpanded ? null : char.id);
                        } else {
                          onSelect(char);
                        }
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all text-left w-full ${
                        isSelected
                          ? 'bg-[#2a2a2a] border border-[#4a4a4a]'
                          : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a]'
                      }`}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={char.name || 'Character'}
                          className="w-9 h-9 rounded-full object-cover border border-[#333] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                          <IconUser size={14} className="text-[#666]" />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-white truncate">
                          {char.name || 'Unnamed'}
                        </span>
                        {char.wardrobe_presets.length > 0 && (
                          <span className="text-[9px] text-[#666]">
                            {char.wardrobe_presets.length} wardrobe{char.wardrobe_presets.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <IconCheck size={14} className="text-green-500 flex-shrink-0" />
                      )}
                    </button>

                    {/* Wardrobe Presets (expanded) */}
                    {isExpanded && char.wardrobe_presets.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1">
                        {/* Select without wardrobe */}
                        <button
                          onClick={() => onSelect(char)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded text-left hover:bg-[#1e1e1e] transition-colors"
                        >
                          <IconUser size={12} className="text-[#666]" />
                          <span className="text-[10px] text-[#999]">Default (no wardrobe)</span>
                        </button>

                        {char.wardrobe_presets.map((wp) => (
                          <button
                            key={wp.id}
                            onClick={() => onSelect(char, wp)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-left hover:bg-[#1e1e1e] transition-colors"
                          >
                            <IconHanger size={12} className="text-[#666]" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-[#ccc] truncate">{wp.name}</span>
                              {wp.description && (
                                <span className="text-[9px] text-[#555] truncate">{wp.description}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { sceneDefinitionsApi, SceneDefinitionItem } from '@/lib/api';
import { IconX, IconMovie, IconSearch, IconClock, IconPlus } from '@tabler/icons-react';

interface SceneGalleryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sceneDefinition: SceneDefinitionItem | null) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'hook', label: 'Hooks' },
  { key: 'body', label: 'Body' },
  { key: 'closer', label: 'Closers' },
];

const CATEGORY_COLORS: Record<string, string> = {
  hook: 'bg-amber-500/20 text-amber-400',
  body: 'bg-blue-500/20 text-blue-400',
  closer: 'bg-emerald-500/20 text-emerald-400',
};

export default function SceneGalleryPanel({
  open,
  onClose,
  onSelect,
}: SceneGalleryPanelProps) {
  const [scenes, setScenes] = useState<SceneDefinitionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchScenes();
    }
  }, [open]);

  const fetchScenes = async () => {
    setLoading(true);
    try {
      const data = await sceneDefinitionsApi.list();
      setScenes(data);
    } catch (err) {
      console.error('Failed to load scene definitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenes = useMemo(() => {
    let result = scenes;
    if (activeCategory !== 'all') {
      result = result.filter(s => s.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.tone || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [scenes, activeCategory, searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-96 h-full bg-[#141414] border-l border-[#2a2a2a] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <IconMovie size={16} className="text-[#808080]" />
            <h2 className="text-sm font-medium text-white">Scene Gallery</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scenes..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-3 pt-3 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-white text-black'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-[11px] text-[#666]">Loading...</span>
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <IconMovie size={24} className="text-[#4a4a4a]" />
              <span className="text-[11px] text-[#666]">No scenes found</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredScenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => onSelect(scene)}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all text-left w-full group"
                >
                  {/* Top row: name + badges */}
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[11px] font-medium text-white truncate flex-1">
                      {scene.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[scene.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                      {scene.category}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-[#666]">
                      <IconClock size={10} />
                      {scene.duration}s
                    </span>
                  </div>

                  {/* Description */}
                  {scene.description && (
                    <p className="text-[10px] text-[#777] leading-relaxed line-clamp-2">
                      {scene.description}
                    </p>
                  )}

                  {/* Script preview */}
                  {scene.default_script && (
                    <div className="mt-0.5 px-2 py-1.5 bg-[#111] rounded border border-[#222] w-full">
                      <p className="text-[9px] text-[#999] italic line-clamp-2">
                        &ldquo;{scene.default_script}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Tone */}
                  {scene.tone && (
                    <span className="text-[9px] text-[#555]">
                      Tone: {scene.tone}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom Scene option */}
          <button
            onClick={() => onSelect(null)}
            className="mt-3 flex items-center justify-center gap-2 w-full p-3 rounded-lg border border-dashed border-[#333] hover:border-[#555] text-[#666] hover:text-white transition-colors"
          >
            <IconPlus size={14} />
            <span className="text-[11px] font-medium">Custom Scene (blank)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

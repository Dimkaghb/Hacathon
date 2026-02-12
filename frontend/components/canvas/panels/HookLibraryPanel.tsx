"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { hooksApi, HookItem } from '@/lib/api';
import { IconX, IconSparkles, IconSearch, IconFlame, IconLoader2 } from '@tabler/icons-react';

interface HookLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hookText: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'curiosity', label: 'Curiosity' },
  { key: 'controversy', label: 'Controversy' },
  { key: 'social-proof', label: 'Social Proof' },
  { key: 'pov', label: 'POV' },
  { key: 'relatable', label: 'Relatable' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'challenge', label: 'Challenge' },
];

const CATEGORY_COLORS: Record<string, string> = {
  curiosity: 'bg-purple-500/20 text-purple-400',
  controversy: 'bg-red-500/20 text-red-400',
  'social-proof': 'bg-blue-500/20 text-blue-400',
  pov: 'bg-amber-500/20 text-amber-400',
  relatable: 'bg-pink-500/20 text-pink-400',
  urgency: 'bg-orange-500/20 text-orange-400',
  challenge: 'bg-emerald-500/20 text-emerald-400',
};

export default function HookLibraryPanel({
  open,
  onClose,
  onSelect,
}: HookLibraryPanelProps) {
  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Generate state
  const [productName, setProductName] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<Array<{ category: string; template_text: string; example_filled: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchHooks();
    }
  }, [open]);

  const fetchHooks = async () => {
    setLoading(true);
    try {
      const data = await hooksApi.list();
      setHooks(data);
    } catch (err) {
      console.error('Failed to load hooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHooks = useMemo(() => {
    let result = hooks;
    if (activeCategory !== 'all') {
      result = result.filter(h => h.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(h =>
        h.template_text.toLowerCase().includes(q) ||
        (h.example_filled || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [hooks, activeCategory, searchQuery]);

  const handleUseHook = async (hook: HookItem) => {
    try {
      await hooksApi.use(hook.id);
    } catch {
      // non-critical
    }
    onSelect(hook.example_filled || hook.template_text);
  };

  const handleGenerate = async () => {
    if (!productName.trim() || !painPoint.trim()) return;
    setGenerating(true);
    setGeneratedHooks([]);
    try {
      const result = await hooksApi.generateVariants({
        product_name: productName,
        pain_point: painPoint,
        count: 5,
      });
      setGeneratedHooks(result.hooks);
    } catch (err) {
      console.error('Failed to generate hooks:', err);
    } finally {
      setGenerating(false);
    }
  };

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
            <IconSparkles size={16} className="text-[#808080]" />
            <h2 className="text-sm font-medium text-white">Hook Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* AI Generate Section */}
        <div className="px-3 pt-3 pb-2 border-b border-[#2a2a2a]">
          <p className="text-[10px] text-[#888] font-medium uppercase tracking-wider mb-2">AI Generate</p>
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name..."
              className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
            />
            <input
              type="text"
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="Pain point..."
              className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !productName.trim() || !painPoint.trim()}
              className="w-full py-1.5 rounded-md text-[11px] font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {generating ? (
                <>
                  <IconLoader2 size={12} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IconSparkles size={12} />
                  Generate Hooks
                </>
              )}
            </button>
          </div>

          {/* Generated hooks */}
          {generatedHooks.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-[9px] text-[#666] uppercase tracking-wider">Generated</p>
              {generatedHooks.map((gh, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(gh.example_filled || gh.template_text)}
                  className="flex flex-col gap-1 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left w-full"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${CATEGORY_COLORS[gh.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                      {gh.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#ccc] leading-relaxed">
                    {gh.example_filled || gh.template_text}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hooks..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 px-3 pt-3 pb-2">
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
          ) : filteredHooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <IconSparkles size={24} className="text-[#4a4a4a]" />
              <span className="text-[11px] text-[#666]">No hooks found</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredHooks.map((hook) => (
                <button
                  key={hook.id}
                  onClick={() => handleUseHook(hook)}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all text-left w-full group"
                >
                  {/* Top row: category badge + usage */}
                  <div className="flex items-center gap-2 w-full">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[hook.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                      {hook.category}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-[#666] ml-auto">
                      <IconFlame size={10} />
                      {hook.usage_count}
                    </span>
                  </div>

                  {/* Template text */}
                  <p className="text-[11px] text-white leading-relaxed">
                    {hook.template_text}
                  </p>

                  {/* Example */}
                  {hook.example_filled && (
                    <div className="mt-0.5 px-2 py-1.5 bg-[#111] rounded border border-[#222] w-full">
                      <p className="text-[9px] text-[#999] italic line-clamp-2">
                        &ldquo;{hook.example_filled}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Use button on hover */}
                  <span className="text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to use as script
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

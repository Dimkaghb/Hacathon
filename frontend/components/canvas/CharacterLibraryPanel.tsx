"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { characterLibraryApi, filesApi, CharacterLibraryItem, WardrobePresetItem } from '@/lib/api';
import {
  IconX, IconUser, IconHanger, IconCheck, IconPlus, IconBrain,
  IconLoader2, IconUpload, IconAlertCircle,
} from '@tabler/icons-react';

interface CharacterLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (character: CharacterLibraryItem, wardrobe?: WardrobePresetItem) => void;
  selectedCharacterId?: string;
}

type AnalyzeState = 'idle' | 'analyzing' | 'done' | 'error';

export default function CharacterLibraryPanel({
  open,
  onClose,
  onSelect,
  selectedCharacterId,
}: CharacterLibraryPanelProps) {
  const [characters, setCharacters] = useState<CharacterLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-character analyze state
  const [analyzeStates, setAnalyzeStates] = useState<Record<string, AnalyzeState>>({});

  useEffect(() => {
    if (open) {
      fetchCharacters();
    } else {
      // Reset create form when panel closes
      setCreating(false);
      setNewName('');
      setNewImageUrl('');
      setCreateError(null);
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

  const getImageUrl = (char: CharacterLibraryItem) => {
    if (char.source_image_url) return char.source_image_url;
    if (char.source_images.length > 0) return char.source_images[0].url || null;
    return null;
  };

  // ── Upload image file → get GCS URL ──────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setCreateError(null);
    try {
      const result = await filesApi.uploadDirect(file);
      setNewImageUrl(result.url);
    } catch (err: any) {
      setCreateError('Image upload failed. Paste a URL instead.');
    } finally {
      setUploading(false);
    }
  };

  // ── Create character + auto-analyze ──────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('Name is required.');
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const char = await characterLibraryApi.create({
        name: newName.trim(),
        source_images: newImageUrl
          ? [{ url: newImageUrl, angle: 'front', is_primary: true }]
          : [],
      });

      // If image provided, trigger face analysis and track state
      if (newImageUrl) {
        setAnalyzeStates((s) => ({ ...s, [char.id]: 'analyzing' }));
        try {
          await characterLibraryApi.analyzeFace(char.id);
          // Poll until complete
          pollAnalyze(char.id);
        } catch {
          setAnalyzeStates((s) => ({ ...s, [char.id]: 'error' }));
        }
      }

      setNewName('');
      setNewImageUrl('');
      setCreating(false);
      await fetchCharacters();
    } catch (err: any) {
      setCreateError(err?.data?.detail || 'Failed to create character.');
    } finally {
      setSaving(false);
    }
  };

  // ── Manual analyze trigger ────────────────────────────────────────────────
  const handleAnalyze = async (char: CharacterLibraryItem) => {
    setAnalyzeStates((s) => ({ ...s, [char.id]: 'analyzing' }));
    try {
      await characterLibraryApi.analyzeFace(char.id);
      pollAnalyze(char.id);
    } catch {
      setAnalyzeStates((s) => ({ ...s, [char.id]: 'error' }));
    }
  };

  // Poll character until embedding_id appears (max 60s)
  const pollAnalyze = (charId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const updated = await characterLibraryApi.get(charId);
        if (updated.embedding_id) {
          setAnalyzeStates((s) => ({ ...s, [charId]: 'done' }));
          setCharacters((prev) => prev.map((c) => (c.id === charId ? updated : c)));
          clearInterval(interval);
        }
      } catch { /* ignore */ }
      if (attempts >= 30) {
        setAnalyzeStates((s) => ({ ...s, [charId]: 'error' }));
        clearInterval(interval);
      }
    }, 2000);
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-80 h-full bg-[#141414] border-l border-[#2a2a2a] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] flex-shrink-0">
          <h2 className="text-sm font-medium text-white">Character Library</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCreating((v) => !v); setCreateError(null); }}
              className="p-1.5 rounded hover:bg-[#2a2a2a] text-[#808080] hover:text-white transition-colors"
              title="Create character"
            >
              <IconPlus size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Create form */}
        {creating && (
          <div className="border-b border-[#2a2a2a] px-3 py-3 flex-shrink-0 bg-[#1a1a1a]">
            <p className="text-[10px] text-[#666] mb-2 uppercase tracking-wider">New Character</p>

            <input
              type="text"
              placeholder="Character name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[11px] text-white placeholder-[#555] mb-2 focus:outline-none focus:border-[#555]"
            />

            {/* Image URL or upload */}
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="Image URL (paste or upload)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#555]"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2 rounded border border-[#333] hover:border-[#555] text-[#888] hover:text-white transition-colors disabled:opacity-50"
                title="Upload image"
              >
                {uploading ? <IconLoader2 size={13} className="animate-spin" /> : <IconUpload size={13} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </div>

            {newImageUrl && (
              <img
                src={newImageUrl}
                alt="Preview"
                className="w-full h-24 object-cover rounded border border-[#333] mb-2"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}

            {createError && (
              <p className="text-[10px] text-red-400 mb-2 flex items-center gap-1">
                <IconAlertCircle size={11} /> {createError}
              </p>
            )}

            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={saving || uploading}
                className="flex-1 bg-white text-black text-[11px] font-medium py-1.5 rounded hover:bg-[#e0e0e0] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setCreating(false); setCreateError(null); setNewName(''); setNewImageUrl(''); }}
                className="px-3 text-[11px] text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Character list */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <IconLoader2 size={14} className="animate-spin text-[#666]" />
              <span className="text-[11px] text-[#666]">Loading...</span>
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <IconUser size={24} className="text-[#4a4a4a]" />
              <span className="text-[11px] text-[#666]">No characters yet</span>
              <button
                onClick={() => setCreating(true)}
                className="text-[10px] text-[#888] underline underline-offset-2 hover:text-white transition-colors"
              >
                Create your first character
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {characters.map((char) => {
                const imgUrl = getImageUrl(char);
                const isSelected = char.id === selectedCharacterId;
                const isExpanded = expandedId === char.id;
                const hasEmbedding = !!char.embedding_id;
                const analyzeState = analyzeStates[char.id];
                const isAnalyzing = analyzeState === 'analyzing';

                return (
                  <div key={char.id} className="flex flex-col">
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
                      {/* Avatar */}
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

                      {/* Info */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-white truncate">
                          {char.name || 'Unnamed'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {/* Embedding status badge */}
                          {isAnalyzing ? (
                            <span className="flex items-center gap-1 text-[9px] text-yellow-400">
                              <IconLoader2 size={9} className="animate-spin" /> Analyzing...
                            </span>
                          ) : analyzeState === 'done' || hasEmbedding ? (
                            <span className="flex items-center gap-1 text-[9px] text-green-400">
                              <IconBrain size={9} /> Embedded
                            </span>
                          ) : analyzeState === 'error' ? (
                            <span className="flex items-center gap-1 text-[9px] text-red-400">
                              <IconAlertCircle size={9} /> Analyze failed
                            </span>
                          ) : (
                            <span className="text-[9px] text-[#555]">Not analyzed</span>
                          )}

                          {char.wardrobe_presets.length > 0 && (
                            <span className="text-[9px] text-[#555]">
                              · {char.wardrobe_presets.length} outfit{char.wardrobe_presets.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && <IconCheck size={14} className="text-green-500 flex-shrink-0" />}
                    </button>

                    {/* Analyze button (only if image exists and no embedding yet) */}
                    {!hasEmbedding && !isAnalyzing && imgUrl && analyzeState !== 'done' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnalyze(char); }}
                        className="ml-12 mt-1 text-[9px] text-[#888] hover:text-white underline underline-offset-2 transition-colors text-left"
                      >
                        Run face analysis →
                      </button>
                    )}

                    {/* Wardrobe Presets */}
                    {isExpanded && char.wardrobe_presets.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1">
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
    </div>,
    document.body
  );
}

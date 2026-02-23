"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { aiApi, characterLibraryApi, CharacterLibraryItem } from "@/lib/api";
import {
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconUser,
  IconPackage,
  IconMapPin,
  IconLayoutBoard,
  IconLoader2,
} from "@tabler/icons-react";

interface SceneBlock {
  id: string;
  category: "hook" | "body" | "closer";
  script_text: string;
  duration: number;
  scene_name: string;
}

interface ScriptEditorProps {
  projectId: string;
  onSwitchToCanvas: () => void;
  onGraphCreated: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hook: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  body: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  closer: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

let blockIdCounter = 0;
function newBlockId() {
  return `block-${++blockIdCounter}-${Date.now()}`;
}

export default function ScriptEditor({ projectId, onSwitchToCanvas, onGraphCreated }: ScriptEditorProps) {
  const [scenes, setScenes] = useState<SceneBlock[]>([
    { id: newBlockId(), category: "hook", script_text: "", duration: 5, scene_name: "Hook" },
  ]);

  // Context state
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterLibraryItem[]>([]);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);

  const [productData, setProductData] = useState<{ name: string; benefits: string } | null>(null);
  const [showProductPopover, setShowProductPopover] = useState(false);
  const [productName, setProductName] = useState("");
  const [productBenefits, setProductBenefits] = useState("");

  const [settingData, setSettingData] = useState<{ location: string; lighting: string } | null>(null);
  const [showSettingPopover, setShowSettingPopover] = useState(false);
  const [settingLocation, setSettingLocation] = useState("");
  const [settingLighting, setSettingLighting] = useState("");

  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for outside-click detection
  const characterRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const settingRef = useRef<HTMLDivElement>(null);

  const closeAllPopovers = useCallback(() => {
    setShowCharacterPicker(false);
    setShowProductPopover(false);
    setShowSettingPopover(false);
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        characterRef.current && !characterRef.current.contains(target) &&
        productRef.current && !productRef.current.contains(target) &&
        settingRef.current && !settingRef.current.contains(target)
      ) {
        closeAllPopovers();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeAllPopovers]);

  // Load characters when picker opens
  const handleOpenCharacterPicker = useCallback(async () => {
    const opening = !showCharacterPicker;
    closeAllPopovers();
    if (opening) {
      try {
        const list = await characterLibraryApi.list();
        setCharacters(list);
      } catch {
        // ignore
      }
      setShowCharacterPicker(true);
    }
  }, [showCharacterPicker, closeAllPopovers]);

  const handleToggleProduct = useCallback(() => {
    const opening = !showProductPopover;
    closeAllPopovers();
    if (opening) setShowProductPopover(true);
  }, [showProductPopover, closeAllPopovers]);

  const handleToggleSetting = useCallback(() => {
    const opening = !showSettingPopover;
    closeAllPopovers();
    if (opening) setShowSettingPopover(true);
  }, [showSettingPopover, closeAllPopovers]);

  const updateScene = (id: string, updates: Partial<SceneBlock>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addScene = () => {
    const lastCategory = scenes[scenes.length - 1]?.category;
    const newCategory: SceneBlock["category"] = lastCategory === "closer" ? "closer" : "body";
    setScenes((prev) => [
      ...prev,
      { id: newBlockId(), category: newCategory, script_text: "", duration: 5, scene_name: "" },
    ]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((s) => s.id !== id));
  };

  const moveScene = (id: string, direction: "up" | "down") => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const handleConvertToGraph = async () => {
    const nonEmpty = scenes.filter((s) => s.script_text.trim());
    if (nonEmpty.length === 0) {
      setError("Write at least one scene before generating.");
      return;
    }

    setConverting(true);
    setError(null);

    try {
      await aiApi.scriptToGraph({
        project_id: projectId,
        scenes: nonEmpty.map((s) => ({
          category: s.category,
          script_text: s.script_text,
          duration: s.duration,
          scene_name: s.scene_name || undefined,
        })),
        character_id: characterId || undefined,
        product_data: productData ? { name: productData.name, benefits: productData.benefits } : undefined,
        setting_data: settingData ? { location: settingData.location, lighting: settingData.lighting } : undefined,
      });
      onGraphCreated();
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || "Failed to convert script to graph.");
    } finally {
      setConverting(false);
    }
  };

  const handleSaveProduct = () => {
    if (productName.trim()) {
      setProductData({ name: productName.trim(), benefits: productBenefits.trim() });
    } else {
      setProductData(null);
    }
    setShowProductPopover(false);
  };

  const handleSaveSetting = () => {
    if (settingLocation.trim()) {
      setSettingData({ location: settingLocation.trim(), lighting: settingLighting.trim() });
    } else {
      setSettingData(null);
    }
    setShowSettingPopover(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] px-4 py-3 shrink-0">
        {/* Character selector */}
        <div className="relative" ref={characterRef}>
          <button
            onClick={handleOpenCharacterPicker}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              characterId
                ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-[#a0a0a0] hover:border-[#3a3a3a]"
            }`}
          >
            <IconUser className="w-3.5 h-3.5" />
            {characterName || "Character"}
          </button>
          {showCharacterPicker && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setCharacterId(null);
                  setCharacterName(null);
                  setShowCharacterPicker(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#a0a0a0] hover:bg-[#2a2a2a] transition-colors"
              >
                None
              </button>
              {characters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCharacterId(c.id);
                    setCharacterName(c.name || "Unnamed");
                    setShowCharacterPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[#2a2a2a] transition-colors ${
                    c.id === characterId ? "text-purple-400" : "text-[#a0a0a0]"
                  }`}
                >
                  {c.name || "Unnamed Character"}
                </button>
              ))}
              {characters.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#606060]">No characters yet</div>
              )}
            </div>
          )}
        </div>

        {/* Product quick-fill */}
        <div className="relative" ref={productRef}>
          <button
            onClick={handleToggleProduct}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              productData
                ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-[#a0a0a0] hover:border-[#3a3a3a]"
            }`}
          >
            <IconPackage className="w-3.5 h-3.5" />
            {productData?.name || "Product"}
          </button>
          {showProductPopover && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 p-3">
              <label className="block text-xs text-[#808080] mb-1">Product Name</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. SuperSerum"
                className="w-full px-2.5 py-1.5 bg-[#0f0f0f] text-white text-xs rounded border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none mb-2"
              />
              <label className="block text-xs text-[#808080] mb-1">Key Benefits</label>
              <input
                value={productBenefits}
                onChange={(e) => setProductBenefits(e.target.value)}
                placeholder="e.g. hydrating, anti-aging"
                className="w-full px-2.5 py-1.5 bg-[#0f0f0f] text-white text-xs rounded border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none mb-2"
              />
              <button
                onClick={handleSaveProduct}
                className="w-full py-1.5 bg-white text-black rounded text-xs font-medium hover:bg-[#e0e0e0] transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Setting quick-fill */}
        <div className="relative" ref={settingRef}>
          <button
            onClick={handleToggleSetting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              settingData
                ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-[#a0a0a0] hover:border-[#3a3a3a]"
            }`}
          >
            <IconMapPin className="w-3.5 h-3.5" />
            {settingData?.location || "Setting"}
          </button>
          {showSettingPopover && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 p-3">
              <label className="block text-xs text-[#808080] mb-1">Location</label>
              <input
                value={settingLocation}
                onChange={(e) => setSettingLocation(e.target.value)}
                placeholder="e.g. modern bathroom"
                className="w-full px-2.5 py-1.5 bg-[#0f0f0f] text-white text-xs rounded border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none mb-2"
              />
              <label className="block text-xs text-[#808080] mb-1">Lighting</label>
              <input
                value={settingLighting}
                onChange={(e) => setSettingLighting(e.target.value)}
                placeholder="e.g. soft golden hour"
                className="w-full px-2.5 py-1.5 bg-[#0f0f0f] text-white text-xs rounded border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none mb-2"
              />
              <button
                onClick={handleSaveSetting}
                className="w-full py-1.5 bg-white text-black rounded text-xs font-medium hover:bg-[#e0e0e0] transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={onSwitchToCanvas}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[#2a2a2a] bg-[#1a1a1a] text-[#a0a0a0] hover:border-[#3a3a3a] hover:text-white transition-colors"
        >
          <IconLayoutBoard className="w-3.5 h-3.5" />
          Canvas Mode
        </button>
      </div>

      {/* Scene blocks list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {scenes.map((scene, idx) => {
          const colors = CATEGORY_COLORS[scene.category] || CATEGORY_COLORS.body;
          return (
            <div
              key={scene.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-center gap-2">
                <span className="text-[#606060] text-xs font-mono w-5 shrink-0">{idx + 1}</span>

                {/* Category dropdown */}
                <select
                  value={scene.category}
                  onChange={(e) =>
                    updateScene(scene.id, { category: e.target.value as SceneBlock["category"] })
                  }
                  className={`px-2 py-1 rounded text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} bg-transparent focus:outline-none cursor-pointer`}
                >
                  <option value="hook" className="bg-[#1a1a1a] text-white">Hook</option>
                  <option value="body" className="bg-[#1a1a1a] text-white">Body</option>
                  <option value="closer" className="bg-[#1a1a1a] text-white">Closer</option>
                </select>

                {/* Scene name */}
                <input
                  value={scene.scene_name}
                  onChange={(e) => updateScene(scene.id, { scene_name: e.target.value })}
                  placeholder="Scene name (optional)"
                  className="flex-1 px-2.5 py-1 bg-transparent text-white text-xs rounded border border-transparent hover:border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none placeholder-[#4a4a4a]"
                />

                {/* Duration */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={scene.duration}
                    onChange={(e) =>
                      updateScene(scene.id, { duration: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-12 px-1.5 py-1 bg-[#0f0f0f] text-white text-xs rounded border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-center"
                  />
                  <span className="text-[#606060] text-xs">s</span>
                </div>

                {/* Move / delete */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveScene(scene.id, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-[#2a2a2a] text-[#606060] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#606060] transition-colors"
                  >
                    <IconArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveScene(scene.id, "down")}
                    disabled={idx === scenes.length - 1}
                    className="p-1 rounded hover:bg-[#2a2a2a] text-[#606060] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#606060] transition-colors"
                  >
                    <IconArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeScene(scene.id)}
                    disabled={scenes.length <= 1}
                    className="p-1 rounded hover:bg-[#2a2a2a] text-[#606060] hover:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#606060] transition-colors"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Script textarea */}
              <textarea
                value={scene.script_text}
                onChange={(e) => updateScene(scene.id, { script_text: e.target.value })}
                placeholder="Write the script for this scene..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0f0f0f] text-white text-sm rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none placeholder-[#4a4a4a] resize-y min-h-[60px]"
              />

              {/* Char count */}
              <div className="flex justify-end">
                <span className="text-[#4a4a4a] text-[10px]">
                  {scene.script_text.length} chars
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Scene button */}
        <button
          onClick={addScene}
          className="w-full py-3 border-2 border-dashed border-[#2a2a2a] rounded-xl text-[#606060] text-xs font-medium hover:border-[#3a3a3a] hover:text-[#a0a0a0] transition-colors flex items-center justify-center gap-1.5"
        >
          <IconPlus className="w-3.5 h-3.5" />
          Add Scene
        </button>
      </div>

      {/* Bottom bar — pr-24 avoids overlap with the fixed Debug badge */}
      <div className="flex items-center border-t border-[#2a2a2a] px-4 pr-24 py-3 shrink-0">
        <span className="text-[#606060] text-xs">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""} &middot; ~{totalDuration}s
        </span>

        <div className="flex-1" />

        {error && (
          <span className="text-red-400 text-xs mr-3">{error}</span>
        )}

        <button
          onClick={handleConvertToGraph}
          disabled={converting}
          className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {converting && <IconLoader2 className="w-4 h-4 animate-spin" />}
          {converting ? "Generating..." : "Generate All"}
        </button>
      </div>
    </div>
  );
}

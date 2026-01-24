"use client";

import React, { useState } from "react";
import FigmaCanvas from "@/components/canvas/FigmaCanvas";
import FloatingDockDemo from "@/components/floating-dock-demo";
import type { CanvasElement } from "@/components/canvas/FigmaCanvas";

export default function MainPage() {
  const [elements, setElements] = useState<CanvasElement[]>([]);

  const handleElementsChange = (newElements: CanvasElement[]) => {
    setElements(newElements);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#1a1a1a]">
      {/* Canvas */}
      <FigmaCanvas onElementsChange={handleElementsChange} />

      {/* Floating Dock Navigation */}
      <FloatingDockDemo />

      {/* Element Count */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-800 text-sm text-gray-600 dark:text-gray-400">
        Elements: {elements.length}
      </div>
    </div>
  );
}

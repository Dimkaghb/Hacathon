"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export interface CanvasElement {
  id: string;
  type: "rectangle" | "circle" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text?: string;
  fontSize?: number;
  rotation?: number;
}

interface FigmaCanvasProps {
  onElementsChange?: (elements: CanvasElement[]) => void;
  tool?: "select" | "hand" | "rectangle" | "circle" | "text";
  onToolChange?: (tool: "select" | "hand" | "rectangle" | "circle" | "text") => void;
}

export default function FigmaCanvas({ onElementsChange, tool: externalTool, onToolChange }: FigmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalTool, setInternalTool] = useState<"select" | "hand" | "rectangle" | "circle" | "text">("select");

  const tool = externalTool ?? internalTool;
  const setTool = (newTool: "select" | "hand" | "rectangle" | "circle" | "text") => {
    setInternalTool(newTool);
    onToolChange?.(newTool);
  };
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Grid
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1 / scale;
    const gridSize = 50;
    const startX = Math.floor(-offset.x / scale / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-offset.y / scale / gridSize) * gridSize - gridSize;
    const endX = startX + (canvas.width / scale) + gridSize * 2;
    const endY = startY + (canvas.height / scale) + gridSize * 2;

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach((element) => {
      ctx.save();
      ctx.fillStyle = element.fill;

      if (element.type === "rectangle") {
        ctx.fillRect(element.x, element.y, element.width, element.height);
      } else if (element.type === "circle") {
        ctx.beginPath();
        ctx.arc(
          element.x + element.width / 2,
          element.y + element.height / 2,
          element.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (element.type === "text") {
        ctx.font = `${element.fontSize || 20}px Inter, sans-serif`;
        ctx.fillText(element.text || "Text", element.x, element.y + (element.fontSize || 20));
      }

      // Draw selection
      if (element.id === selectedId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.strokeRect(element.x - 4, element.y - 4, element.width + 8, element.height + 8);

        // Draw resize handles
        ctx.setLineDash([]);
        ctx.fillStyle = "#3b82f6";
        const handleSize = 8 / scale;
        const handles = [
          { x: element.x - handleSize / 2, y: element.y - handleSize / 2 },
          { x: element.x + element.width - handleSize / 2, y: element.y - handleSize / 2 },
          { x: element.x - handleSize / 2, y: element.y + element.height - handleSize / 2 },
          { x: element.x + element.width - handleSize / 2, y: element.y + element.height - handleSize / 2 },
        ];
        handles.forEach((handle) => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
      }

      ctx.restore();
    });

    ctx.restore();
  }, [elements, selectedId, scale, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Get mouse position in canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    return { x, y };
  };

  // Find element at position
  const findElementAt = (x: number, y: number): CanvasElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (e.button === 1 || (e.button === 0 && e.altKey) || tool === "hand") {
      // Middle click, Alt+click, or hand tool for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (tool === "select") {
      const element = findElementAt(coords.x, coords.y);
      if (element) {
        setSelectedId(element.id);
        setIsDragging(true);
        setDragOffset({ x: coords.x - element.x, y: coords.y - element.y });
      } else {
        setSelectedId(null);
      }
    } else if (tool === "rectangle" || tool === "circle" || tool === "text") {
      // Create new element
      const newElement: CanvasElement = {
        id: `element-${Date.now()}`,
        type: tool,
        x: coords.x,
        y: coords.y,
        width: tool === "text" ? 150 : 100,
        height: tool === "text" ? 30 : tool === "circle" ? 100 : 80,
        fill: getRandomColor(),
        text: tool === "text" ? "Double click to edit" : undefined,
        fontSize: tool === "text" ? 20 : undefined,
      };

      const updatedElements = [...elements, newElement];
      setElements(updatedElements);
      onElementsChange?.(updatedElements);
      setSelectedId(newElement.id);
      setTool("select");
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isDragging && selectedId) {
      const coords = getCanvasCoords(e);
      const updatedElements = elements.map((el) =>
        el.id === selectedId
          ? { ...el, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
          : el
      );
      setElements(updatedElements);
      onElementsChange?.(updatedElements);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));

    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setOffset({
        x: mouseX - (mouseX - offset.x) * (newScale / scale),
        y: mouseY - (mouseY - offset.y) * (newScale / scale),
      });
    }

    setScale(newScale);
  };

  const handleDelete = () => {
    if (selectedId) {
      const updatedElements = elements.filter((el) => el.id !== selectedId);
      setElements(updatedElements);
      onElementsChange?.(updatedElements);
      setSelectedId(null);
    }
  };

  const handleDuplicate = () => {
    if (selectedId) {
      const element = elements.find((el) => el.id === selectedId);
      if (element) {
        const newElement = {
          ...element,
          id: `element-${Date.now()}`,
          x: element.x + 20,
          y: element.y + 20,
        };
        const updatedElements = [...elements, newElement];
        setElements(updatedElements);
        onElementsChange?.(updatedElements);
        setSelectedId(newElement.id);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicate();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements]);

  return (
    <div className="relative w-full h-full">
      {/* Zoom indicator - bottom center */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-neutral-900 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-800 text-sm text-gray-600 dark:text-gray-400 font-medium">
        {Math.round(scale * 100)}%
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="cursor-crosshair"
        style={{ display: "block" }}
      />
    </div>
  );
}

function getRandomColor(): string {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

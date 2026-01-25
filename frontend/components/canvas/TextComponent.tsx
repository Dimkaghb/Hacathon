"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TextComponentProps {
  width: number;
  height: number;
  onTextChange?: (text: string) => void;
  initialText?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (deltaX: number, deltaY: number) => void;
}

export default function TextComponent({
  width,
  height,
  onTextChange,
  initialText,
  onContextMenu,
  onResize,
  onMove,
}: TextComponentProps) {
  const [text, setText] = useState(initialText || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onTextChange?.(newText);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLTextAreaElement) return; // Don't drag when clicking textarea

    setClickCount((prev) => {
      const newCount = prev + 1;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }

      if (newCount === 2) {
        // Double click detected
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        setClickCount(0);
        return 0;
      } else {
        // Wait for potential second click
        clickTimer.current = setTimeout(() => {
          setClickCount(0);
        }, 300);
        return newCount;
      }
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      onMove?.(deltaX, deltaY);
      dragStart.current = { x: e.clientX, y: e.clientY };
    } else if (isResizing && resizeHandle) {
      const deltaX = e.movementX;
      const deltaY = e.movementY;

      let newWidth = width;
      let newHeight = height;

      if (resizeHandle.includes('right')) {
        newWidth = Math.max(150, width + deltaX);
      }
      if (resizeHandle.includes('left')) {
        newWidth = Math.max(150, width - deltaX);
        if (newWidth !== width) {
          onMove?.(deltaX, 0);
        }
      }
      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(100, height + deltaY);
      }
      if (resizeHandle.includes('top')) {
        newHeight = Math.max(100, height - deltaY);
        if (newHeight !== height) {
          onMove?.(0, deltaY);
        }
      }

      if (newWidth !== width || newHeight !== height) {
        onResize?.(newWidth, newHeight);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, width, height, resizeHandle]);

  const startResize = (handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  };

  return (
    <div
      className="relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-visible shadow-lg"
      style={{ width: `${width}px`, height: `${height}px`, cursor: isDragging ? 'grabbing' : 'default' }}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleDoubleClick}
    >
      <div className="flex flex-col h-full overflow-hidden rounded-lg p-3">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter your text here..."
          className="w-full h-full px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
        />
      </div>

      {/* Resize Handles */}
      {isHovered && !isDragging && (
        <>
          {/* Corner handles */}
          <div
            onMouseDown={startResize('top-left')}
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('top-right')}
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('bottom-left')}
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('bottom-right')}
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
          />

          {/* Edge handles */}
          <div
            onMouseDown={startResize('top')}
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-ns-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('bottom')}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-ns-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('left')}
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform"
          />
          <div
            onMouseDown={startResize('right')}
            className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform"
          />
        </>
      )}

      {/* Floating Connect Button - Pops out on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, x: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const syntheticEvent = {
                ...e,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
              } as React.MouseEvent;
              onContextMenu?.(syntheticEvent);
            }}
            style={{
              right: '-50px',
              top: '37%',
              transform: 'translateY(-50%)',
            }}
            className="absolute w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-800 shadow-lg flex items-center justify-center text-white text-xl font-bold transition-colors z-10"
            title="Connect"
          >
            +
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

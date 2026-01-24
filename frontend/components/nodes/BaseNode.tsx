"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Node, NodeHandle } from '@/lib/types/node';

interface BaseNodeProps {
  node: Node;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
  children: React.ReactNode;
  inputHandles?: NodeHandle[];
  outputHandles?: NodeHandle[];
  onConnectionStart?: (handleId: string, nodeId: string) => void;
  onConnectionEnd?: (handleId: string, nodeId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

export default function BaseNode({
  node,
  selected,
  onSelect,
  onMove,
  onDelete,
  children,
  inputHandles = [],
  outputHandles = [],
  onConnectionStart,
  onConnectionEnd,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 },
}: BaseNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag when clicking on handles, buttons, or inputs
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest('.node-handle') ||
       e.target.closest('button') ||
       e.target.closest('input') ||
       e.target.closest('textarea') ||
       e.target.closest('select'))
    ) {
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);
    
    // Get the root container
    const container = nodeRef.current?.closest('[data-node-container]') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the mouse position in canvas coordinates using provided scale/offset
    const canvasX = (e.clientX - containerRect.left - canvasOffset.x) / canvasScale;
    const canvasY = (e.clientY - containerRect.top - canvasOffset.y) / canvasScale;
    
    setDragStart({
      x: canvasX - node.position_x,
      y: canvasY - node.position_y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = nodeRef.current?.closest('[data-node-container]') as HTMLElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      const canvasX = (e.clientX - containerRect.left - canvasOffset.x) / canvasScale;
      const canvasY = (e.clientY - containerRect.top - canvasOffset.y) / canvasScale;

      const newX = Math.max(0, canvasX - dragStart.x);
      const newY = Math.max(0, canvasY - dragStart.y);
      
      onMove(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, onMove, canvasScale, canvasOffset]);

  const getStatusColor = () => {
    switch (node.status) {
      case 'processing':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'completed':
        return 'border-green-500 bg-green-500/10';
      case 'failed':
        return 'border-red-500 bg-red-500/10';
      default:
        return selected ? 'border-blue-500' : 'border-gray-700';
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute bg-[#1e1e1e] rounded-lg border-2 ${getStatusColor()} shadow-xl ${
        isDragging ? 'opacity-90' : ''
      } transition-all duration-150`}
      style={{
        left: node.position_x,
        top: node.position_y,
        minWidth: '240px',
        maxWidth: '320px',
        zIndex: selected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Input Handles */}
      {inputHandles.map((handle) => (
        <div
          key={handle.id}
          className="node-handle absolute left-0 w-6 h-6 bg-blue-500 rounded-full border-2 border-[#1e1e1e] cursor-crosshair hover:bg-blue-400 hover:scale-125 transition-transform z-10 shadow-lg"
          style={{
            top: handle.position.y,
            left: -12,
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onConnectionEnd?.(handle.id, node.id);
          }}
          title="Input"
        />
      ))}

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-[#252525] rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              node.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
              node.status === 'completed' ? 'bg-green-500' :
              node.status === 'failed' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            <h3 className="text-sm font-semibold text-white capitalize">{node.type}</h3>
          </div>
          {selected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-gray-400 hover:text-red-400 text-lg leading-none transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20"
              title="Delete node"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Node Content */}
      <div className="p-4">
        {children}
      </div>

      {/* Output Handles */}
      {outputHandles.map((handle) => (
        <div
          key={handle.id}
          className="node-handle absolute right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-[#1e1e1e] cursor-crosshair hover:bg-green-400 hover:scale-125 transition-transform z-10 shadow-lg"
          style={{
            top: handle.position.y,
            right: -12,
            transform: 'translateY(-50%)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onConnectionStart?.(handle.id, node.id);
          }}
          title="Output"
        />
      ))}
    </div>
  );
}

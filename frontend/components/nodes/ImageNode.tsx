"use client";

import React, { useRef, useState } from 'react';
import { Node } from '@/lib/types/node';
import BaseNode from './BaseNode';
import { filesApi } from '@/lib/api';

interface ImageNodeProps {
  node: Node;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
  onUpdate: (data: Record<string, any>) => void;
  onConnectionStart?: (handleId: string, nodeId: string) => void;
  onConnectionEnd?: (handleId: string, nodeId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

export default function ImageNode({
  node,
  selected,
  onSelect,
  onMove,
  onDelete,
  onUpdate,
  onConnectionStart,
  onConnectionEnd,
  canvasScale,
  canvasOffset,
}: ImageNodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const imageUrl = node.data?.image_url || '';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onUpdate({ 
        image_url: '', 
        status: 'failed', 
        error_message: 'Please select an image file' 
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onUpdate({ 
        image_url: '', 
        status: 'failed', 
        error_message: 'File size must be less than 10MB' 
      });
      return;
    }

    // Update status to processing
    setUploading(true);
    onUpdate({ image_url: '', status: 'processing' });

    try {
      // Try to upload to backend first
      const uploadResult = await filesApi.uploadDirect(file);
      
      // Verify we got a valid URL
      if (uploadResult.url && uploadResult.url.startsWith('http')) {
        onUpdate({ 
          image_url: uploadResult.url, 
          status: 'idle',
          file_id: uploadResult.file_id,
          object_name: uploadResult.object_name,
        });
      } else {
        throw new Error('Invalid URL returned from server');
      }
    } catch (uploadError: any) {
      console.error('Upload failed:', uploadError);
      
      // Check if it's a network error
      const isNetworkError = uploadError?.status === 0 || 
                            uploadError?.data?.type === 'network_error' ||
                            uploadError?.message?.includes('Failed to fetch') ||
                            uploadError?.message?.includes('Network Error');
      
      if (isNetworkError) {
        // Network error - show clear message
        const errorDetail = uploadError?.data?.detail || 
                          'Cannot connect to backend server. Please ensure it is running.';
        onUpdate({ 
          image_url: '', 
          status: 'failed', 
          error_message: errorDetail 
        });
        return;
      }
      
      // Other errors - fallback to data URL if it's a server error (not validation)
      const isServerError = uploadError?.status >= 500 || 
                           (uploadError?.status >= 400 && uploadError?.status < 500 && 
                            !uploadError?.data?.detail?.includes('size') &&
                            !uploadError?.data?.detail?.includes('type'));
      
      if (isServerError) {
        // Fallback to data URL for server errors (for development/testing)
        const errorMessage = uploadError?.data?.detail || uploadError?.message || 'Upload failed. Using local preview.';
        console.warn('Upload to backend failed, using data URL:', errorMessage);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          onUpdate({ 
            image_url: dataUrl, 
            status: 'idle',
            _local_preview: true, // Mark as local preview
          });
        };
        reader.onerror = () => {
          onUpdate({ 
            image_url: '', 
            status: 'failed', 
            error_message: 'Failed to read file' 
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Client error (validation, auth, etc.) - show error message
        const errorMessage = uploadError?.data?.detail || 
                           uploadError?.message || 
                           'Upload failed';
        onUpdate({ 
          image_url: '', 
          status: 'failed', 
          error_message: errorMessage 
        });
      }
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const outputHandles = [
    { id: 'image-output', type: 'output' as const, position: { x: 0, y: 50 } },
  ];

  return (
    <BaseNode
      node={node}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onDelete={onDelete}
      outputHandles={outputHandles}
      onConnectionStart={onConnectionStart}
      onConnectionEnd={onConnectionEnd}
      canvasScale={canvasScale}
      canvasOffset={canvasOffset}
    >
      <div className="space-y-2">
        {imageUrl ? (
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Node image"
              className="w-full h-32 object-cover rounded border border-gray-700"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ image_url: '' });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full h-32 border-2 border-dashed border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-[#151515] transition-colors"
          >
            <span className="text-gray-400 text-sm">Click to upload image</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        {(node.status === 'processing' || uploading) && (
          <div className="text-xs text-yellow-400 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading...</span>
          </div>
        )}
        {node.status === 'failed' && node.error_message && (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>{node.error_message}</span>
          </div>
        )}
        {imageUrl && node.data?._local_preview && (
          <div className="text-xs text-yellow-400 flex items-center gap-1">
            <span>ℹ️</span>
            <span>Local preview (not uploaded)</span>
          </div>
        )}
        {imageUrl && !node.data?._local_preview && (
          <div className="text-xs text-green-400 flex items-center gap-1">
            <span>✓</span>
            <span>Uploaded successfully</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

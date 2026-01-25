"use client";

import React, { useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { filesApi } from '@/lib/api';

export default function ImageNodeRF({ data, selected }: NodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Access backend node data
  const node = data.data || {};
  const imageUrl = node.image_url || '';
  const status = data.status || 'idle';
  const errorMessage = data.error_message || '';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      data.onUpdate?.({
        image_url: '',
        status: 'failed',
        error_message: 'Please select an image file'
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      data.onUpdate?.({
        image_url: '',
        status: 'failed',
        error_message: 'File size must be less than 10MB'
      });
      return;
    }

    // Update status to processing
    setUploading(true);
    data.onUpdate?.({ image_url: '', status: 'processing' });

    try {
      // Upload to backend
      const uploadResult = await filesApi.uploadDirect(file);

      // Verify we got a valid URL
      if (uploadResult.url && uploadResult.url.startsWith('http')) {
        data.onUpdate?.({
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
        data.onUpdate?.({
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
          data.onUpdate?.({
            image_url: dataUrl,
            status: 'idle',
            _local_preview: true, // Mark as local preview
          });
        };
        reader.onerror = () => {
          data.onUpdate?.({
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
        data.onUpdate?.({
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

  return (
    <div className={`rf-node rf-image-node ${selected ? 'selected' : ''}`}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={status} />
        <h3 className="rf-node-title">Image</h3>
        {selected && (
          <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
        )}
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        <div className="space-y-3">
          {/* Image Upload Area */}
          {imageUrl ? (
            <div className="relative group">
              <img
                src={imageUrl}
                alt="Node image"
                className="w-full h-40 object-cover rounded border border-[#374151]"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onUpdate?.({ image_url: '' });
                }}
                className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/80"
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
              className="w-full h-40 border-2 border-dashed border-[#374151] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#3b82f6] hover:bg-[#0a0a0a]/30 transition-all duration-200 group"
            >
              <svg 
                className="w-8 h-8 mb-2 text-[#6b7280] group-hover:text-[#3b82f6] transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <span className="text-[#9ca3af] text-sm font-light tracking-wide group-hover:text-[#d1d9e6] transition-colors">
                Upload Image
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Description Input */}
          <div>
            <input
              type="text"
              placeholder="Add description..."
              value={node.description || ''}
              onChange={(e) => {
                e.stopPropagation();
                data.onUpdate?.({ description: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 bg-[#0a0a0a]/50 border border-[#374151] rounded-lg text-sm text-[#d1d9e6] placeholder-[#6b7280] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all duration-200"
            />
          </div>

          {/* Status Messages - Only show uploading spinner */}
          {(status === 'processing' || uploading) && (
            <div className="flex items-center justify-center py-1">
              <div className="w-3 h-3 border-2 border-[#6b7280] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

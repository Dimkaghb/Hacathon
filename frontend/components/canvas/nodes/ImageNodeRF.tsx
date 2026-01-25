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
                  data.onUpdate?.({ image_url: '' });
                }}
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
          {(status === 'processing' || uploading) && (
            <div className="text-xs text-yellow-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading...</span>
            </div>
          )}
          {status === 'failed' && errorMessage && (
            <div className="text-xs text-red-400 flex items-center gap-1">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
          {imageUrl && node._local_preview && (
            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <span>ℹ️</span>
              <span>Local preview (not uploaded)</span>
            </div>
          )}
          {imageUrl && !node._local_preview && (
            <div className="text-xs text-green-400 flex items-center gap-1">
              <span>✓</span>
              <span>Uploaded successfully</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';
import { filesApi } from '@/lib/api';

export default function ImageNodeRF({ data, selected }: CustomNodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Access backend node data
  const node = (data.data || {}) as Record<string, any>;
  const imageUrl = node.image_url || '';
  const status = data.status || 'idle';

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
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      data.onUpdate?.({
        image_url: '',
        status: 'failed',
        error_message: 'File size must be less than 10MB'
      });
      return;
    }

    setUploading(true);
    data.onUpdate?.({ image_url: '', status: 'processing' });

    try {
      const uploadResult = await filesApi.uploadDirect(file);

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

      const isNetworkError = uploadError?.status === 0 ||
                            uploadError?.data?.type === 'network_error' ||
                            uploadError?.message?.includes('Failed to fetch') ||
                            uploadError?.message?.includes('Network Error');

      if (isNetworkError) {
        const errorDetail = uploadError?.data?.detail ||
                          'Cannot connect to backend server';
        data.onUpdate?.({
          image_url: '',
          status: 'failed',
          error_message: errorDetail
        });
        return;
      }

      const isServerError = uploadError?.status >= 500 ||
                           (uploadError?.status >= 400 && uploadError?.status < 500 &&
                            !uploadError?.data?.detail?.includes('size') &&
                            !uploadError?.data?.detail?.includes('type'));

      if (isServerError) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          data.onUpdate?.({
            image_url: dataUrl,
            status: 'idle',
            _local_preview: true,
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
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content">
        {/* Image Upload Area */}
        {imageUrl ? (
          <div className="relative group mb-3">
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-full aspect-square object-cover rounded-md"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onUpdate?.({ image_url: '' });
              }}
              className="absolute top-1.5 right-1.5 bg-black/70 text-white/90 text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="rf-upload-area mb-3"
          >
            {uploading || status === 'processing' ? (
              <div className="w-5 h-5 border-2 border-[#3a3a3a] border-t-[#808080] rounded-full animate-spin" />
            ) : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Upload</span>
              </>
            )}
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
        <input
          type="text"
          placeholder="Description (optional)"
          value={node.description || ''}
          onChange={(e) => {
            e.stopPropagation();
            data.onUpdate?.({ description: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          className="rf-input"
        />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { IconShare, IconLink, IconLinkOff, IconCopy, IconCheck, IconRefresh, IconX } from '@tabler/icons-react';
import { projectsApi } from '@/lib/api';

interface ShareButtonProps {
  projectId: string;
}

export function ShareButton({ projectId }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current share status on mount
  useEffect(() => {
    if (isOpen && projectId) {
      fetchShareStatus();
    }
  }, [isOpen, projectId]);

  const fetchShareStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await projectsApi.getShareStatus(projectId);
      setShareEnabled(status.share_enabled);
      setShareUrl(status.share_url);
    } catch (err: any) {
      console.error('Failed to fetch share status:', err);
      setError('Failed to load sharing status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableSharing = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await projectsApi.enableSharing(projectId);
      setShareEnabled(result.share_enabled);
      setShareUrl(result.share_url);
    } catch (err: any) {
      console.error('Failed to enable sharing:', err);
      setError('Failed to enable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await projectsApi.disableSharing(projectId);
      setShareEnabled(result.share_enabled);
      setShareUrl(null);
    } catch (err: any) {
      console.error('Failed to disable sharing:', err);
      setError('Failed to disable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateLink = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await projectsApi.regenerateShareLink(projectId);
      setShareEnabled(result.share_enabled);
      setShareUrl(result.share_url);
    } catch (err: any) {
      console.error('Failed to regenerate link:', err);
      setError('Failed to regenerate link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        title="Share project"
      >
        <IconShare size={18} />
        <span className="text-sm font-medium hidden sm:inline">Share</span>
        {shareEnabled && (
          <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Share Project
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-2 rounded-lg bg-[var(--color-error-muted)] text-[var(--color-error)] text-xs">
                  {error}
                </div>
              )}

              {/* Share Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Anyone with the link
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {shareEnabled ? 'Can view and edit' : 'Sharing disabled'}
                  </p>
                </div>
                <button
                  onClick={shareEnabled ? handleDisableSharing : handleEnableSharing}
                  disabled={isLoading}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    shareEnabled 
                      ? 'bg-[var(--color-success)]' 
                      : 'bg-[var(--color-border-default)]'
                  } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <div 
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      shareEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Share Link */}
              {shareEnabled && shareUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-secondary)] truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white transition-colors"
                      title="Copy link"
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </button>
                  </div>
                  
                  <button
                    onClick={handleRegenerateLink}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    <IconRefresh size={14} className={isLoading ? 'animate-spin' : ''} />
                    Regenerate link (invalidates old links)
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="pt-2 border-t border-[var(--color-border-default)]">
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                  <IconLink size={14} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Anyone with this link can access and edit this project in real-time. 
                    You can regenerate the link to revoke previous access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ShareButton;

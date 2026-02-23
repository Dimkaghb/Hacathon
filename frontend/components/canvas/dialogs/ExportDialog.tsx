"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { aiApi } from '@/lib/api';

interface PlatformPreset {
  aspect_ratio: string;
  max_duration: number | null;
  resolution: string;
  label: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "TT",
  instagram_reels: "IG",
  instagram_feed: "IG",
  youtube_shorts: "YT",
  youtube: "YT",
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#010101",
  instagram_reels: "#E1306C",
  instagram_feed: "#C13584",
  youtube_shorts: "#FF0000",
  youtube: "#FF0000",
};

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string | null;
  nodeId: string | null;
  onJobStarted?: (jobId: string) => void;
}

export default function ExportDialog({
  open,
  onClose,
  videoUrl,
  nodeId,
  onJobStarted,
}: ExportDialogProps) {
  const [presets, setPresets] = useState<Record<string, PlatformPreset>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ video_url: string; platform: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollProgress, setPollProgress] = useState<number>(0);

  // Load presets
  useEffect(() => {
    if (!open) return;
    aiApi.getExportPresets().then(setPresets).catch(console.error);
    // Reset state when dialog opens
    setSelectedPlatform(null);
    setExportResult(null);
    setError(null);
    setPollProgress(0);
    setExporting(false);
  }, [open]);

  const handleExport = useCallback(async () => {
    if (!selectedPlatform || !videoUrl || !nodeId) return;

    setExporting(true);
    setError(null);
    setExportResult(null);
    setPollProgress(5);

    try {
      const job = await aiApi.exportVideo({
        node_id: nodeId,
        video_url: videoUrl,
        platform: selectedPlatform,
      });

      onJobStarted?.(job.job_id);

      // Poll for completion
      const poll = async () => {
        try {
          const status = await aiApi.getJobStatus(job.job_id);

          if (status.status === 'completed') {
            setExportResult({
              video_url: status.result?.video_url || '',
              platform: selectedPlatform,
            });
            setPollProgress(100);
            setExporting(false);
          } else if (status.status === 'failed') {
            setError(status.error || 'Export failed');
            setExporting(false);
          } else {
            setPollProgress(status.progress || 10);
            setTimeout(poll, 2000);
          }
        } catch (e: any) {
          setError(e?.message || 'Polling failed');
          setExporting(false);
        }
      };

      setTimeout(poll, 2000);
    } catch (e: any) {
      setError(e?.message || 'Export failed');
      setExporting(false);
    }
  }, [selectedPlatform, videoUrl, nodeId, onJobStarted]);

  if (!open) return null;

  const preset = selectedPlatform ? presets[selectedPlatform] : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-lg font-semibold text-white">Export for Platform</h2>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-white transition-colors text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Video not available warning */}
          {!videoUrl && (
            <div className="text-center py-8 text-[#808080] text-sm">
              No video available. Generate or stitch a video first.
            </div>
          )}

          {/* Platform Grid */}
          {videoUrl && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(presets).map(([key, p]) => {
                  const isSelected = selectedPlatform === key;
                  const color = PLATFORM_COLORS[key] || '#3b82f6';

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlatform(key)}
                      disabled={exporting}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-white bg-[#2a2a2a]'
                          : 'border-[#3a3a3a] bg-[#252525] hover:border-[#555]'
                      } ${exporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {/* Platform icon circle */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: color }}
                      >
                        {PLATFORM_ICONS[key] || '?'}
                      </div>
                      <span className="text-xs text-white font-medium">{p.label}</span>
                      <span className="text-[10px] text-[#808080]">
                        {p.aspect_ratio} &middot; {p.resolution}
                      </span>
                      {p.max_duration && (
                        <span className="text-[10px] text-[#606060]">
                          max {p.max_duration}s
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected platform details */}
              {preset && (
                <div className="bg-[#252525] rounded-lg p-4 border border-[#333]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{preset.label}</p>
                      <p className="text-xs text-[#808080] mt-1">
                        {preset.resolution} &middot; {preset.aspect_ratio}
                        {preset.max_duration ? ` &middot; max ${preset.max_duration}s` : ''}
                      </p>
                    </div>
                    {/* Aspect ratio preview */}
                    <div className="flex items-center justify-center w-16 h-16">
                      <div
                        className="border-2 border-[#555] rounded"
                        style={{
                          ...(preset.aspect_ratio === '9:16'
                            ? { width: 24, height: 42 }
                            : preset.aspect_ratio === '4:5'
                            ? { width: 28, height: 35 }
                            : preset.aspect_ratio === '1:1'
                            ? { width: 32, height: 32 }
                            : { width: 42, height: 24 }),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {exporting && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 border-2 border-[#555] border-t-white rounded-full animate-spin" />
                    <span className="text-sm text-[#808080]">
                      Exporting for {preset?.label || selectedPlatform}...
                    </span>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5 transition-all duration-300"
                      style={{ width: `${pollProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Export result */}
              {exportResult && (
                <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-green-300 font-medium">
                    Export ready for {presets[exportResult.platform]?.label || exportResult.platform}
                  </p>
                  {exportResult.video_url && (
                    <>
                      <video
                        src={exportResult.video_url}
                        controls
                        preload="metadata"
                        className="w-full rounded-md max-h-48"
                      />
                      <a
                        href={exportResult.video_url}
                        download={`export-${exportResult.platform}.mp4`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Download
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* Export button */}
              {!exportResult && (
                <button
                  onClick={handleExport}
                  disabled={!selectedPlatform || exporting}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlatform && !exporting
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-[#333] text-[#606060] cursor-not-allowed'
                  }`}
                >
                  {exporting
                    ? 'Exporting...'
                    : selectedPlatform
                    ? `Export for ${preset?.label || selectedPlatform}`
                    : 'Select a platform'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

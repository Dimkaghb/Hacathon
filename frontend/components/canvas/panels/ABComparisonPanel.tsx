"use client";

import React, { useState, useMemo } from 'react';
import { Node } from '@/lib/types/node';
import {
  IconX,
  IconGitBranch,
  IconDownload,
  IconChartBar,
} from '@tabler/icons-react';

interface BranchArm {
  label: string;
  nodes: Node[];
  videoNode: Node | null;
  entryNodeId: string;
}

interface BranchGroup {
  id: string;
  arms: BranchArm[];
}

interface ArmEditState {
  tag: string;
  notes: string;
  ctr: string;
  hook_rate: string;
  conversion_rate: string;
}

interface ABComparisonPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  onUpdateNode: (nodeId: string, data: Record<string, any>) => Promise<void>;
}

const ARM_LETTERS = ['A', 'B', 'C', 'D', 'E'];

const TAG_OPTIONS: { value: string; label: string; color: string }[] = [
  {
    value: 'winner',
    label: 'Winner',
    color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400',
  },
  {
    value: 'loser',
    label: 'Loser',
    color: 'border-red-500/50 bg-red-500/15 text-red-400',
  },
  {
    value: 'control',
    label: 'Control',
    color: 'border-blue-500/50 bg-blue-500/15 text-blue-400',
  },
];

const TAG_BADGE_COLORS: Record<string, string> = {
  winner: 'bg-emerald-500/20 text-emerald-400',
  loser: 'bg-red-500/20 text-red-400',
  control: 'bg-blue-500/20 text-blue-400',
};

function buildBranchGroups(nodes: Node[]): BranchGroup[] {
  // Collect all nodes that carry branch metadata
  const branchNodes = nodes.filter(n => n.data?.branch_group_id);

  // Group by branch_group_id
  const groupMap = new Map<string, Node[]>();
  for (const node of branchNodes) {
    const gid = node.data.branch_group_id as string;
    if (!groupMap.has(gid)) groupMap.set(gid, []);
    groupMap.get(gid)!.push(node);
  }

  const groups: BranchGroup[] = [];

  for (const [groupId, groupNodes] of groupMap.entries()) {
    // Original arm = nodes without branch_source_node_id
    const originalNodes = groupNodes.filter(n => !n.data?.branch_source_node_id);
    // Cloned arm(s) = nodes with branch_source_node_id
    const clonedNodes = groupNodes.filter(n => !!n.data?.branch_source_node_id);

    const arms: BranchArm[] = [];

    if (originalNodes.length > 0) {
      arms.push({
        label: 'Branch A',
        nodes: originalNodes,
        videoNode: originalNodes.find(n => n.data?.video_url) ?? null,
        entryNodeId: originalNodes[0].id,
      });
    }

    if (clonedNodes.length > 0) {
      arms.push({
        label: 'Branch B',
        nodes: clonedNodes,
        videoNode: clonedNodes.find(n => n.data?.video_url) ?? null,
        entryNodeId: clonedNodes[0].id,
      });
    }

    if (arms.length > 0) {
      groups.push({ id: groupId, arms });
    }
  }

  return groups;
}

export default function ABComparisonPanel({
  open,
  onClose,
  nodes,
  onUpdateNode,
}: ABComparisonPanelProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  // Local edit state keyed by representativeNodeId
  const [editState, setEditState] = useState<Record<string, ArmEditState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const branchGroups = useMemo(() => buildBranchGroups(nodes), [nodes]);

  const activeGroupId = selectedGroupId ?? branchGroups[0]?.id ?? null;
  const activeGroup = branchGroups.find(g => g.id === activeGroupId) ?? null;

  const getArmEditState = (repNode: Node): ArmEditState => {
    if (editState[repNode.id]) return editState[repNode.id];
    const d = repNode.data ?? {};
    return {
      tag: d.branch_tag ?? '',
      notes: d.branch_notes ?? '',
      ctr: d.branch_metrics?.ctr != null ? String(d.branch_metrics.ctr) : '',
      hook_rate: d.branch_metrics?.hook_rate != null ? String(d.branch_metrics.hook_rate) : '',
      conversion_rate: d.branch_metrics?.conversion_rate != null ? String(d.branch_metrics.conversion_rate) : '',
    };
  };

  const updateField = (repNodeId: string, field: keyof ArmEditState, value: string) => {
    setEditState(prev => ({
      ...prev,
      [repNodeId]: {
        ...(prev[repNodeId] ?? { tag: '', notes: '', ctr: '', hook_rate: '', conversion_rate: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (arm: BranchArm) => {
    const repNode = arm.videoNode ?? arm.nodes[0];
    if (!repNode) return;

    const es = getArmEditState(repNode);
    setSaving(prev => ({ ...prev, [repNode.id]: true }));

    const updates: Record<string, any> = {
      branch_tag: es.tag,
      branch_notes: es.notes,
      branch_metrics: {
        ctr: parseFloat(es.ctr) || 0,
        hook_rate: parseFloat(es.hook_rate) || 0,
        conversion_rate: parseFloat(es.conversion_rate) || 0,
      },
    };

    try {
      await Promise.all(arm.nodes.map(n => onUpdateNode(n.id, updates)));
    } catch (err) {
      console.error('[ABPanel] Failed to save branch metadata:', err);
    } finally {
      setSaving(prev => ({ ...prev, [repNode.id]: false }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl mx-4 max-h-[90vh] bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center gap-3">
            <IconGitBranch size={16} className="text-[#808080]" />
            <h2 className="text-sm font-medium text-white">A/B Comparison</h2>

            {/* Branch group selector — only shown when multiple groups exist */}
            {branchGroups.length > 1 && (
              <select
                value={activeGroupId ?? ''}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="ml-2 px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:outline-none cursor-pointer"
              >
                {branchGroups.map((g, i) => (
                  <option key={g.id} value={g.id}>
                    Branch Group {i + 1}
                  </option>
                ))}
              </select>
            )}

            {activeGroup && (
              <span className="text-[10px] text-[#555]">
                {activeGroup.arms.length} variation{activeGroup.arms.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {branchGroups.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <IconGitBranch size={36} className="text-[#3a3a3a]" />
              <p className="text-[13px] font-medium text-[#555]">No branches yet</p>
              <p className="text-[11px] text-[#444] text-center max-w-sm leading-relaxed">
                Click the Branch button on any Scene or Video node to create a variation.
                All variations will appear here for side-by-side comparison.
              </p>
            </div>
          ) : !activeGroup ? null : (
            /* Comparison grid — one column per arm */
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${activeGroup.arms.length}, minmax(0, 1fr))` }}
            >
              {activeGroup.arms.map((arm, armIdx) => {
                const repNode = arm.videoNode ?? arm.nodes[0];
                const es = repNode ? getArmEditState(repNode) : null;
                const isSaving = repNode ? !!saving[repNode.id] : false;
                const armLetter = ARM_LETTERS[armIdx] ?? String(armIdx + 1);
                const currentTag = es?.tag ?? '';
                const scriptNode = arm.nodes.find(n => n.data?.script_text);

                return (
                  <div
                    key={arm.entryNodeId}
                    className="flex flex-col gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
                  >
                    {/* Arm header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-[#252525] text-[11px] font-semibold text-white tracking-wide">
                        Branch {armLetter}
                      </span>
                      {currentTag && TAG_BADGE_COLORS[currentTag] && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TAG_BADGE_COLORS[currentTag]}`}>
                          {currentTag.charAt(0).toUpperCase() + currentTag.slice(1)}
                        </span>
                      )}
                      <span className="ml-auto text-[9px] text-[#444]">
                        {arm.nodes.length} node{arm.nodes.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Video player */}
                    <div className="aspect-video bg-[#0d0d0d] rounded-lg overflow-hidden border border-[#222] flex items-center justify-center">
                      {arm.videoNode?.data?.video_url ? (
                        <video
                          src={arm.videoNode.data.video_url}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#3a3a3a]">
                          <IconGitBranch size={24} />
                          <span className="text-[10px]">No video yet</span>
                          <span className="text-[9px] text-[#2a2a2a] text-center px-4">
                            Generate a video in this branch first
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Script preview */}
                    {scriptNode?.data?.script_text && (
                      <div className="px-3 py-2 bg-[#111] rounded-lg border border-[#1e1e1e]">
                        <p className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Script</p>
                        <p className="text-[10px] text-[#aaa] leading-relaxed line-clamp-3 italic">
                          &ldquo;{scriptNode.data.script_text}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Controls (only when we have a representative node) */}
                    {repNode && es && (
                      <>
                        {/* Tag selector */}
                        <div>
                          <p className="text-[9px] text-[#666] uppercase tracking-wider mb-2">Tag</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {TAG_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() =>
                                  updateField(repNode.id, 'tag', es.tag === opt.value ? '' : opt.value)
                                }
                                className={`px-2.5 py-1 rounded-md border text-[10px] font-medium transition-all ${
                                  es.tag === opt.value
                                    ? opt.color
                                    : 'border-[#2a2a2a] bg-[#111] text-[#666] hover:text-[#aaa] hover:border-[#333]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <p className="text-[9px] text-[#666] uppercase tracking-wider mb-1.5">Notes</p>
                          <textarea
                            value={es.notes}
                            onChange={e => updateField(repNode.id, 'notes', e.target.value)}
                            placeholder="e.g. 2x higher CTR than Branch B..."
                            rows={2}
                            className="w-full px-2.5 py-2 bg-[#111] border border-[#222] rounded-lg text-[10px] text-white placeholder-[#3a3a3a] resize-none focus:outline-none focus:border-[#333] leading-relaxed"
                          />
                        </div>

                        {/* Metrics */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <IconChartBar size={11} className="text-[#555]" />
                            <p className="text-[9px] text-[#666] uppercase tracking-wider">Metrics</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {(
                              [
                                { key: 'ctr', label: 'CTR %' },
                                { key: 'hook_rate', label: 'Hook Rate %' },
                                { key: 'conversion_rate', label: 'Conv. Rate %' },
                              ] as { key: keyof ArmEditState; label: string }[]
                            ).map(({ key, label }) => (
                              <div key={key}>
                                <p className="text-[8px] text-[#555] mb-1 truncate">{label}</p>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={es[key]}
                                  onChange={e => updateField(repNode.id, key, e.target.value)}
                                  placeholder="0.0"
                                  className="w-full px-2 py-1.5 bg-[#111] border border-[#222] rounded text-[10px] text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#333] text-center"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-1">
                          {arm.videoNode?.data?.video_url && (
                            <a
                              href={arm.videoNode.data.video_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-[10px] text-[#777] hover:text-white hover:border-[#3a3a3a] transition-colors"
                            >
                              <IconDownload size={12} />
                              Export
                            </a>
                          )}
                          <button
                            onClick={() => handleSave(arm)}
                            disabled={isSaving}
                            className="flex-1 px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

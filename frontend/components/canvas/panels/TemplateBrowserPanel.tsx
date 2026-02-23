"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { templatesApi, TemplateItem } from '@/lib/api';
import {
  IconX,
  IconComponents,
  IconSearch,
  IconClock,
  IconMovie,
  IconCheck,
  IconStar,
  IconStarFilled,
  IconGitFork,
  IconWorld,
  IconUser,
  IconUpload,
  IconArrowDown,
} from '@tabler/icons-react';

interface TemplateBrowserPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: TemplateItem, variables: Record<string, string>) => void;
}

type TabKey = 'system' | 'mine' | 'community';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'system', label: 'System', icon: <IconComponents size={12} /> },
  { key: 'mine', label: 'My Templates', icon: <IconUser size={12} /> },
  { key: 'community', label: 'Community', icon: <IconWorld size={12} /> },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'testimonial', label: 'Testimonial' },
  { key: 'unboxing', label: 'Unboxing' },
  { key: 'grwm', label: 'GRWM' },
  { key: 'before-after', label: 'Before/After' },
  { key: 'tutorial', label: 'Tutorial' },
  { key: 'problem-agitate-solve', label: 'PAS' },
];

const CATEGORY_COLORS: Record<string, string> = {
  testimonial: 'bg-purple-500/20 text-purple-400',
  unboxing: 'bg-amber-500/20 text-amber-400',
  grwm: 'bg-pink-500/20 text-pink-400',
  'before-after': 'bg-emerald-500/20 text-emerald-400',
  tutorial: 'bg-blue-500/20 text-blue-400',
  'problem-agitate-solve': 'bg-red-500/20 text-red-400',
};

const COMMUNITY_SORTS = [
  { key: 'popular', label: 'Most Popular' },
  { key: 'recent', label: 'Most Recent' },
  { key: 'rating', label: 'Highest Rated' },
];

function StarRating({ rating, count, size = 10 }: { rating: number; count: number; size?: number }) {
  const stars = [];
  const rounded = Math.round(rating * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars.push(<IconStarFilled key={i} size={size} className="text-amber-400" />);
    } else {
      stars.push(<IconStar key={i} size={size} className="text-[#444]" />);
    }
  }
  return (
    <div className="flex items-center gap-0.5">
      {stars}
      {count > 0 && (
        <span className="text-[9px] text-[#666] ml-1">
          {rating.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}

function InteractiveStarRating({ onRate }: { onRate: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => {
            setSelected(star);
            onRate(star);
          }}
          className="p-0"
        >
          {(hover || selected) >= star ? (
            <IconStarFilled size={14} className="text-amber-400" />
          ) : (
            <IconStar size={14} className="text-[#444] hover:text-amber-400/50" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function TemplateBrowserPanel({
  open,
  onClose,
  onSelect,
}: TemplateBrowserPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('system');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [communitySort, setCommunitySort] = useState('popular');

  // Variable input state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Action feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
      setVariableValues({});
      setActionMessage(null);
    }
  }, [open, activeTab, communitySort]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let data: TemplateItem[];
      if (activeTab === 'community') {
        data = await templatesApi.listCommunity(undefined, communitySort);
      } else if (activeTab === 'mine') {
        data = await templatesApi.listMine();
      } else {
        data = await templatesApi.list();
        data = data.filter(t => t.is_system);
      }
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.best_for || []).some(b => b.toLowerCase().includes(q))
      );
    }
    return result;
  }, [templates, activeCategory, searchQuery]);

  const handleUseTemplate = (template: TemplateItem) => {
    const variables = template.graph_definition?.variables || [];
    if (variables.length > 0) {
      setSelectedTemplate(template);
      const defaults: Record<string, string> = {};
      variables.forEach((v: any) => { defaults[v.key] = ''; });
      setVariableValues(defaults);
    } else {
      onSelect(template, {});
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    onSelect(selectedTemplate, variableValues);
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const handleBackToList = () => {
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const handlePublish = async (template: TemplateItem) => {
    try {
      if (template.is_published) {
        await templatesApi.unpublish(template.id);
        showMessage('Template unpublished');
      } else {
        await templatesApi.publish(template.id);
        showMessage('Template published to community!');
      }
      fetchTemplates();
    } catch (err: any) {
      console.error('Publish error:', err);
      showMessage(err?.data?.detail || 'Failed to publish');
    }
  };

  const handleRemix = async (template: TemplateItem) => {
    try {
      await templatesApi.remix(template.id);
      showMessage('Template remixed! Check "My Templates"');
      fetchTemplates();
    } catch (err: any) {
      console.error('Remix error:', err);
      showMessage(err?.data?.detail || 'Failed to remix');
    }
  };

  const handleRate = async (template: TemplateItem, rating: number) => {
    try {
      await templatesApi.rate(template.id, rating);
      showMessage(`Rated ${rating} stars`);
      fetchTemplates();
    } catch (err: any) {
      console.error('Rate error:', err);
      showMessage(err?.data?.detail || 'Failed to rate');
    }
  };

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 2500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-96 h-full bg-[#141414] border-l border-[#2a2a2a] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <IconComponents size={16} className="text-[#808080]" />
            <h2 className="text-sm font-medium text-white">
              {selectedTemplate ? 'Customize Template' : 'Templates'}
            </h2>
          </div>
          <button
            onClick={selectedTemplate ? handleBackToList : onClose}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#808080] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Action message toast */}
        {actionMessage && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] text-center">
            {actionMessage}
          </div>
        )}

        {/* Variable Input View */}
        {selectedTemplate ? (
          <div className="p-4 flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-white">{selectedTemplate.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[selectedTemplate.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                  {selectedTemplate.category}
                </span>
              </div>
              <p className="text-[10px] text-[#777]">
                {selectedTemplate.scene_count} scenes &middot; {selectedTemplate.estimated_duration}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] text-[#888] uppercase tracking-wider font-medium">Customize Variables</span>
              {(selectedTemplate.graph_definition?.variables || []).map((v: any) => (
                <div key={v.key} className="flex flex-col gap-1">
                  <label className="text-[11px] text-[#aaa] font-medium">{v.label}</label>
                  <input
                    type="text"
                    value={variableValues[v.key] || ''}
                    onChange={(e) =>
                      setVariableValues(prev => ({ ...prev, [v.key]: e.target.value }))
                    }
                    placeholder={v.placeholder || ''}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleBackToList}
                className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white hover:border-[#3a3a3a] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleApplyTemplate}
                className="flex-1 px-3 py-2 rounded-lg bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <IconCheck size={14} />
                Apply Template
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Bar */}
            <div className="flex border-b border-[#2a2a2a]">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setActiveCategory('all');
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-medium transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'text-white border-white'
                      : 'text-[#666] border-transparent hover:text-[#aaa]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-3 pt-3">
              <div className="relative">
                <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#3a3a3a]"
                />
              </div>
            </div>

            {/* Community sort */}
            {activeTab === 'community' && (
              <div className="flex items-center gap-1.5 px-3 pt-2">
                <IconArrowDown size={10} className="text-[#555]" />
                {COMMUNITY_SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setCommunitySort(s.key)}
                    className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                      communitySort === s.key
                        ? 'bg-white/10 text-white'
                        : 'text-[#666] hover:text-[#aaa]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1 px-3 pt-2 pb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-white text-black'
                      : 'bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template Cards */}
            <div className="p-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-[11px] text-[#666]">Loading...</span>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <IconComponents size={24} className="text-[#4a4a4a]" />
                  <span className="text-[11px] text-[#666]">
                    {activeTab === 'mine'
                      ? 'No custom templates yet'
                      : activeTab === 'community'
                      ? 'No community templates found'
                      : 'No templates found'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all w-full"
                    >
                      {/* Top row: name + badges */}
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-[11px] font-medium text-white truncate flex-1">
                          {template.name}
                        </span>
                        {template.is_published && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-emerald-500/15 text-emerald-400">
                            Published
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[template.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                          {template.category}
                        </span>
                      </div>

                      {/* Scene count + duration + remixes */}
                      <div className="flex items-center gap-3 text-[9px] text-[#666]">
                        <span className="flex items-center gap-0.5">
                          <IconMovie size={10} />
                          {template.scene_count} scenes
                        </span>
                        {template.estimated_duration && (
                          <span className="flex items-center gap-0.5">
                            <IconClock size={10} />
                            {template.estimated_duration}
                          </span>
                        )}
                        {(activeTab === 'community' || template.is_published) && template.remix_count > 0 && (
                          <span className="flex items-center gap-0.5">
                            <IconGitFork size={10} />
                            {template.remix_count} remixes
                          </span>
                        )}
                      </div>

                      {/* Rating (community and published) */}
                      {(activeTab === 'community' || template.is_published) && (
                        <StarRating rating={template.rating} count={template.rating_count} />
                      )}

                      {/* Description */}
                      {template.description && (
                        <p className="text-[10px] text-[#777] leading-relaxed line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Best for tags */}
                      {template.best_for && template.best_for.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {template.best_for.map((tag, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#222] text-[8px] text-[#888]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5 mt-1.5">
                        {activeTab === 'community' ? (
                          <>
                            <button
                              onClick={() => handleRemix(template)}
                              className="flex-1 px-3 py-1.5 rounded-md bg-white text-black text-[10px] font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <IconGitFork size={12} />
                              Remix
                            </button>
                            <button
                              onClick={() => handleUseTemplate(template)}
                              className="flex-1 px-3 py-1.5 rounded-md bg-[#222] text-white text-[10px] font-medium hover:bg-[#333] transition-colors"
                            >
                              Use Directly
                            </button>
                          </>
                        ) : activeTab === 'mine' ? (
                          <>
                            <button
                              onClick={() => handleUseTemplate(template)}
                              className="flex-1 px-3 py-1.5 rounded-md bg-white text-black text-[10px] font-medium hover:bg-gray-200 transition-colors"
                            >
                              Use Template
                            </button>
                            <button
                              onClick={() => handlePublish(template)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                template.is_published
                                  ? 'bg-[#222] text-[#888] hover:bg-[#333]'
                                  : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              }`}
                            >
                              <IconUpload size={12} />
                              {template.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUseTemplate(template)}
                            className="w-full px-3 py-1.5 rounded-md bg-white text-black text-[10px] font-medium hover:bg-gray-200 transition-colors"
                          >
                            Use Template
                          </button>
                        )}
                      </div>

                      {/* Rate (community only, inline) */}
                      {activeTab === 'community' && (
                        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#222]">
                          <span className="text-[9px] text-[#555]">Rate this template</span>
                          <InteractiveStarRating onRate={(r) => handleRate(template, r)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

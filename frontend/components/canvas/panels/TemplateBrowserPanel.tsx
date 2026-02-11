"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { templatesApi, TemplateItem } from '@/lib/api';
import { IconX, IconComponents, IconSearch, IconClock, IconMovie, IconCheck } from '@tabler/icons-react';

interface TemplateBrowserPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: TemplateItem, variables: Record<string, string>) => void;
}

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

export default function TemplateBrowserPanel({
  open,
  onClose,
  onSelect,
}: TemplateBrowserPanelProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Variable input state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
      setVariableValues({});
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await templatesApi.list();
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

        {/* Variable Input View */}
        {selectedTemplate ? (
          <div className="p-4 flex flex-col gap-4">
            {/* Template info */}
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

            {/* Variable inputs */}
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

            {/* Actions */}
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

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1 px-3 pt-3 pb-2">
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
                  <span className="text-[11px] text-[#666]">No templates found</span>
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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CATEGORY_COLORS[template.category] || 'bg-[#2a2a2a] text-[#888]'}`}>
                          {template.category}
                        </span>
                      </div>

                      {/* Scene count + duration */}
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
                      </div>

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

                      {/* Use Template button */}
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="mt-1.5 w-full px-3 py-1.5 rounded-md bg-white text-black text-[10px] font-medium hover:bg-gray-200 transition-colors"
                      >
                        Use Template
                      </button>
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

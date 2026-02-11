"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

const CATEGORIES = ['skincare', 'tech', 'food', 'fashion', 'fitness', 'other'];
const TONES = ['clinical', 'enthusiastic', 'casual', 'luxury', 'fun'];

export default function ProductNodeRF({ data, selected }: CustomNodeProps) {
  const node = (data.data || {}) as Record<string, any>;

  const [productName, setProductName] = useState(node.product_name || '');
  const [brand, setBrand] = useState(node.brand || '');
  const [category, setCategory] = useState(node.category || 'other');
  const [benefits, setBenefits] = useState(node.benefits?.join(', ') || '');
  const [targetAudience, setTargetAudience] = useState(node.target_audience || '');
  const [tone, setTone] = useState(node.tone || 'enthusiastic');

  useEffect(() => {
    setProductName(node.product_name || '');
    setBrand(node.brand || '');
    setCategory(node.category || 'other');
    setBenefits(node.benefits?.join(', ') || '');
    setTargetAudience(node.target_audience || '');
    setTone(node.tone || 'enthusiastic');
  }, [node.product_name, node.brand, node.category, node.benefits, node.target_audience, node.tone]);

  const sync = (patch: Record<string, any>) => {
    const current = {
      product_name: productName,
      brand,
      category,
      benefits: benefits.split(',').map((b: string) => b.trim()).filter(Boolean),
      target_audience: targetAudience,
      tone,
      ...patch,
    };
    // Ensure benefits is always an array when syncing
    if (typeof current.benefits === 'string') {
      current.benefits = (current.benefits as string).split(',').map((b: string) => b.trim()).filter(Boolean);
    }
    data.onUpdate?.(current);
  };

  return (
    <div className={`rf-node rf-product-node ${selected ? 'selected' : ''}`}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="product-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Product</h3>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content" style={{ minWidth: '220px' }}>
        <input
          type="text"
          value={productName}
          onChange={(e) => { setProductName(e.target.value); sync({ product_name: e.target.value }); }}
          placeholder="Product name"
          className="rf-input"
          onClick={(e) => e.stopPropagation()}
        />

        <input
          type="text"
          value={brand}
          onChange={(e) => { setBrand(e.target.value); sync({ brand: e.target.value }); }}
          placeholder="Brand"
          className="rf-input mt-1.5"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex gap-1.5 mt-1.5">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); sync({ category: e.target.value }); }}
            className="rf-select flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={tone}
            onChange={(e) => { setTone(e.target.value); sync({ tone: e.target.value }); }}
            className="rf-select flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <input
          type="text"
          value={benefits}
          onChange={(e) => { setBenefits(e.target.value); sync({ benefits: e.target.value }); }}
          placeholder="Benefits (comma separated)"
          className="rf-input mt-1.5"
          onClick={(e) => e.stopPropagation()}
        />

        <input
          type="text"
          value={targetAudience}
          onChange={(e) => { setTargetAudience(e.target.value); sync({ target_audience: e.target.value }); }}
          placeholder="Target audience"
          className="rf-input mt-1.5"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

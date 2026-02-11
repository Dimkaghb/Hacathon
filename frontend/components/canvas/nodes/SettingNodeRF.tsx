"use client";

import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CustomNodeProps } from './types';

const LOCATIONS = ['bathroom', 'kitchen', 'bedroom', 'office', 'outdoor', 'car', 'gym', 'studio', 'other'];
const LIGHTING = ['natural-window', 'ring-light', 'golden-hour', 'overhead', 'dim-ambient'];
const CAMERA_ANGLES = ['selfie', 'eye-level', 'slightly-below', 'overhead', 'dutch-angle'];
const VIBES = ['messy-authentic', 'clean-minimal', 'cozy', 'professional', 'energetic'];

export default function SettingNodeRF({ data, selected }: CustomNodeProps) {
  const node = (data.data || {}) as Record<string, any>;

  const [location, setLocation] = useState(node.location || 'bedroom');
  const [lighting, setLighting] = useState(node.lighting || 'natural-window');
  const [cameraAngle, setCameraAngle] = useState(node.camera_angle || 'selfie');
  const [vibe, setVibe] = useState(node.vibe || 'clean-minimal');
  const [customDetails, setCustomDetails] = useState(node.custom_details || '');

  useEffect(() => {
    setLocation(node.location || 'bedroom');
    setLighting(node.lighting || 'natural-window');
    setCameraAngle(node.camera_angle || 'selfie');
    setVibe(node.vibe || 'clean-minimal');
    setCustomDetails(node.custom_details || '');
  }, [node.location, node.lighting, node.camera_angle, node.vibe, node.custom_details]);

  const sync = (patch: Record<string, any>) => {
    data.onUpdate?.({
      location,
      lighting,
      camera_angle: cameraAngle,
      vibe,
      custom_details: customDetails,
      ...patch,
    });
  };

  const label = (s: string) => s.replace(/-/g, ' ');

  return (
    <div className={`rf-node rf-setting-node ${selected ? 'selected' : ''}`}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="setting-output"
        className="rf-handle rf-handle-source"
      />

      {/* Node Header */}
      <div className="rf-node-header">
        <div className="rf-node-status-indicator" data-status={data.status || 'idle'} />
        <h3 className="rf-node-title">Setting</h3>
        <button onClick={() => data.onDelete?.()} className="rf-node-delete">×</button>
      </div>

      {/* Node Content */}
      <div className="rf-node-content" style={{ minWidth: '200px' }}>
        <label className="rf-label">Location</label>
        <select
          value={location}
          onChange={(e) => { setLocation(e.target.value); sync({ location: e.target.value }); }}
          className="rf-select"
          onClick={(e) => e.stopPropagation()}
        >
          {LOCATIONS.map(l => <option key={l} value={l}>{label(l)}</option>)}
        </select>

        <label className="rf-label mt-1.5">Lighting</label>
        <select
          value={lighting}
          onChange={(e) => { setLighting(e.target.value); sync({ lighting: e.target.value }); }}
          className="rf-select"
          onClick={(e) => e.stopPropagation()}
        >
          {LIGHTING.map(l => <option key={l} value={l}>{label(l)}</option>)}
        </select>

        <label className="rf-label mt-1.5">Camera</label>
        <select
          value={cameraAngle}
          onChange={(e) => { setCameraAngle(e.target.value); sync({ camera_angle: e.target.value }); }}
          className="rf-select"
          onClick={(e) => e.stopPropagation()}
        >
          {CAMERA_ANGLES.map(c => <option key={c} value={c}>{label(c)}</option>)}
        </select>

        <label className="rf-label mt-1.5">Vibe</label>
        <select
          value={vibe}
          onChange={(e) => { setVibe(e.target.value); sync({ vibe: e.target.value }); }}
          className="rf-select"
          onClick={(e) => e.stopPropagation()}
        >
          {VIBES.map(v => <option key={v} value={v}>{label(v)}</option>)}
        </select>

        <label className="rf-label mt-1.5">Details</label>
        <textarea
          value={customDetails}
          onChange={(e) => { setCustomDetails(e.target.value); sync({ custom_details: e.target.value }); }}
          placeholder="Extra setting details..."
          className="rf-textarea"
          style={{ minHeight: '50px' }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

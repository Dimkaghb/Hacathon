/**
 * Plugin System Types
 * 
 * This module defines the type system for the FlowGen plugin architecture.
 * Plugins can add new node types, processing capabilities, and workflow modifications.
 */

import { NodeProps } from '@xyflow/react';

// ============================================
// Plugin Manifest Types
// ============================================

/**
 * Handle definition for a node's input/output points
 */
export interface HandleDefinition {
  id: string;
  type: 'input' | 'output';
  label?: string;
  dataType?: string; // e.g., 'image', 'video', 'prompt', 'any'
}

/**
 * Node type definition within a plugin
 */
export interface PluginNodeType {
  id: string;
  displayName: string;
  description?: string;
  icon?: string; // Icon name from @tabler/icons-react
  category: 'input' | 'processing' | 'output' | 'utility';
  handles: HandleDefinition[];
  defaultData?: Record<string, any>;
}

/**
 * Backend processor definition
 */
export interface PluginProcessor {
  jobType: string;
  endpoint?: string; // Custom API endpoint for processing
  supportsAsync: boolean;
}

/**
 * Plugin manifest - the main configuration file for a plugin
 */
export interface PluginManifest {
  // Metadata
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  
  // Capabilities
  nodeTypes: PluginNodeType[];
  processors?: PluginProcessor[];
  
  // Assets
  frontend?: {
    componentPath?: string; // Path to the React component module
    stylePath?: string;     // Optional CSS path
  };
  
  backend?: {
    processorModule?: string; // Python module path for backend processing
  };
  
  // Dependencies
  dependencies?: string[]; // Other plugin IDs this plugin depends on
  
  // Permissions
  permissions?: string[]; // Required permissions (e.g., 'network', 'storage')
}

// ============================================
// Runtime Plugin Types
// ============================================

/**
 * Status of a loaded plugin
 */
export type PluginStatus = 'loading' | 'active' | 'disabled' | 'error';

/**
 * A loaded plugin with its runtime state
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  error?: string;
  loadedAt: Date;
  
  // Runtime components
  nodeComponents?: Map<string, React.ComponentType<NodeProps>>;
}

/**
 * Plugin event types for the event system
 */
export type PluginEventType = 
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:error'
  | 'plugin:enabled'
  | 'plugin:disabled';

/**
 * Plugin event payload
 */
export interface PluginEvent {
  type: PluginEventType;
  pluginId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Plugin registry state
 */
export interface PluginRegistryState {
  plugins: Map<string, LoadedPlugin>;
  nodeTypes: Map<string, string>; // nodeTypeId -> pluginId
  loading: boolean;
  error?: string;
}

// ============================================
// Plugin API Types
// ============================================

/**
 * Response from the backend plugin list endpoint
 */
export interface PluginListResponse {
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    status: PluginStatus;
    manifest: PluginManifest;
  }>;
}

/**
 * Request to register a new plugin
 */
export interface PluginRegisterRequest {
  manifestUrl?: string;
  manifest?: PluginManifest;
  enabled?: boolean;
}

/**
 * Response from plugin registration
 */
export interface PluginRegisterResponse {
  success: boolean;
  pluginId: string;
  message?: string;
}

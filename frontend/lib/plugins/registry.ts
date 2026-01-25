/**
 * Plugin Registry
 * 
 * Central registry for managing plugins in the FlowGen application.
 * Handles loading, unloading, and providing access to plugin components.
 */

import React from 'react';
import { NodeProps } from '@xyflow/react';
import {
  PluginManifest,
  LoadedPlugin,
  PluginStatus,
  PluginEvent,
  PluginEventType,
  PluginNodeType,
} from './types';

// Storage key for persisted plugin state
const PLUGINS_STORAGE_KEY = 'flowgen-plugins';
const ENABLED_PLUGINS_KEY = 'flowgen-enabled-plugins';

type PluginEventListener = (event: PluginEvent) => void;

/**
 * Plugin Registry Class
 * 
 * Manages the lifecycle of plugins including:
 * - Loading plugins from manifests
 * - Registering node types
 * - Enabling/disabling plugins
 * - Event notifications
 */
class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private nodeTypeToPlugin: Map<string, string> = new Map();
  private eventListeners: Set<PluginEventListener> = new Set();
  private enabledPlugins: Set<string> = new Set();

  constructor() {
    // Load enabled plugins from storage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ENABLED_PLUGINS_KEY);
      if (stored) {
        try {
          const enabled = JSON.parse(stored);
          this.enabledPlugins = new Set(enabled);
        } catch (e) {
          console.error('Failed to load enabled plugins from storage:', e);
        }
      }
    }
  }

  /**
   * Register an event listener for plugin events
   */
  addEventListener(listener: PluginEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit a plugin event to all listeners
   */
  private emitEvent(type: PluginEventType, pluginId: string, data?: any): void {
    const event: PluginEvent = {
      type,
      pluginId,
      timestamp: new Date(),
      data,
    };
    
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Plugin event listener error:', e);
      }
    });
  }

  /**
   * Load a plugin from its manifest
   */
  async loadPlugin(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id;
    
    // Check if already loaded
    if (this.plugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is already loaded`);
      return;
    }

    const loadedPlugin: LoadedPlugin = {
      manifest,
      status: 'loading',
      loadedAt: new Date(),
      nodeComponents: new Map(),
    };

    this.plugins.set(pluginId, loadedPlugin);

    try {
      // Register node types
      for (const nodeType of manifest.nodeTypes) {
        this.nodeTypeToPlugin.set(nodeType.id, pluginId);
      }

      // Update status based on enabled state
      loadedPlugin.status = this.enabledPlugins.has(pluginId) ? 'active' : 'disabled';
      
      this.emitEvent('plugin:loaded', pluginId, { manifest });
      console.log(`Plugin loaded: ${manifest.name} v${manifest.version}`);
    } catch (error) {
      loadedPlugin.status = 'error';
      loadedPlugin.error = error instanceof Error ? error.message : 'Unknown error';
      this.emitEvent('plugin:error', pluginId, { error: loadedPlugin.error });
      throw error;
    }
  }

  /**
   * Load a plugin from a manifest URL
   */
  async loadPluginFromUrl(manifestUrl: string): Promise<void> {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const manifest: PluginManifest = await response.json();
      await this.loadPlugin(manifest);
    } catch (error) {
      console.error('Failed to load plugin from URL:', error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  unloadPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} is not loaded`);
      return;
    }

    // Remove node type mappings
    for (const nodeType of plugin.manifest.nodeTypes) {
      this.nodeTypeToPlugin.delete(nodeType.id);
    }

    this.plugins.delete(pluginId);
    this.emitEvent('plugin:unloaded', pluginId);
    console.log(`Plugin unloaded: ${plugin.manifest.name}`);
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} is not loaded`);
      return;
    }

    if (plugin.status === 'active') return;

    plugin.status = 'active';
    this.enabledPlugins.add(pluginId);
    this.persistEnabledPlugins();
    this.emitEvent('plugin:enabled', pluginId);
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} is not loaded`);
      return;
    }

    if (plugin.status === 'disabled') return;

    plugin.status = 'disabled';
    this.enabledPlugins.delete(pluginId);
    this.persistEnabledPlugins();
    this.emitEvent('plugin:disabled', pluginId);
  }

  /**
   * Toggle a plugin's enabled state
   */
  togglePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (plugin.status === 'active') {
      this.disablePlugin(pluginId);
    } else if (plugin.status === 'disabled') {
      this.enablePlugin(pluginId);
    }
  }

  /**
   * Persist enabled plugins to storage
   */
  private persistEnabledPlugins(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        ENABLED_PLUGINS_KEY,
        JSON.stringify(Array.from(this.enabledPlugins))
      );
    }
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.status === 'active';
  }

  /**
   * Get all active node types from enabled plugins
   */
  getActiveNodeTypes(): PluginNodeType[] {
    const nodeTypes: PluginNodeType[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active') {
        nodeTypes.push(...plugin.manifest.nodeTypes);
      }
    }
    
    return nodeTypes;
  }

  /**
   * Get the plugin ID for a given node type
   */
  getPluginForNodeType(nodeTypeId: string): string | undefined {
    return this.nodeTypeToPlugin.get(nodeTypeId);
  }

  /**
   * Register a custom node component for a plugin
   */
  registerNodeComponent(
    pluginId: string,
    nodeTypeId: string,
    component: React.ComponentType<NodeProps>
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Cannot register component: Plugin ${pluginId} not found`);
      return;
    }

    if (!plugin.nodeComponents) {
      plugin.nodeComponents = new Map();
    }
    
    plugin.nodeComponents.set(nodeTypeId, component);
  }

  /**
   * Get a node component from a plugin
   */
  getNodeComponent(nodeTypeId: string): React.ComponentType<NodeProps> | undefined {
    const pluginId = this.nodeTypeToPlugin.get(nodeTypeId);
    if (!pluginId) return undefined;

    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') return undefined;

    return plugin.nodeComponents?.get(nodeTypeId);
  }

  /**
   * Get all registered node types as a React Flow nodeTypes object
   * This merges plugin node types with the base node types
   */
  getNodeTypesForReactFlow(): Record<string, React.ComponentType<NodeProps>> {
    const nodeTypes: Record<string, React.ComponentType<NodeProps>> = {};
    
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active' && plugin.nodeComponents) {
        for (const [nodeTypeId, component] of plugin.nodeComponents) {
          nodeTypes[nodeTypeId] = component;
        }
      }
    }
    
    return nodeTypes;
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();

export default pluginRegistry;

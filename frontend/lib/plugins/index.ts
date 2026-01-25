/**
 * Plugin System - Main Export
 * 
 * Re-exports all plugin system components for easy importing.
 */

export * from './types';
export * from './registry';
export * from './hooks';

// Default exports
export { pluginRegistry } from './registry';
export { hooks } from './hooks';

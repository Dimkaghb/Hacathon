/**
 * Plugin Hooks System
 * 
 * Provides extension points for plugins to intercept and modify core workflows.
 * Based on a priority-based hook system similar to WordPress actions/filters.
 */

// ============================================
// Hook Types
// ============================================

/**
 * Available hook points in the application
 */
export type HookType =
  // Node lifecycle hooks
  | 'beforeNodeCreate'
  | 'afterNodeCreate'
  | 'beforeNodeUpdate'
  | 'afterNodeUpdate'
  | 'beforeNodeDelete'
  | 'afterNodeDelete'
  
  // Connection lifecycle hooks
  | 'beforeConnect'
  | 'afterConnect'
  | 'beforeDisconnect'
  | 'afterDisconnect'
  
  // Video generation hooks
  | 'beforeVideoGenerate'
  | 'afterVideoGenerate'
  | 'beforeVideoExtend'
  | 'afterVideoExtend'
  
  // Canvas hooks
  | 'beforeCanvasLoad'
  | 'afterCanvasLoad'
  | 'beforeCanvasSave'
  | 'afterCanvasSave'
  
  // Processing hooks
  | 'beforeJobStart'
  | 'afterJobComplete'
  | 'onJobProgress'
  | 'onJobError';

/**
 * Hook callback function type
 * Returns the modified data or undefined to skip modification
 */
export type HookCallback<T = any> = (data: T) => T | Promise<T> | void | Promise<void>;

/**
 * Registered hook with metadata
 */
interface RegisteredHook {
  id: string;
  pluginId?: string;
  callback: HookCallback;
  priority: number;
}

/**
 * Hook context passed to callbacks
 */
export interface HookContext<T = any> {
  hookType: HookType;
  data: T;
  pluginId?: string;
  timestamp: Date;
}

// ============================================
// Hook System Class
// ============================================

class HookSystem {
  private hooks: Map<HookType, RegisteredHook[]> = new Map();
  private hookIdCounter = 0;

  /**
   * Register a hook callback
   * 
   * @param hookType - The hook point to register for
   * @param callback - The callback function to execute
   * @param priority - Lower numbers execute first (default: 10)
   * @param pluginId - Optional plugin ID for attribution
   * @returns A function to unregister the hook
   */
  register<T = any>(
    hookType: HookType,
    callback: HookCallback<T>,
    priority: number = 10,
    pluginId?: string
  ): () => void {
    const hookId = `hook_${++this.hookIdCounter}`;
    
    const registeredHook: RegisteredHook = {
      id: hookId,
      pluginId,
      callback: callback as HookCallback,
      priority,
    };

    if (!this.hooks.has(hookType)) {
      this.hooks.set(hookType, []);
    }

    const hooks = this.hooks.get(hookType)!;
    hooks.push(registeredHook);
    
    // Sort by priority
    hooks.sort((a, b) => a.priority - b.priority);

    console.log(`[Hooks] Registered ${hookType} hook from ${pluginId || 'core'} with priority ${priority}`);

    // Return unregister function
    return () => {
      const idx = hooks.findIndex(h => h.id === hookId);
      if (idx !== -1) {
        hooks.splice(idx, 1);
        console.log(`[Hooks] Unregistered ${hookType} hook ${hookId}`);
      }
    };
  }

  /**
   * Trigger a hook and get the result
   * Hooks are executed in priority order, each receiving the output of the previous
   * 
   * @param hookType - The hook point to trigger
   * @param data - The initial data to pass through hooks
   * @returns The final data after all hooks have processed it
   */
  async trigger<T = any>(hookType: HookType, data: T): Promise<T> {
    const hooks = this.hooks.get(hookType) || [];
    
    if (hooks.length === 0) {
      return data;
    }

    let result = data;

    for (const hook of hooks) {
      try {
        const hookResult = await hook.callback(result);
        
        // If callback returns a value, use it; otherwise keep current result
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`[Hooks] Error in ${hookType} hook from ${hook.pluginId || 'core'}:`, error);
        // Continue with other hooks even if one fails
      }
    }

    return result;
  }

  /**
   * Trigger a hook without waiting for result (fire and forget)
   * Useful for notification-style hooks like 'afterNodeCreate'
   * 
   * @param hookType - The hook point to trigger
   * @param data - The data to pass to hooks
   */
  triggerAsync<T = any>(hookType: HookType, data: T): void {
    const hooks = this.hooks.get(hookType) || [];
    
    for (const hook of hooks) {
      try {
        const result = hook.callback(data);
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[Hooks] Async error in ${hookType} hook from ${hook.pluginId || 'core'}:`, error);
          });
        }
      } catch (error) {
        console.error(`[Hooks] Error in ${hookType} hook from ${hook.pluginId || 'core'}:`, error);
      }
    }
  }

  /**
   * Check if any hooks are registered for a hook type
   */
  hasHooks(hookType: HookType): boolean {
    const hooks = this.hooks.get(hookType);
    return hooks !== undefined && hooks.length > 0;
  }

  /**
   * Get the number of registered hooks for a hook type
   */
  getHookCount(hookType: HookType): number {
    return this.hooks.get(hookType)?.length || 0;
  }

  /**
   * Remove all hooks registered by a specific plugin
   */
  removePluginHooks(pluginId: string): void {
    for (const [hookType, hooks] of this.hooks) {
      const filtered = hooks.filter(h => h.pluginId !== pluginId);
      if (filtered.length !== hooks.length) {
        this.hooks.set(hookType, filtered);
        console.log(`[Hooks] Removed ${hooks.length - filtered.length} ${hookType} hooks from plugin ${pluginId}`);
      }
    }
  }

  /**
   * Clear all registered hooks
   */
  clear(): void {
    this.hooks.clear();
    console.log('[Hooks] All hooks cleared');
  }

  /**
   * Get debug info about registered hooks
   */
  getDebugInfo(): Record<HookType, { count: number; plugins: string[] }> {
    const info: Record<string, { count: number; plugins: string[] }> = {};
    
    for (const [hookType, hooks] of this.hooks) {
      info[hookType] = {
        count: hooks.length,
        plugins: [...new Set(hooks.map(h => h.pluginId || 'core'))],
      };
    }
    
    return info as Record<HookType, { count: number; plugins: string[] }>;
  }
}

// Export singleton instance
export const hooks = new HookSystem();

// ============================================
// Convenience Functions
// ============================================

/**
 * Register a hook (convenience wrapper)
 */
export function registerHook<T = any>(
  hookType: HookType,
  callback: HookCallback<T>,
  priority?: number,
  pluginId?: string
): () => void {
  return hooks.register(hookType, callback, priority, pluginId);
}

/**
 * Trigger a hook and wait for result (convenience wrapper)
 */
export function triggerHook<T = any>(hookType: HookType, data: T): Promise<T> {
  return hooks.trigger(hookType, data);
}

/**
 * Trigger a hook without waiting (convenience wrapper)
 */
export function triggerHookAsync<T = any>(hookType: HookType, data: T): void {
  hooks.triggerAsync(hookType, data);
}

export default hooks;

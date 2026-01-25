"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { tokenStorage } from '../api';
import { Node, Connection as BackendConnection } from '../types/node';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Message types from backend
export type WebSocketMessageType = 
  | 'connected'
  | 'pong'
  | 'node_update'
  | 'connection_created'
  | 'connection_deleted'
  | 'job_progress'
  | 'cursor_move'
  | 'node_select'
  | 'user_disconnected';

export interface Collaborator {
  userId: string;
  cursor?: { x: number; y: number };
  selectedNodeId?: string | null;
  color: string;
  name?: string;
}

export interface NodeUpdateMessage {
  type: 'node_update';
  node_id: string;
  update_type: 'created' | 'updated' | 'deleted';
  data: Node;
}

export interface ConnectionMessage {
  type: 'connection_created' | 'connection_deleted';
  connection_id: string;
  data?: BackendConnection;
}

export interface JobProgressMessage {
  type: 'job_progress';
  node_id: string;
  progress: number;
  status: string;
  message: string;
}

export interface CursorMoveMessage {
  type: 'cursor_move';
  user_id: string;
  x: number;
  y: number;
}

export interface NodeSelectMessage {
  type: 'node_select';
  user_id: string;
  node_id: string | null;
}

export interface UserDisconnectedMessage {
  type: 'user_disconnected';
  user_id: string;
}

export type WebSocketMessage = 
  | NodeUpdateMessage 
  | ConnectionMessage 
  | JobProgressMessage 
  | CursorMoveMessage 
  | NodeSelectMessage 
  | UserDisconnectedMessage
  | { type: 'connected'; project_id: string; user_id: string; is_guest?: boolean }
  | { type: 'pong' };

// Generate a random color for collaborator cursors
const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

function getColorForUser(userId: string): string {
  // Simple hash to get consistent color for user
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

interface UseProjectWebSocketOptions {
  shareToken?: string | null; // Share token for accessing shared projects
  onNodeUpdate?: (message: NodeUpdateMessage) => void;
  onConnectionCreated?: (message: ConnectionMessage) => void;
  onConnectionDeleted?: (message: ConnectionMessage) => void;
  onJobProgress?: (message: JobProgressMessage) => void;
  onCursorMove?: (message: CursorMoveMessage) => void;
  onNodeSelect?: (message: NodeSelectMessage) => void;
  onUserDisconnected?: (message: UserDisconnectedMessage) => void;
}

export function useProjectWebSocket(
  projectId: string | null,
  options: UseProjectWebSocketOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  // Store callbacks in refs to avoid reconnection on callback changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!projectId) return;
    
    const token = tokenStorage.getAccessToken() || 'guest';
    const shareToken = optionsRef.current.shareToken;
    
    // Allow connection with either auth token or share token
    if (token === 'guest' && !shareToken) {
      console.warn('No access token or share token available for WebSocket connection');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Build WebSocket URL with optional share token
    let wsUrl = `${WS_BASE_URL}/ws/projects/${projectId}?token=${token}`;
    if (shareToken) {
      wsUrl += `&share=${shareToken}`;
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] Connected to project:', projectId);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            setCurrentUserId(message.user_id);
            setIsGuest(message.is_guest || false);
            break;

          case 'pong':
            // Connection alive confirmation
            break;

          case 'node_update':
            optionsRef.current.onNodeUpdate?.(message as NodeUpdateMessage);
            break;

          case 'connection_created':
            optionsRef.current.onConnectionCreated?.(message as ConnectionMessage);
            break;

          case 'connection_deleted':
            optionsRef.current.onConnectionDeleted?.(message as ConnectionMessage);
            break;

          case 'job_progress':
            optionsRef.current.onJobProgress?.(message as JobProgressMessage);
            break;

          case 'cursor_move':
            const cursorMsg = message as CursorMoveMessage;
            // Don't update our own cursor
            if (cursorMsg.user_id !== currentUserId) {
              setCollaborators(prev => {
                const updated = new Map(prev);
                const existing = updated.get(cursorMsg.user_id) || {
                  userId: cursorMsg.user_id,
                  color: getColorForUser(cursorMsg.user_id),
                };
                updated.set(cursorMsg.user_id, {
                  ...existing,
                  cursor: { x: cursorMsg.x, y: cursorMsg.y },
                });
                return updated;
              });
              optionsRef.current.onCursorMove?.(cursorMsg);
            }
            break;

          case 'node_select':
            const selectMsg = message as NodeSelectMessage;
            if (selectMsg.user_id !== currentUserId) {
              setCollaborators(prev => {
                const updated = new Map(prev);
                const existing = updated.get(selectMsg.user_id) || {
                  userId: selectMsg.user_id,
                  color: getColorForUser(selectMsg.user_id),
                };
                updated.set(selectMsg.user_id, {
                  ...existing,
                  selectedNodeId: selectMsg.node_id,
                });
                return updated;
              });
              optionsRef.current.onNodeSelect?.(selectMsg);
            }
            break;

          case 'user_disconnected':
            const disconnectMsg = message as UserDisconnectedMessage;
            setCollaborators(prev => {
              const updated = new Map(prev);
              updated.delete(disconnectMsg.user_id);
              return updated;
            });
            optionsRef.current.onUserDisconnected?.(disconnectMsg);
            break;
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      setIsConnected(false);

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Attempt reconnection if not a deliberate close
      if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(`[WebSocket] Attempting reconnect ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      }
    };

    wsRef.current = ws;
  }, [projectId, currentUserId]);

  // Connect on mount and project change
  useEffect(() => {
    connect();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  // Send cursor position
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        x,
        y,
      }));
    }
  }, []);

  // Send node selection
  const sendNodeSelect = useCallback((nodeId: string | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'node_select',
        node_id: nodeId,
      }));
    }
  }, []);

  // Manually reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    isConnected,
    isGuest,
    collaborators: Array.from(collaborators.values()),
    currentUserId,
    sendCursorPosition,
    sendNodeSelect,
    reconnect,
  };
}

export default useProjectWebSocket;

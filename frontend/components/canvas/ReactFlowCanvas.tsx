"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  BackgroundVariant,
  Node as RFNode,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Connection,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles/canvas.css';

import { Node, Connection as BackendConnection } from '@/lib/types/node';
import { nodesApi, connectionsApi, aiApi } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { FloatingDock } from '@/components/ui/floating-dock';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { ShareButton } from '@/components/ui/ShareButton';
import { useProjectWebSocket, JobProgressMessage, NodeUpdateMessage, CursorMoveMessage } from '@/lib/hooks/useProjectWebSocket';
import { IconPhoto, IconMessageCircle, IconVideo, IconBox, IconAspectRatio, IconCameraRotate, IconPlayerTrackNext, IconWifi, IconWifiOff } from '@tabler/icons-react';

interface ReactFlowCanvasProps {
  projectId: string;
  shareToken?: string | null;
}

export default function ReactFlowCanvas({ projectId, shareToken }: ReactFlowCanvasProps) {
  const { isAuthenticated } = useAuth();

  // React Flow state (UI)
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Backend state (source of truth)
  const [backendNodes, setBackendNodes] = useState<Node[]>([]);
  const [backendConnections, setBackendConnections] = useState<BackendConnection[]>([]);

  // Refs to always access latest state values (fixes stale closure in callbacks)
  const backendNodesRef = useRef<Node[]>([]);
  const backendConnectionsRef = useRef<BackendConnection[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    backendNodesRef.current = backendNodes;
  }, [backendNodes]);

  useEffect(() => {
    backendConnectionsRef.current = backendConnections;
  }, [backendConnections]);

  // Job polling - use ref to avoid recreating callbacks
  const jobPollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [, forceUpdate] = useState({});

  // Debounce timers
  const positionUpdateTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [loading, setLoading] = useState(true);

  // Refs for WebSocket callback functions (to avoid stale closures)
  const updateNodeDataRef = useRef<((nodeId: string, data: Record<string, any>, status?: 'idle' | 'processing' | 'completed' | 'failed', errorMessage?: string) => void) | null>(null);
  const shareTokenRef = useRef(shareToken);
  shareTokenRef.current = shareToken;
  
  // WebSocket handlers using refs
  const handleWsJobProgress = useCallback((message: JobProgressMessage) => {
    console.log('[WebSocket] Job progress:', message);
    
    const updateFn = updateNodeDataRef.current;
    if (!updateFn) return;
    
    if (message.status === 'completed') {
      // Fetch full node data since WebSocket message may not have all details
      nodesApi.get(projectId, message.node_id, shareTokenRef.current).then(node => {
        updateFn(
          message.node_id,
          {
            ...node.data,
            progress: 100,
            progress_message: 'Video ready',
          },
          'completed'
        );
      }).catch(err => {
        console.error('Failed to fetch completed node:', err);
        updateFn(message.node_id, { progress: 100, progress_message: 'Video ready' }, 'completed');
      });
      
      // Clear any polling for this node
      jobPollingRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
    } else if (message.status === 'failed') {
      updateFn(
        message.node_id,
        {
          progress: message.progress,
          progress_message: message.message || 'Generation failed',
        },
        'failed',
        message.message
      );
    } else {
      // Processing
      updateFn(
        message.node_id,
        {
          progress: message.progress,
          progress_message: message.message || `Processing... ${message.progress}%`,
        },
        'processing'
      );
    }
  }, [projectId]);

  const handleWsNodeUpdate = useCallback((message: NodeUpdateMessage) => {
    console.log('[WebSocket] Node update:', message);
    
    if (message.update_type === 'updated') {
      // Update local state with the new node data
      setBackendNodes(prev => 
        prev.map(n => n.id === message.node_id ? { ...n, ...message.data } : n)
      );
    } else if (message.update_type === 'deleted') {
      setBackendNodes(prev => prev.filter(n => n.id !== message.node_id));
      setNodes(prev => prev.filter(n => n.id !== message.node_id));
    } else if (message.update_type === 'created') {
      // Add the new node from the message data
      if (message.data) {
        setBackendNodes(prev => [...prev, message.data]);
        // Transform and add to React Flow
        setNodes(prev => [
          ...prev,
          {
            id: message.data.id,
            type: message.data.type,
            position: { x: message.data.position_x, y: message.data.position_y },
            data: {
              data: message.data.data,
              status: message.data.status,
              error_message: message.data.error_message,
            },
          },
        ]);
      }
    }
  }, []);

  // WebSocket connection for real-time collaboration
  const { 
    isConnected: wsConnected, 
    collaborators,
    sendCursorPosition,
    sendNodeSelect,
  } = useProjectWebSocket(projectId, {
    shareToken,
    onJobProgress: handleWsJobProgress,
    onNodeUpdate: handleWsNodeUpdate,
  });

  // Helper function to get connected data (no useCallback to avoid circular deps)
  // Flexible: extracts data from any connected node based on what data is available
  const getConnectedData = (nodeId: string, nodes: Node[], connections: BackendConnection[]) => {
    const nodeConnections = connections.filter(c => c.target_node_id === nodeId);

    let prompt = '';
    let imageUrl = '';
    let videoData: {
      video_url: string;
      veo_video_uri?: string;
      veo_video_name?: string;
      extension_count?: number;
    } | null = null;

    for (const connection of nodeConnections) {
      const sourceNode = nodes.find(n => n.id === connection.source_node_id);
      if (!sourceNode) continue;

      // Extract prompt data from any node that has it
      if (sourceNode.data?.prompt && !prompt) {
        prompt = sourceNode.data.prompt;
      }
      
      // Extract image data from any node that has it
      if (sourceNode.data?.image_url && !imageUrl) {
        imageUrl = sourceNode.data.image_url;
      }

      // Extract video data for extension nodes (from video or extension nodes)
      if (sourceNode.data?.video_url && sourceNode.data?.veo_video_uri && !videoData) {
        videoData = {
          video_url: sourceNode.data.video_url,
          veo_video_uri: sourceNode.data.veo_video_uri,
          veo_video_name: sourceNode.data.veo_video_name,
          extension_count: sourceNode.data.extension_count || 0,
        };
      }
    }

    return { prompt, imageUrl, videoData };
  };

  // Transform backend nodes to React Flow nodes (no useCallback to avoid circular deps)
  const transformBackendNodesToRF = (nodes: Node[], connections: BackendConnection[]): RFNode[] => {
    return nodes.map(node => {
      const connectedData = (node.type === 'video' || node.type === 'extension') 
        ? getConnectedData(node.id, nodes, connections) 
        : null;
      
      return {
        id: node.id,
        type: node.type,
        position: { x: node.position_x, y: node.position_y },
        data: {
          data: node.data,
          status: node.status,
          error_message: node.error_message,
          // Callbacks
          onUpdate: (data: Record<string, any>) => handleNodeUpdate(node.id, data),
          onDelete: () => handleNodeDelete(node.id),
          onGenerate: node.type === 'video' ? () => handleGenerateVideo(node.id) : undefined,
          onExtend: node.type === 'extension' ? () => handleExtendVideo(node.id) : undefined,
          // Connected data for video nodes
          connectedPrompt: connectedData?.prompt,
          connectedImageUrl: connectedData?.imageUrl,
          // Connected data for extension nodes
          connectedVideo: node.type === 'extension' ? connectedData?.videoData : undefined,
        },
      };
    });
  };

  // Transform backend connections to React Flow edges
  const transformBackendConnectionsToRF = (connections: BackendConnection[]): Edge[] => {
    return connections.map(conn => ({
      id: conn.id,
      source: conn.source_node_id,
      target: conn.target_node_id,
      sourceHandle: conn.source_handle || null,
      targetHandle: conn.target_handle || null,
      type: 'custom',
      data: { backendId: conn.id },
    }));
  };

  // Update video/extension node connected data - accepts optional connections to avoid stale closure
  const updateVideoNodeConnectedData = useCallback((
    nodeId: string, 
    nodesOverride?: Node[], 
    connectionsOverride?: BackendConnection[]
  ) => {
    const nodesToUse = nodesOverride || backendNodes;
    const connectionsToUse = connectionsOverride || backendConnections;
    const { prompt, imageUrl, videoData } = getConnectedData(nodeId, nodesToUse, connectionsToUse);
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== nodeId) return n;
        
        if (n.type === 'video') {
          return { ...n, data: { ...n.data, connectedPrompt: prompt, connectedImageUrl: imageUrl } };
        }
        
        if (n.type === 'extension') {
          return { ...n, data: { ...n.data, connectedPrompt: prompt, connectedVideo: videoData } };
        }
        
        return n;
      })
    );
  }, [backendNodes, backendConnections]);

  // Update node data in both backend and React Flow state
  const updateNodeData = useCallback((
    nodeId: string,
    data: Record<string, any>,
    status?: 'idle' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ) => {
    // Update backend state
    setBackendNodes(prev =>
      prev.map(n =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, ...data },
              status: status || n.status,
              error_message: errorMessage !== undefined ? errorMessage : n.error_message,
            }
          : n
      )
    );

    // Update React Flow state
    setNodes(nds =>
      nds.map(n =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                data: { ...(n.data?.data || {}), ...data },
                status: status || n.data?.status,
                error_message: errorMessage !== undefined ? errorMessage : n.data?.error_message,
              },
            }
          : n
      )
    );
  }, []);

  // Keep the updateNodeData ref current for WebSocket callbacks
  useEffect(() => {
    updateNodeDataRef.current = updateNodeData;
  }, [updateNodeData]);

  // Start job polling
  const startJobPolling = useCallback((jobId: string, nodeId: string) => {
    const poll = async () => {
      try {
        const status = await aiApi.getJobStatus(jobId);

        console.log('Job status update:', {
          jobId,
          nodeId,
          status: status.status,
          progress: status.progress,
          stage: status.stage,
        });

        if (status.status === 'completed') {
          const videoUrl = status.result?.video_url ||
                         (typeof status.result === 'string' ? status.result : null);

          updateNodeData(
            nodeId,
            {
              video_url: videoUrl,
              progress: 100,
              progress_message: 'Video ready',
              ...(status.result && typeof status.result === 'object' ? status.result : {}),
            },
            'completed'
          );

          // Stop polling
          const timeout = jobPollingRef.current.get(jobId);
          if (timeout) {
            clearTimeout(timeout);
            jobPollingRef.current.delete(jobId);
          }
        } else if (status.status === 'failed') {
          updateNodeData(
            nodeId,
            {
              progress: status.progress,
              progress_message: status.error || 'Generation failed',
            },
            'failed',
            status.error
          );

          // Stop polling
          const timeout = jobPollingRef.current.get(jobId);
          if (timeout) {
            clearTimeout(timeout);
            jobPollingRef.current.delete(jobId);
          }
        } else {
          // Continue polling
          updateNodeData(
            nodeId,
            {
              progress: status.progress,
              progress_message: status.progress_message || `Processing... ${status.progress}%`,
              stage: status.stage,
            },
            'processing'
          );

          const timeout = setTimeout(poll, 3000);
          jobPollingRef.current.set(jobId, timeout);
        }
      } catch (error: any) {
        console.error('Failed to poll job status:', error);

        // If 404, job doesn't exist - stop polling
        if (error?.status === 404) {
          console.warn(`Job ${jobId} not found, stopping polling`);
          const timeout = jobPollingRef.current.get(jobId);
          if (timeout) {
            clearTimeout(timeout);
            jobPollingRef.current.delete(jobId);
          }
          updateNodeData(nodeId, { progress_message: 'Job not found (may have been deleted)' }, 'idle');
        } else {
          // Continue polling with longer interval on error
          updateNodeData(nodeId, {
            progress_message: `Polling error: ${error?.message || 'Unknown error'}`,
            stage: 'error',
          });

          const timeout = setTimeout(poll, 10000);
          jobPollingRef.current.set(jobId, timeout);
        }
      }
    };

    const initialTimeout = setTimeout(poll, 2000);
    jobPollingRef.current.set(jobId, initialTimeout);
  }, [updateNodeData]);

  // Load nodes and connections
  const loadNodesAndConnections = useCallback(async () => {
    try {
      setLoading(true);
      const [nodesData, connectionsData] = await Promise.all([
        nodesApi.list(projectId, shareToken),
        connectionsApi.list(projectId, shareToken),
      ]);

      // Cast API response to match our Node type (API returns type as string)
      setBackendNodes(nodesData as Node[]);
      setBackendConnections(connectionsData as BackendConnection[]);

      // Transform to React Flow format (call functions directly, not from closure)
      setNodes(transformBackendNodesToRF(nodesData as Node[], connectionsData as BackendConnection[]));
      setEdges(transformBackendConnectionsToRF(connectionsData as BackendConnection[]));

      // Resume polling for processing jobs
      const processingNodes = nodesData.filter(n => n.status === 'processing');
      for (const node of processingNodes) {
        try {
          const latestJob = await aiApi.getLatestJobForNode(node.id);
          if (latestJob && (latestJob.status === 'processing' || latestJob.status === 'pending')) {
            console.log(`Resuming polling for job ${latestJob.job_id} on node ${node.id}`);
            startJobPolling(latestJob.job_id, node.id);
          } else if (latestJob && latestJob.status === 'completed') {
            // Update node with completed status
            const videoUrl = latestJob.result?.video_url ||
                           (typeof latestJob.result === 'string' ? latestJob.result : null);
            updateNodeData(
              node.id,
              {
                video_url: videoUrl,
                ...(latestJob.result && typeof latestJob.result === 'object' ? latestJob.result : {}),
              },
              'completed'
            );
          } else if (latestJob && latestJob.status === 'failed') {
            updateNodeData(node.id, {}, 'failed', latestJob.error || 'Generation failed');
          }
        } catch (error) {
          console.error(`Failed to check job for node ${node.id}:`, error);
          updateNodeData(node.id, {}, 'idle');
        }
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, startJobPolling, updateNodeData]);

  // Load on mount
  useEffect(() => {
    if (!isAuthenticated || !projectId) return;
    loadNodesAndConnections();
  }, [isAuthenticated, projectId, loadNodesAndConnections]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      jobPollingRef.current.forEach(timeout => clearTimeout(timeout));
      positionUpdateTimers.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Handle node changes with debounced position updates
  const handleNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Detect position changes and debounce API calls
    changes.forEach(change => {
      if (change.type === 'position' && change.position && !change.dragging) {
        const nodeId = change.id;
        const { x, y } = change.position;

        // Clear existing timer
        const existingTimer = positionUpdateTimers.current.get(nodeId);
        if (existingTimer) clearTimeout(existingTimer);

        // Set new debounced timer
        const timer = setTimeout(() => {
          nodesApi.update(projectId, nodeId, { position_x: x, position_y: y }, shareTokenRef.current);
          positionUpdateTimers.current.delete(nodeId);
        }, 500);

        positionUpdateTimers.current.set(nodeId, timer);
      }
    });
  }, [onNodesChange, projectId]);

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  // Handle connection creation
  const handleConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    // Validate: no self-connections
    if (connection.source === connection.target) return;

    // Get source and target nodes for validation
    const sourceNode = backendNodes.find(n => n.id === connection.source);
    const targetNode = backendNodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return;

    // Allow flexible connections - any source can connect to any target handle
    // The video node will use whatever data is available from connected nodes

    // Validate: no duplicate connections to the same handle
    const exists = edges.some(
      e => e.source === connection.source && 
           e.target === connection.target &&
           e.sourceHandle === connection.sourceHandle &&
           e.targetHandle === connection.targetHandle
    );
    if (exists) return;

    // Validate: no multiple connections to the same input handle (each video input accepts one connection)
    const handleAlreadyConnected = edges.some(
      e => e.target === connection.target && e.targetHandle === connection.targetHandle
    );
    if (handleAlreadyConnected) {
      console.warn('This input handle already has a connection');
      return;
    }

    try {
      // Create in backend
      const newConnection = await connectionsApi.create(projectId, {
        source_node_id: connection.source,
        target_node_id: connection.target,
        source_handle: connection.sourceHandle || undefined,
        target_handle: connection.targetHandle || undefined,
      }, shareToken);

      // Add to React Flow
      const newEdge: Edge = {
        id: newConnection.id,
        source: newConnection.source_node_id,
        target: newConnection.target_node_id,
        sourceHandle: newConnection.source_handle || null,
        targetHandle: newConnection.target_handle || null,
        type: 'custom',
        data: { backendId: newConnection.id },
      };

      setEdges(eds => addEdge(newEdge, eds));
      
      // Create updated connections list for immediate use (avoid stale closure)
      const updatedConnections = [...backendConnections, newConnection as BackendConnection];
      setBackendConnections(updatedConnections);

      // Update video/extension nodes if affected - pass updated connections to avoid stale closure
      if (targetNode.type === 'video' || targetNode.type === 'extension') {
        updateVideoNodeConnectedData(connection.target, backendNodes, updatedConnections);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  }, [projectId, edges, backendNodes, backendConnections, updateVideoNodeConnectedData]);

  // Handle edge delete
  const handleEdgeDelete = useCallback(async (edgesToDelete: Edge[]) => {
    // Track updated connections to avoid stale closure
    let currentConnections = [...backendConnections];
    
    for (const edge of edgesToDelete) {
      try {
        await connectionsApi.delete(projectId, edge.id, shareToken);
        
        // Update connections list
        currentConnections = currentConnections.filter(c => c.id !== edge.id);
        setBackendConnections(currentConnections);

        // Update video/extension nodes if affected - pass updated connections to avoid stale closure
        const targetNode = backendNodes.find(n => n.id === edge.target);
        if (targetNode && (targetNode.type === 'video' || targetNode.type === 'extension')) {
          updateVideoNodeConnectedData(edge.target, backendNodes, currentConnections);
        }
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    }
  }, [projectId, backendNodes, backendConnections, updateVideoNodeConnectedData]);

  // Handle node creation
  const handleAddNode = async (type: 'image' | 'prompt' | 'video' | 'container' | 'ratio' | 'scene' | 'extension') => {
    try {
      // Calculate a random position offset to avoid stacking
      const randomOffset = () => Math.floor(Math.random() * 200) + 50;
      const newNode = await nodesApi.create(projectId, {
        type,
        position_x: 100 + randomOffset(),
        position_y: 100 + randomOffset(),
        data: {},
      }, shareToken);

      setBackendNodes(prev => [...prev, newNode as Node]);
      setNodes(nds => [...nds, ...transformBackendNodesToRF([newNode as Node], backendConnections)]);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  // Handle node update
  const handleNodeUpdate = async (nodeId: string, data: Record<string, any>) => {
    try {
      await nodesApi.update(projectId, nodeId, { data }, shareToken);

      // Update backend state
      setBackendNodes(prev =>
        prev.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );

      // Update React Flow state
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, data: { ...(n.data?.data || {}), ...data } } } : n
        )
      );
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  // Handle node delete
  const handleNodeDelete = async (nodeId: string) => {
    try {
      await nodesApi.delete(projectId, nodeId, shareToken);
      setBackendNodes(prev => prev.filter(n => n.id !== nodeId));
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      setBackendConnections(prev =>
        prev.filter(c => c.source_node_id !== nodeId && c.target_node_id !== nodeId)
      );
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  // Handle video generation - uses refs to always access latest state (fixes stale closure)
  const handleGenerateVideo = useCallback(async (nodeId: string) => {
    // Use refs to get latest state values (avoids stale closure issue)
    const currentNodes = backendNodesRef.current;
    const currentConnections = backendConnectionsRef.current;
    
    const videoNode = currentNodes.find(n => n.id === nodeId);
    if (!videoNode || videoNode.type !== 'video') {
      console.error('Video node not found:', nodeId, 'Available nodes:', currentNodes.map(n => n.id));
      return;
    }

    const { prompt, imageUrl } = getConnectedData(nodeId, currentNodes, currentConnections);
    console.log('Generate video:', { nodeId, prompt, imageUrl, connections: currentConnections.length });
    
    if (!prompt) {
      alert('Please connect a prompt node first');
      return;
    }

    try {
      // Update node status
      updateNodeData(nodeId, { progress_message: 'Starting generation...' }, 'processing');

      const job = await aiApi.generateVideo({
        node_id: nodeId,
        prompt,
        image_url: imageUrl || undefined,
        resolution: videoNode.data?.resolution || '1080p',
        duration: videoNode.data?.duration || 8,
        aspect_ratio: '16:9',
      });

      console.log('Video generation job started:', job);

      // Start polling for job status
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to generate video:', errorMessage, error);
      updateNodeData(
        nodeId,
        {
          progress_message: `Failed to start generation: ${errorMessage}`,
          stage: 'error',
        },
        'failed',
        errorMessage
      );
    }
  }, [updateNodeData, startJobPolling]);

  // Handle video extension - uses refs to always access latest state (fixes stale closure)
  const handleExtendVideo = useCallback(async (nodeId: string) => {
    // Use refs to get latest state values (avoids stale closure issue)
    const currentNodes = backendNodesRef.current;
    const currentConnections = backendConnectionsRef.current;
    
    const extensionNode = currentNodes.find(n => n.id === nodeId);
    if (!extensionNode || extensionNode.type !== 'extension') {
      console.error('Extension node not found:', nodeId);
      return;
    }

    const { prompt, videoData } = getConnectedData(nodeId, currentNodes, currentConnections);
    console.log('Extend video:', { nodeId, prompt, videoData, connections: currentConnections.length });
    
    if (!videoData?.veo_video_uri) {
      alert('Please connect a generated video first (must have Veo references)');
      return;
    }
    
    if (!prompt) {
      alert('Please connect a prompt node');
      return;
    }

    // Check extension limit
    const extensionCount = (videoData.extension_count || 0) + 1;
    if (extensionCount > 20) {
      alert('Maximum 20 extensions reached for this video chain');
      return;
    }

    try {
      // Update node status
      updateNodeData(nodeId, { progress_message: 'Starting extension...' }, 'processing');

      const job = await aiApi.extendVideo({
        node_id: nodeId,
        video_url: videoData.video_url,
        prompt,
        veo_video_uri: videoData.veo_video_uri,
        veo_video_name: videoData.veo_video_name,
        extension_count: extensionCount,
      });

      console.log('Video extension job started:', job);

      // Start polling for job status
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to extend video:', errorMessage, error);
      updateNodeData(
        nodeId,
        {
          progress_message: `Failed to start extension: ${errorMessage}`,
          stage: 'error',
        },
        'failed',
        errorMessage
      );
    }
  }, [updateNodeData, startJobPolling]);

  // Handle mouse move for cursor broadcasting (throttled)
  // NOTE: Must be defined before early returns to satisfy React's rules of hooks
  const lastCursorBroadcast = useRef(0);
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    // Throttle to max 20 updates per second
    if (now - lastCursorBroadcast.current > 50) {
      lastCursorBroadcast.current = now;
      // Get position relative to canvas
      const rect = e.currentTarget.getBoundingClientRect();
      sendCursorPosition(e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [sendCursorPosition]);

  // Handle node selection change for broadcasting
  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: RFNode[] }) => {
    const selectedId = selectedNodes.length > 0 ? selectedNodes[0].id : null;
    sendNodeSelect(selectedId);
  }, [sendNodeSelect]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white bg-[#1a1a1a]">
        Loading nodes...
      </div>
    );
  }

  // Floating dock items
  const dockItems = [
    {
      title: "Image",
      icon: (
        <IconPhoto className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('image');
      },
      id: 'image',
    },
    {
      title: "Prompt",
      icon: (
        <IconMessageCircle className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('prompt');
      },
      id: 'prompt',
    },
    {
      title: "Video",
      icon: (
        <IconVideo className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('video');
      },
      id: 'video',
    },
    {
      title: "Extension",
      icon: (
        <IconPlayerTrackNext className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('extension');
      },
      id: 'extension',
    },
    {
      title: "Container",
      icon: (
        <IconBox className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('container');
      },
      id: 'container',
    },
    {
      title: "Ratio",
      icon: (
        <IconAspectRatio className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('ratio');
      },
      id: 'ratio',
    },
    {
      title: "Scene",
      icon: (
        <IconCameraRotate className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('scene');
      },
      id: 'scene',
    },
  ];

  return (
    <div 
      className="w-full h-full framer-canvas relative"
      onMouseMove={handleCanvasMouseMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgeDelete}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={3}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--color-border-default)" />
        <Controls className="react-flow__controls" />
      </ReactFlow>

      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
            wsConnected 
              ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]' 
              : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
          }`}
          title={wsConnected ? 'Real-time sync active' : 'Offline - changes may not sync'}
        >
          {wsConnected ? (
            <IconWifi size={14} />
          ) : (
            <IconWifiOff size={14} />
          )}
          <span>{wsConnected ? 'Synced' : 'Offline'}</span>
        </div>
        
        {/* Collaborator count */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs">
            <div className="flex -space-x-1">
              {collaborators.slice(0, 3).map((collab) => (
                <div
                  key={collab.userId}
                  className="w-5 h-5 rounded-full border-2 border-[var(--color-bg-elevated)]"
                  style={{ backgroundColor: collab.color }}
                  title={`User ${collab.userId.slice(0, 8)}`}
                />
              ))}
            </div>
            {collaborators.length > 3 && (
              <span className="ml-1">+{collaborators.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Collaborator Cursors */}
      {collaborators.map((collab) => collab.cursor && (
        <div
          key={collab.userId}
          className="absolute pointer-events-none z-40 transition-all duration-75"
          style={{
            left: collab.cursor.x,
            top: collab.cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor arrow */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.5 3.21V20.79C5.5 21.23 5.99 21.5 6.36 21.26L10.4 18.69L12.11 22.18C12.23 22.42 12.52 22.52 12.75 22.4L14.22 21.64C14.45 21.52 14.55 21.23 14.43 21L12.73 17.53L17.49 16.76C17.94 16.69 18.12 16.14 17.8 15.82L6.21 3.14C5.88 2.78 5.32 2.96 5.32 3.44"
              fill={collab.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          {/* User label */}
          <div
            className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: collab.color }}
          >
            User {collab.userId.slice(0, 6)}
          </div>
        </div>
      ))}

      {/* Controls in top-right corner */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <ShareButton projectId={projectId} />
        <ThemePicker />
      </div>

      {/* Floating Dock at bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>
    </div>
  );
}

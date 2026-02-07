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
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles/canvas.css';

import { Node, Connection as BackendConnection } from '@/lib/types/node';
import { nodesApi, connectionsApi, aiApi } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSubscription } from '@/lib/contexts/SubscriptionContext';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { FloatingDock, DockItem } from '@/components/ui/floating-dock';
import { IconPhoto, IconMessageCircle, IconVideo, IconPlayerTrackNext, IconComponents } from '@tabler/icons-react';

interface ReactFlowCanvasProps {
  projectId: string;
  shareToken?: string | null;
}

export default function ReactFlowCanvas({ projectId, shareToken }: ReactFlowCanvasProps) {
  const { isAuthenticated } = useAuth();
  const { refreshSubscription } = useSubscription();

  // React Flow state (UI)
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Backend state (source of truth)
  const [backendNodes, setBackendNodes] = useState<Node[]>([]);
  const [backendConnections, setBackendConnections] = useState<BackendConnection[]>([]);

  // React Flow instance ref for viewport-aware node placement
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

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
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Ref for shareToken to use in callbacks
  const shareTokenRef = useRef(shareToken);
  shareTokenRef.current = shareToken;

  // Helper function to get connected data (no useCallback to avoid circular deps)
  // Flexible: extracts data from any connected node based on what data is available
  const getConnectedData = (nodeId: string, nodes: Node[], connections: BackendConnection[]) => {
    const nodeConnections = connections.filter(c => c.target_node_id === nodeId);
    
    console.log('[getConnectedData] Node:', nodeId, 'Connections:', nodeConnections.length);

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
      if (!sourceNode) {
        console.log('[getConnectedData] Source node not found:', connection.source_node_id);
        continue;
      }
      
      console.log('[getConnectedData] Source node data:', sourceNode.type, sourceNode.data);

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

    console.log('[getConnectedData] Result:', { prompt: prompt?.substring(0, 50), imageUrl: imageUrl?.substring(0, 50), hasVideoData: !!videoData });
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
    
    console.log('[updateVideoNodeConnectedData] NodeId:', nodeId);
    console.log('[updateVideoNodeConnectedData] Nodes count:', nodesToUse.length);
    console.log('[updateVideoNodeConnectedData] Connections count:', connectionsToUse.length);
    
    const { prompt, imageUrl, videoData } = getConnectedData(nodeId, nodesToUse, connectionsToUse);
    
    console.log('[updateVideoNodeConnectedData] Result:', { prompt: prompt?.substring(0, 30), imageUrl: imageUrl?.substring(0, 30) });
    
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

      console.log('[handleConnect] Connection created:', {
        source: connection.source,
        target: connection.target,
        sourceType: sourceNode.type,
        targetType: targetNode.type,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle
      });

      // Update video/extension nodes if affected - pass updated connections to avoid stale closure
      if (targetNode.type === 'video' || targetNode.type === 'extension') {
        console.log('[handleConnect] Updating connected data for target:', targetNode.id);
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
      // Place node at the center of the current viewport with a small random offset
      const randomOffset = () => Math.floor(Math.random() * 100) - 50;
      let posX = 300;
      let posY = 300;

      if (reactFlowInstance.current) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const flowCenter = reactFlowInstance.current.screenToFlowPosition({ x: centerX, y: centerY });
        posX = flowCenter.x + randomOffset();
        posY = flowCenter.y + randomOffset();
      }

      const newNode = await nodesApi.create(projectId, {
        type,
        position_x: posX,
        position_y: posY,
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

      // Calculate updated nodes first
      const updatedNodes = backendNodes.map(n => 
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      );
      
      // Update backend state
      setBackendNodes(updatedNodes);

      // Update React Flow state with connected data recalculated
      setNodes(nds => {
        // First update the changed node
        let updated = nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, data: { ...(n.data?.data || {}), ...data } } } : n
        );
        
        // Then update any video/extension nodes connected to this source
        const affectedConnections = backendConnections.filter(c => c.source_node_id === nodeId);
        console.log('[handleNodeUpdate] Node:', nodeId, 'Affected connections:', affectedConnections.length);
        
        for (const connection of affectedConnections) {
          const targetNode = updatedNodes.find(n => n.id === connection.target_node_id);
          if (targetNode && (targetNode.type === 'video' || targetNode.type === 'extension')) {
            const connectedData = getConnectedData(connection.target_node_id, updatedNodes, backendConnections);
            console.log('[handleNodeUpdate] Updating target node:', connection.target_node_id, 'with:', connectedData);
            
            updated = updated.map(n => {
              if (n.id !== connection.target_node_id) return n;
              if (n.type === 'video') {
                return { ...n, data: { ...n.data, connectedPrompt: connectedData.prompt, connectedImageUrl: connectedData.imageUrl } };
              }
              if (n.type === 'extension') {
                return { ...n, data: { ...n.data, connectedPrompt: connectedData.prompt, connectedVideo: connectedData.videoData } };
              }
              return n;
            });
          }
        }
        
        return updated;
      });
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
        resolution: videoNode.data?.resolution || '720p',
        duration: videoNode.data?.duration || 8,
        aspect_ratio: '16:9',
      });

      console.log('Video generation job started:', job);

      // Refresh credit balance after successful dispatch
      refreshSubscription();

      // Start polling for job status
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to generate video:', errorMessage, error);

      // Handle insufficient credits (402)
      if (error?.status === 402) {
        refreshSubscription();
        updateNodeData(
          nodeId,
          {
            progress_message: 'Insufficient credits. Please upgrade your plan.',
            stage: 'error',
          },
          'failed',
          'Insufficient credits'
        );
        return;
      }

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
  }, [updateNodeData, startJobPolling, refreshSubscription]);

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

      // Refresh credit balance after successful dispatch
      refreshSubscription();

      // Start polling for job status
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to extend video:', errorMessage, error);

      // Handle insufficient credits (402)
      if (error?.status === 402) {
        refreshSubscription();
        updateNodeData(
          nodeId,
          {
            progress_message: 'Insufficient credits. Please upgrade your plan.',
            stage: 'error',
          },
          'failed',
          'Insufficient credits'
        );
        return;
      }

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
  }, [updateNodeData, startJobPolling, refreshSubscription]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white bg-[#1a1a1a]">
        Loading nodes...
      </div>
    );
  }

  // Floating dock items
  const dockItems: DockItem[] = [
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
      title: "Components",
      icon: (
        <IconComponents className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowComingSoon(true);
        setTimeout(() => setShowComingSoon(false), 2000);
      },
      id: 'components',
    },
  ];

  return (
    <div className="w-full h-full framer-canvas relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgeDelete}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={3}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--color-border-default)" />
        <Controls className="react-flow__controls" />
      </ReactFlow>

      {/* Floating Dock at bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Coming Soon tooltip */}
      {showComingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-md shadow-lg">
          Coming soon
        </div>
      )}
    </div>
  );
}

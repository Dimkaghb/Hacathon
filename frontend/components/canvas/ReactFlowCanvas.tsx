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
import { IconPhoto, IconMessageCircle, IconVideo, IconBox, IconAspectRatio, IconCameraRotate } from '@tabler/icons-react';

interface ReactFlowCanvasProps {
  projectId: string;
}

export default function ReactFlowCanvas({ projectId }: ReactFlowCanvasProps) {
  const { isAuthenticated } = useAuth();

  // React Flow state (UI)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Backend state (source of truth)
  const [backendNodes, setBackendNodes] = useState<Node[]>([]);
  const [backendConnections, setBackendConnections] = useState<BackendConnection[]>([]);

  // Job polling - use ref to avoid recreating callbacks
  const jobPollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [, forceUpdate] = useState({});

  // Debounce timers
  const positionUpdateTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [loading, setLoading] = useState(true);

  // Helper function to get connected data (no useCallback to avoid circular deps)
  const getConnectedData = (nodeId: string, nodes: Node[], connections: BackendConnection[]) => {
    const videoConnections = connections.filter(c => c.target_node_id === nodeId);

    let prompt = '';
    let imageUrl = '';

    for (const connection of videoConnections) {
      const sourceNode = nodes.find(n => n.id === connection.source_node_id);
      if (!sourceNode) continue;

      if (sourceNode.type === 'prompt') {
        prompt = sourceNode.data?.prompt || '';
      } else if (sourceNode.type === 'image') {
        imageUrl = sourceNode.data?.image_url || '';
      } else if (connection.target_handle === 'prompt-input') {
        prompt = sourceNode.data?.prompt || '';
      } else if (connection.target_handle === 'image-input') {
        imageUrl = sourceNode.data?.image_url || '';
      }
    }

    return { prompt, imageUrl };
  };

  // Transform backend nodes to React Flow nodes (no useCallback to avoid circular deps)
  const transformBackendNodesToRF = (nodes: Node[], connections: BackendConnection[]): RFNode[] => {
    return nodes.map(node => ({
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
        // Connected data for video nodes
        connectedPrompt: node.type === 'video' ? getConnectedData(node.id, nodes, connections).prompt : undefined,
        connectedImageUrl: node.type === 'video' ? getConnectedData(node.id, nodes, connections).imageUrl : undefined,
      },
    }));
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

  // Update video node connected data
  const updateVideoNodeConnectedData = useCallback((nodeId: string) => {
    const { prompt, imageUrl } = getConnectedData(nodeId, backendNodes, backendConnections);
    setNodes(nds =>
      nds.map(n =>
        n.id === nodeId && n.type === 'video'
          ? { ...n, data: { ...n.data, connectedPrompt: prompt, connectedImageUrl: imageUrl } }
          : n
      )
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
                data: { ...n.data.data, ...data },
                status: status || n.data.status,
                error_message: errorMessage !== undefined ? errorMessage : n.data.error_message,
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
        nodesApi.list(projectId),
        connectionsApi.list(projectId),
      ]);

      setBackendNodes(nodesData);
      setBackendConnections(connectionsData);

      // Transform to React Flow format (call functions directly, not from closure)
      setNodes(transformBackendNodesToRF(nodesData, connectionsData));
      setEdges(transformBackendConnectionsToRF(connectionsData));

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
          nodesApi.update(projectId, nodeId, { position_x: x, position_y: y });
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

    // Validate: no duplicates
    const exists = edges.some(
      e => e.source === connection.source && e.target === connection.target
    );
    if (exists) return;

    try {
      // Create in backend
      const newConnection = await connectionsApi.create(projectId, {
        source_node_id: connection.source,
        target_node_id: connection.target,
        source_handle: connection.sourceHandle || undefined,
        target_handle: connection.targetHandle || undefined,
      });

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
      setBackendConnections(prev => [...prev, newConnection]);

      // Update video nodes if affected
      if (backendNodes.find(n => n.id === connection.target && n.type === 'video')) {
        updateVideoNodeConnectedData(connection.target);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  }, [projectId, edges, backendNodes, updateVideoNodeConnectedData]);

  // Handle edge delete
  const handleEdgeDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try {
        await connectionsApi.delete(projectId, edge.id);
        setBackendConnections(prev => prev.filter(c => c.id !== edge.id));

        // Update video nodes if affected
        const targetNode = backendNodes.find(n => n.id === edge.target);
        if (targetNode && targetNode.type === 'video') {
          updateVideoNodeConnectedData(edge.target);
        }
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    }
  }, [projectId, backendNodes, updateVideoNodeConnectedData]);

  // Handle node creation
  const handleAddNode = async (type: 'image' | 'prompt' | 'video' | 'container' | 'ratio' | 'scene') => {
    try {
      const newNode = await nodesApi.create(projectId, {
        type,
        position_x: 100,
        position_y: 100,
        data: {},
      });

      setBackendNodes(prev => [...prev, newNode]);
      setNodes(nds => [...nds, ...transformBackendNodesToRF([newNode], backendConnections)]);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  // Handle node update
  const handleNodeUpdate = async (nodeId: string, data: Record<string, any>) => {
    try {
      await nodesApi.update(projectId, nodeId, { data });

      // Update backend state
      setBackendNodes(prev =>
        prev.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );

      // Update React Flow state
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, data: { ...n.data.data, ...data } } } : n
        )
      );
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  // Handle node delete
  const handleNodeDelete = async (nodeId: string) => {
    try {
      await nodesApi.delete(projectId, nodeId);
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

  // Handle video generation
  const handleGenerateVideo = async (nodeId: string) => {
    const videoNode = backendNodes.find(n => n.id === nodeId);
    if (!videoNode || videoNode.type !== 'video') return;

    const { prompt, imageUrl } = getConnectedData(nodeId);
    if (!prompt) {
      alert('Please connect a prompt node first');
      return;
    }

    try {
      // Update node status
      updateNodeData(nodeId, {}, 'processing');

      const job = await aiApi.generateVideo({
        node_id: nodeId,
        prompt,
        image_url: imageUrl || undefined,
        resolution: videoNode.data?.resolution || '1080p',
        duration: videoNode.data?.duration || 8,
        aspect_ratio: '16:9',
      });

      // Start polling for job status
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to generate video:', errorMessage);
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
  };

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
    <div className="w-full h-full framer-canvas relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgeDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={3}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#374151" />
        <Controls className="react-flow__controls" />
      </ReactFlow>

      {/* Floating Dock at bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>
    </div>
  );
}

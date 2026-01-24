"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Connection } from '@/lib/types/node';
import ImageNode from './nodes/ImageNode';
import PromptNode from './nodes/PromptNode';
import VideoNode from './nodes/VideoNode';
import { nodesApi, connectionsApi, aiApi } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';

interface NodeEditorProps {
  projectId: string;
}

export default function NodeEditor({ projectId }: NodeEditorProps) {
  const { isAuthenticated } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handleId: string } | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [jobPolling, setJobPolling] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Load nodes and connections
  useEffect(() => {
    if (!isAuthenticated || !projectId) return;
    loadNodesAndConnections();
  }, [isAuthenticated, projectId]);

  const loadNodesAndConnections = async () => {
    try {
      setLoading(true);
      const [nodesData, connectionsData] = await Promise.all([
        nodesApi.list(projectId),
        connectionsApi.list(projectId),
      ]);
      setNodes(nodesData);
      setConnections(connectionsData);
      
      // Check for any processing jobs and resume polling
      const processingNodes = nodesData.filter(n => n.status === 'processing');
      for (const node of processingNodes) {
        // Find the latest job for this node and resume polling
        try {
          const latestJob = await aiApi.getLatestJobForNode(node.id);
          if (latestJob && (latestJob.status === 'processing' || latestJob.status === 'pending')) {
            console.log(`Resuming polling for job ${latestJob.job_id} on node ${node.id}`);
            startJobPolling(latestJob.job_id, node.id);
          } else if (latestJob && latestJob.status === 'completed') {
            // Job completed but node status wasn't updated - update it
            setNodes((prev) =>
              prev.map((n) => {
                if (n.id === node.id) {
                  const videoUrl = latestJob.result?.video_url || 
                                 (typeof latestJob.result === 'string' ? latestJob.result : null);
                  return {
                    ...n,
                    status: 'completed' as const,
                    data: {
                      ...n.data,
                      video_url: videoUrl,
                      ...(latestJob.result && typeof latestJob.result === 'object' ? latestJob.result : {}),
                    },
                  };
                }
                return n;
              })
            );
          } else if (latestJob && latestJob.status === 'failed') {
            // Job failed but node status wasn't updated
            setNodes((prev) =>
              prev.map((n) => {
                if (n.id === node.id) {
                  return {
                    ...n,
                    status: 'failed' as const,
                    error_message: latestJob.error || 'Generation failed',
                  };
                }
                return n;
              })
            );
          }
        } catch (error) {
          console.error(`Failed to check job for node ${node.id}:`, error);
          // If no job found, reset node to idle
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === node.id) {
                return { ...n, status: 'idle' as const };
              }
              return n;
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle node creation
  const handleAddNode = async (type: 'image' | 'prompt' | 'video') => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (rect.width / 2 - offset.x) / scale;
    const y = (rect.height / 2 - offset.y) / scale;

    try {
      const newNode = await nodesApi.create(projectId, {
        type,
        position_x: x,
        position_y: y,
        data: {},
      });
      setNodes((prev) => [...prev, newNode]);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  // Handle node update
  const handleNodeUpdate = async (nodeId: string, data: Record<string, any>) => {
    try {
      await nodesApi.update(projectId, nodeId, { data });
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  // Handle node move
  const handleNodeMove = async (nodeId: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, position_x: x, position_y: y } : n))
    );
    // Debounce API calls for position updates
    clearTimeout((window as any)[`move_${nodeId}`]);
    (window as any)[`move_${nodeId}`] = setTimeout(() => {
      nodesApi.update(projectId, nodeId, { position_x: x, position_y: y });
    }, 500);
  };

  // Handle node delete
  const handleNodeDelete = async (nodeId: string) => {
    try {
      await nodesApi.delete(projectId, nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnections((prev) =>
        prev.filter((c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId)
      );
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  // Handle connection start
  const handleConnectionStart = (handleId: string, nodeId: string) => {
    setConnectingFrom({ nodeId, handleId });
  };

  // Handle connection end
  const handleConnectionEnd = async (handleId: string, targetNodeId: string) => {
    if (!connectingFrom) return;

    const sourceNodeId = connectingFrom.nodeId;
    if (sourceNodeId === targetNodeId) {
      setConnectingFrom(null);
      setTempConnection(null);
      return;
    }

    // Check if connection already exists
    const exists = connections.some(
      (c) => c.source_node_id === sourceNodeId && c.target_node_id === targetNodeId
    );
    if (exists) {
      setConnectingFrom(null);
      setTempConnection(null);
      return;
    }

    try {
      const newConnection = await connectionsApi.create(projectId, {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        source_handle: connectingFrom.handleId,
        target_handle: handleId,
      });
      setConnections((prev) => [...prev, newConnection]);
    } catch (error) {
      console.error('Failed to create connection:', error);
    }

    setConnectingFrom(null);
    setTempConnection(null);
  };

  // Handle canvas mouse events for connections
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectingFrom && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate position in transformed coordinate space
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;
      setTempConnection({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    if (connectingFrom) {
      setConnectingFrom(null);
      setTempConnection(null);
    }
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the background, not on nodes
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
    handleCanvasMouseMove(e);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    handleCanvasMouseUp();
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setOffset({
        x: mouseX - (mouseX - offset.x) * (newScale / scale),
        y: mouseY - (mouseY - offset.y) * (newScale / scale),
      });
    }

    setScale(newScale);
  };

  // Get connected data for video node
  const getConnectedData = (nodeId: string) => {
    const videoNode = nodes.find((n) => n.id === nodeId && n.type === 'video');
    if (!videoNode) return { prompt: '', imageUrl: '' };

    // Find all connections to this video node
    const videoConnections = connections.filter(
      (c) => c.target_node_id === nodeId
    );

    let prompt = '';
    let imageUrl = '';

    // Check each connection to determine what type of node is connected
    for (const connection of videoConnections) {
      const sourceNode = nodes.find((n) => n.id === connection.source_node_id);
      if (!sourceNode) continue;

      // Determine connection type based on source node type or target handle
      if (sourceNode.type === 'prompt') {
        // Prompt node connected - get prompt from node data
        prompt = sourceNode.data?.prompt || '';
      } else if (sourceNode.type === 'image') {
        // Image node connected - get image URL from node data
        imageUrl = sourceNode.data?.image_url || '';
      } else if (connection.target_handle === 'prompt-input') {
        // Connected to prompt input handle
        prompt = sourceNode.data?.prompt || '';
      } else if (connection.target_handle === 'image-input') {
        // Connected to image input handle
        imageUrl = sourceNode.data?.image_url || '';
      }
    }

    return { prompt, imageUrl };
  };

  // Handle video generation
  const handleGenerateVideo = async (nodeId: string) => {
    const videoNode = nodes.find((n) => n.id === nodeId);
    if (!videoNode || videoNode.type !== 'video') return;

    const { prompt, imageUrl } = getConnectedData(nodeId);
    if (!prompt) {
      alert('Please connect a prompt node first');
      return;
    }

    try {
      // Update node status
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, status: 'processing' as const } : n
        )
      );

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
      console.error('Failed to generate video:', {
        nodeId,
        error: errorMessage,
        fullError: error,
      });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { 
                ...n, 
                status: 'failed' as const, 
                error_message: errorMessage,
                data: {
                  ...n.data,
                  progress_message: `Failed to start generation: ${errorMessage}`,
                  stage: 'error',
                },
              }
            : n
        )
      );
    }
  };

  // Poll job status
  const startJobPolling = (jobId: string, nodeId: string) => {
    const poll = async () => {
      try {
        const status = await aiApi.getJobStatus(jobId);
        
        // Debug logging with detailed info
        console.log('Job status update:', {
          jobId,
          nodeId,
          status: status.status,
          progress: status.progress,
          stage: status.stage,
          progress_message: status.progress_message,
          hasResult: !!status.result,
          resultKeys: status.result ? Object.keys(status.result) : [],
          error: status.error,
        });
        
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === nodeId) {
              if (status.status === 'completed') {
                // Extract video_url from result - it could be in result.video_url or result itself
                const videoUrl = status.result?.video_url || 
                               (typeof status.result === 'string' ? status.result : null);
                
                return {
                  ...n,
                  status: 'completed' as const,
                  data: { 
                    ...n.data, 
                    video_url: videoUrl,
                    progress: 100,
                    progress_message: status.progress_message || 'Video ready',
                    stage: status.stage || 'completed',
                    ...(status.result && typeof status.result === 'object' ? status.result : {}),
                  },
                };
              } else if (status.status === 'failed') {
                return {
                  ...n,
                  status: 'failed' as const,
                  error_message: status.error || 'Generation failed',
                  data: {
                    ...n.data,
                    progress: status.progress,
                    progress_message: status.progress_message || status.error || 'Generation failed',
                    stage: status.stage || 'failed',
                  },
                };
              } else {
                // Update progress for processing status
                return { 
                  ...n, 
                  status: 'processing' as const,
                  data: {
                    ...n.data,
                    progress: status.progress,
                    progress_message: status.progress_message || `Processing... ${status.progress}%`,
                    stage: status.stage || 'processing',
                  },
                };
              }
            }
            return n;
          })
        );

        if (status.status === 'completed' || status.status === 'failed') {
          // Stop polling
          const timeout = jobPolling.get(jobId);
          if (timeout) {
            clearTimeout(timeout);
            setJobPolling((prev) => {
              const next = new Map(prev);
              next.delete(jobId);
              return next;
            });
          }
        } else {
          // Continue polling - use interval for more consistent timing
          const timeout = setTimeout(poll, 3000);
          setJobPolling((prev) => {
            const next = new Map(prev);
            next.set(jobId, timeout);
            return next;
          });
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        console.error('Failed to poll job status:', {
          jobId,
          nodeId,
          error: errorMessage,
          status: error?.status,
          fullError: error,
        });
        
        // If it's a 404, the job might not exist - stop polling
        if (error?.status === 404) {
          console.warn(`Job ${jobId} not found, stopping polling`);
          const timeout = jobPolling.get(jobId);
          if (timeout) {
            clearTimeout(timeout);
            setJobPolling((prev) => {
              const next = new Map(prev);
              next.delete(jobId);
              return next;
            });
          }
          // Reset node to idle if job doesn't exist
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === nodeId) {
                return { 
                  ...n, 
                  status: 'idle' as const,
                  data: {
                    ...n.data,
                    progress_message: `Job not found (may have been deleted)`,
                  },
                };
              }
              return n;
            })
          );
        } else {
          // For other errors, update node with error info but continue polling
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    progress_message: `Polling error: ${errorMessage}`,
                    stage: 'error',
                  },
                };
              }
              return n;
            })
          );
          
          // Continue polling but with longer interval
          const timeout = setTimeout(poll, 10000); // Poll every 10s on error
          setJobPolling((prev) => {
            const next = new Map(prev);
            next.set(jobId, timeout);
            return next;
          });
        }
      }
    };

    const timeout = setTimeout(poll, 2000);
    setJobPolling((prev) => {
      const next = new Map(prev);
      next.set(jobId, timeout);
      return next;
    });
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      jobPolling.forEach((timeout) => clearTimeout(timeout));
    };
  }, [jobPolling]);

  // Handle connection delete
  const handleConnectionDelete = async (connectionId: string) => {
    try {
      await connectionsApi.delete(projectId, connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  // Render connection line
  const renderConnection = (connection: Connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source_node_id);
    const targetNode = nodes.find((n) => n.id === connection.target_node_id);
    if (!sourceNode || !targetNode) return null;

    // Calculate handle positions based on node type and handle
    let sourceX = sourceNode.position_x + 240; // Right side of node (width is 240px)
    let sourceY = sourceNode.position_y + 50; // Middle of node
    
    let targetX = targetNode.position_x; // Left side of node
    let targetY = targetNode.position_y;
    
    // Adjust target Y based on handle position
    if (connection.target_handle === 'prompt-input') {
      targetY += 30;
    } else if (connection.target_handle === 'image-input') {
      targetY += 70;
    } else {
      targetY += 50; // Default
    }

    return (
      <g key={connection.id}>
        <line
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          stroke="#3b82f6"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          className="cursor-pointer hover:stroke-blue-400"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this connection?')) {
              handleConnectionDelete(connection.id);
            }
          }}
        />
      </g>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        Loading nodes...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#1a1a1a]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Toolbar - moved to top center to avoid conflicts */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-[#2a2a2a] p-2 rounded-lg shadow-lg border border-gray-700">
        <button
          onClick={() => handleAddNode('image')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          + Image
        </button>
        <button
          onClick={() => handleAddNode('prompt')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
        >
          + Prompt
        </button>
        <button
          onClick={() => handleAddNode('video')}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm font-medium"
        >
          + Video
        </button>
      </div>

      {/* Zoom Info - moved to top right */}
      <div className="absolute top-4 right-4 z-20 bg-[#2a2a2a] px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-white text-sm">
        Zoom: {Math.round(scale * 100)}%
      </div>

      {/* Nodes Container */}
      <div
        data-node-container
        className="absolute inset-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG for connections - inside the transformed container */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          <g>
            {connections.map(renderConnection)}
            {connectingFrom && tempConnection && (() => {
              const sourceNode = nodes.find((n) => n.id === connectingFrom.nodeId);
              if (!sourceNode) return null;
              const sourceX = sourceNode.position_x + 240;
              const sourceY = sourceNode.position_y + 50;
              return (
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={tempConnection.x}
                  y2={tempConnection.y}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  pointerEvents="none"
                />
              );
            })()}
          </g>
        </svg>
        {nodes.map((node) => {
          const commonProps = {
            node,
            selected: selectedNodeId === node.id,
            onSelect: () => setSelectedNodeId(node.id),
            onMove: (x: number, y: number) => handleNodeMove(node.id, x, y),
            onDelete: () => handleNodeDelete(node.id),
            onUpdate: (data: Record<string, any>) => handleNodeUpdate(node.id, data),
            onConnectionStart: handleConnectionStart,
            onConnectionEnd: handleConnectionEnd,
            canvasScale: scale,
            canvasOffset: offset,
          };

          if (node.type === 'image') {
            return <ImageNode key={node.id} {...commonProps} />;
          } else if (node.type === 'prompt') {
            return <PromptNode key={node.id} {...commonProps} />;
          } else if (node.type === 'video') {
            const { prompt, imageUrl } = getConnectedData(node.id);
            // Debug log to help diagnose connection issues
            if (process.env.NODE_ENV === 'development') {
              const videoConnections = connections.filter(c => c.target_node_id === node.id);
              if (videoConnections.length > 0 && !prompt && !imageUrl) {
                console.log('Video node connections:', {
                  nodeId: node.id,
                  connections: videoConnections,
                  connectedNodes: videoConnections.map(c => {
                    const srcNode = nodes.find(n => n.id === c.source_node_id);
                    return {
                      connection: c,
                      sourceNode: srcNode ? { type: srcNode.type, data: srcNode.data } : null
                    };
                  })
                });
              }
            }
            return (
              <VideoNode
                key={node.id}
                {...commonProps}
                onGenerate={() => handleGenerateVideo(node.id)}
                connectedPrompt={prompt}
                connectedImageUrl={imageUrl}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Instructions */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-2">No nodes yet</p>
            <p className="text-sm">Click the buttons above to add nodes</p>
            <p className="text-xs mt-4">Connect nodes by dragging from output to input handles</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles/canvas.css';

import { toBlob } from 'html-to-image';
import { Node, Connection as BackendConnection } from '@/lib/types/node';
import { nodesApi, connectionsApi, aiApi, filesApi, projectsApi } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSubscription } from '@/lib/contexts/SubscriptionContext';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { FloatingDock, DockItem } from '@/components/ui/floating-dock';
import { IconPhoto, IconMessageCircle, IconVideo, IconPlayerTrackNext, IconComponents, IconUser, IconPackage, IconMapPin, IconMovie, IconSparkles, IconGitBranch, IconLink } from '@tabler/icons-react';
import SceneGalleryPanel from './panels/SceneGalleryPanel';
import TemplateBrowserPanel from './panels/TemplateBrowserPanel';
import HookLibraryPanel from './panels/HookLibraryPanel';
import ABComparisonPanel from './panels/ABComparisonPanel';
import ExportDialog from './dialogs/ExportDialog';
import { SceneDefinitionItem, TemplateItem, templatesApi } from '@/lib/api';

const SCREENSHOT_WIDTH = 640;
const SCREENSHOT_HEIGHT = 360;

function ScreenshotCapture({ projectId }: { projectId: string }) {
  const { getNodes } = useReactFlow();
  const renderCountRef = useRef(0);
  const capturingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountRef = useRef<string>('');

  const captureScreenshot = useCallback(async () => {
    const nodes = getNodes();
    console.log('[Thumbnail] Attempting capture, nodes:', nodes.length, 'capturing:', capturingRef.current);

    if (nodes.length === 0) {
      console.log('[Thumbnail] No nodes to capture');
      return;
    }

    if (capturingRef.current) {
      console.log('[Thumbnail] Already capturing, skipping');
      return;
    }

    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl) {
      console.error('[Thumbnail] Viewport element not found');
      return;
    }

    capturingRef.current = true;
    try {
      console.log('[Thumbnail] Generating blob...');
      const bounds = getNodesBounds(nodes);

      // Calculate viewport with more padding to include all nodes
      // padding: 0.3 = 30% padding around nodes
      // minZoom: 0.5 = allow zooming out more
      // maxZoom: 1.5 = don't zoom in too much
      const viewport = getViewportForBounds(bounds, SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT, 0.3, 1.5, 0.5);

      const blob = await toBlob(viewportEl, {
        backgroundColor: '#1a1a1a',
        width: SCREENSHOT_WIDTH,
        height: SCREENSHOT_HEIGHT,
        style: {
          width: String(SCREENSHOT_WIDTH),
          height: String(SCREENSHOT_HEIGHT),
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });

      if (!blob) {
        console.error('[Thumbnail] Blob generation failed');
        return;
      }

      console.log('[Thumbnail] Blob generated, size:', blob.size, 'bytes');

      // Use the dedicated project thumbnail endpoint (will delete old thumbnail automatically)
      console.log('[Thumbnail] Uploading screenshot for project:', projectId);
      const result = await projectsApi.uploadThumbnail(projectId, blob);
      console.log('[Thumbnail] Upload successful:', result.thumbnail_url);
    } catch (err) {
      console.error('[Thumbnail] Screenshot capture failed:', err);
    } finally {
      capturingRef.current = false;
    }
  }, [projectId, getNodes]);

  // Capture on unmount (when user leaves page or closes browser)
  useEffect(() => {
    console.log('[Thumbnail] Screenshot will be captured when you leave this page');
    return () => {
      console.log('[Thumbnail] Page unmounting, capturing screenshot...');
      captureScreenshot();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureScreenshot]);

  // Expose capture function globally for manual testing
  useEffect(() => {
    (window as any).captureThumbnail = captureScreenshot;
    console.log('[Thumbnail] Capture function exposed as window.captureThumbnail()');
    return () => {
      delete (window as any).captureThumbnail;
    };
  }, [captureScreenshot]);

  // Keyboard shortcut: Cmd/Ctrl + S to save thumbnail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        console.log('[Thumbnail] Cmd/Ctrl+S pressed, capturing...');
        captureScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [captureScreenshot]);

  return null;
}

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
  const edgesRef = useRef<Edge[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    backendNodesRef.current = backendNodes;
  }, [backendNodes]);

  useEffect(() => {
    backendConnectionsRef.current = backendConnections;
  }, [backendConnections]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Job polling - use ref to avoid recreating callbacks
  const jobPollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [, forceUpdate] = useState({});

  // Debounce timers
  const positionUpdateTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSceneGallery, setShowSceneGallery] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showHookLibrary, setShowHookLibrary] = useState(false);
  const [showABPanel, setShowABPanel] = useState(false);
  const [exportDialogState, setExportDialogState] = useState<{
    open: boolean;
    videoUrl: string | null;
    nodeId: string | null;
  }>({ open: false, videoUrl: null, nodeId: null });
  // Track which scene node is requesting gallery (for "Change scene type")
  const sceneGalleryTargetNodeRef = useRef<string | null>(null);
  const hookLibraryTargetNodeRef = useRef<string | null>(null);

  // Ref for shareToken to use in callbacks
  const shareTokenRef = useRef(shareToken);
  shareTokenRef.current = shareToken;

  // Get ordered list of connected videos for a stitch node
  const getConnectedVideosForStitch = (nodeId: string, nodes: Node[], connections: BackendConnection[]) => {
    return connections
      .filter(c => c.target_node_id === nodeId)
      .sort((a, b) => {
        const getIdx = (h: string | null | undefined) => {
          const m = h?.match(/video-input-(\d+)/);
          return m ? parseInt(m[1]) : 0;
        };
        return getIdx(a.target_handle) - getIdx(b.target_handle);
      })
      .map(conn => {
        const sourceNode = nodes.find(n => n.id === conn.source_node_id);
        return {
          source_node_id: conn.source_node_id,
          handle: conn.target_handle || '',
          video_url: sourceNode?.data?.video_url || '',
        };
      });
  };

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
    let characterData: { character_id: string; wardrobe_preset_id?: string } | null = null;
    let productData: Record<string, any> | null = null;
    let settingData: Record<string, any> | null = null;

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

      // Extract character data
      if (sourceNode.type === 'character' && sourceNode.data?.character_id && !characterData) {
        characterData = {
          character_id: sourceNode.data.character_id,
          wardrobe_preset_id: sourceNode.data.wardrobe_preset_id || undefined,
        };
      }

      // Extract product data
      if (sourceNode.type === 'product' && sourceNode.data?.product_name && !productData) {
        productData = {
          product_name: sourceNode.data.product_name,
          brand: sourceNode.data.brand,
          category: sourceNode.data.category,
          benefits: sourceNode.data.benefits,
          target_audience: sourceNode.data.target_audience,
          tone: sourceNode.data.tone,
        };
      }

      // Extract setting data
      if (sourceNode.type === 'setting' && !settingData) {
        settingData = {
          location: sourceNode.data.location,
          lighting: sourceNode.data.lighting,
          camera_angle: sourceNode.data.camera_angle,
          vibe: sourceNode.data.vibe,
          custom_details: sourceNode.data.custom_details,
        };
      }
    }

    console.log('[getConnectedData] Result:', { prompt: prompt?.substring(0, 50), imageUrl: imageUrl?.substring(0, 50), hasVideoData: !!videoData, hasCharacter: !!characterData, hasProduct: !!productData, hasSetting: !!settingData });
    return { prompt, imageUrl, videoData, characterData, productData, settingData };
  };

  // Transform backend nodes to React Flow nodes (no useCallback to avoid circular deps)
  const transformBackendNodesToRF = (nodes: Node[], connections: BackendConnection[]): RFNode[] => {
    return nodes.map(node => {
      const connectedData = (node.type === 'video' || node.type === 'extension')
        ? getConnectedData(node.id, nodes, connections)
        : null;
      const connectedVideos = node.type === 'stitch'
        ? getConnectedVideosForStitch(node.id, nodes, connections)
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
          onStitch: node.type === 'stitch' ? () => handleStitchVideo(node.id) : undefined,
          onExport: (node.type === 'video' || node.type === 'extension' || node.type === 'stitch')
            ? () => {
                const url = node.data?.video_url;
                setExportDialogState({ open: true, videoUrl: url || null, nodeId: node.id });
              }
            : undefined,
          onGenerateScene: node.type === 'scene' ? () => handleGenerateVideo(node.id) : undefined,
          onOpenSceneGallery: node.type === 'scene' ? () => {
            sceneGalleryTargetNodeRef.current = node.id;
            setShowSceneGallery(true);
          } : undefined,
          onOpenHookLibrary: node.type === 'scene' ? () => {
            hookLibraryTargetNodeRef.current = node.id;
            setShowHookLibrary(true);
          } : undefined,
          onBranch: (node.type === 'scene' || node.type === 'video' || node.type === 'extension')
            ? () => handleBranch(node.id) : undefined,
          // Connected data for video nodes
          connectedPrompt: connectedData?.prompt,
          connectedImageUrl: connectedData?.imageUrl,
          // Connected data for extension nodes
          connectedVideo: node.type === 'extension' ? connectedData?.videoData : undefined,
          // Connected context nodes
          connectedCharacter: connectedData?.characterData,
          connectedProduct: connectedData?.productData,
          connectedSetting: connectedData?.settingData,
          // Connected videos for stitch nodes
          connectedVideos: node.type === 'stitch' ? connectedVideos : undefined,
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

  // Update video/extension/stitch node connected data - accepts optional overrides, falls back to refs
  const updateVideoNodeConnectedData = useCallback((
    nodeId: string,
    nodesOverride?: Node[],
    connectionsOverride?: BackendConnection[]
  ) => {
    const nodesToUse = nodesOverride || backendNodesRef.current;
    const connectionsToUse = connectionsOverride || backendConnectionsRef.current;

    const { prompt, imageUrl, videoData, characterData, productData, settingData } = getConnectedData(nodeId, nodesToUse, connectionsToUse);
    const connectedVideos = getConnectedVideosForStitch(nodeId, nodesToUse, connectionsToUse);

    setNodes(nds =>
      nds.map(n => {
        if (n.id !== nodeId) return n;

        if (n.type === 'video') {
          return { ...n, data: { ...n.data, connectedPrompt: prompt, connectedImageUrl: imageUrl, connectedCharacter: characterData, connectedProduct: productData, connectedSetting: settingData } };
        }

        if (n.type === 'extension') {
          return { ...n, data: { ...n.data, connectedPrompt: prompt, connectedVideo: videoData } };
        }

        if (n.type === 'stitch') {
          return { ...n, data: { ...n.data, connectedVideos } };
        }

        return n;
      })
    );
  }, []);

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

  // Handle connection creation — optimistic update with ref-based validation
  const handleConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    // Validate: no self-connections
    if (connection.source === connection.target) return;

    // Use refs to get latest state (avoids stale closure bugs)
    const currentNodes = backendNodesRef.current;
    const currentEdges = edgesRef.current;

    // Get source and target nodes for validation
    const sourceNode = currentNodes.find(n => n.id === connection.source);
    const targetNode = currentNodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // Validate: no duplicate connections to the same handle
    const exists = currentEdges.some(
      e => e.source === connection.source &&
           e.target === connection.target &&
           e.sourceHandle === connection.sourceHandle &&
           e.targetHandle === connection.targetHandle
    );
    if (exists) return;

    // Validate: no multiple connections to the same input handle
    const handleAlreadyConnected = currentEdges.some(
      e => e.target === connection.target && e.targetHandle === connection.targetHandle
    );
    if (handleAlreadyConnected) {
      console.warn('This input handle already has a connection');
      return;
    }

    // Add edge OPTIMISTICALLY before the API call so it renders immediately
    const tempId = `temp-${Date.now()}`;
    const tempEdge: Edge = {
      id: tempId,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || null,
      targetHandle: connection.targetHandle || null,
      type: 'custom',
      data: { backendId: tempId },
    };
    setEdges(eds => addEdge(tempEdge, eds));

    try {
      // Persist to backend
      const newConnection = await connectionsApi.create(projectId, {
        source_node_id: connection.source,
        target_node_id: connection.target,
        source_handle: connection.sourceHandle || undefined,
        target_handle: connection.targetHandle || undefined,
      }, shareTokenRef.current);

      // Replace temp edge with the real backend-persisted edge
      setEdges(eds => eds.map(e => e.id === tempId ? {
        ...e,
        id: newConnection.id,
        source: newConnection.source_node_id,
        target: newConnection.target_node_id,
        sourceHandle: newConnection.source_handle || null,
        targetHandle: newConnection.target_handle || null,
        data: { backendId: newConnection.id },
      } : e));

      // Update backend connections state using ref for latest value
      const latestConnections = backendConnectionsRef.current;
      const updatedConnections = [...latestConnections, newConnection as BackendConnection];
      setBackendConnections(updatedConnections);

      console.log('[handleConnect] Connection created:', {
        source: connection.source,
        target: connection.target,
        sourceType: sourceNode.type,
        targetType: targetNode.type,
      });

      // Update video/extension/stitch nodes if affected
      if (targetNode.type === 'video' || targetNode.type === 'extension' || targetNode.type === 'stitch') {
        const latestNodes = backendNodesRef.current;
        updateVideoNodeConnectedData(connection.target, latestNodes, updatedConnections);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
      // Remove the optimistic edge on failure
      setEdges(eds => eds.filter(e => e.id !== tempId));
    }
  }, [projectId, updateVideoNodeConnectedData]);

  // Handle edge delete — uses refs to avoid stale closures
  const handleEdgeDelete = useCallback(async (edgesToDelete: Edge[]) => {
    let currentConnections = [...backendConnectionsRef.current];
    const currentNodes = backendNodesRef.current;

    for (const edge of edgesToDelete) {
      // Skip temp edges that haven't been persisted yet
      if (edge.id.startsWith('temp-')) continue;

      try {
        await connectionsApi.delete(projectId, edge.id, shareTokenRef.current);

        currentConnections = currentConnections.filter(c => c.id !== edge.id);
        setBackendConnections(currentConnections);

        const targetNode = currentNodes.find(n => n.id === edge.target);
        if (targetNode && (targetNode.type === 'video' || targetNode.type === 'extension' || targetNode.type === 'stitch')) {
          updateVideoNodeConnectedData(edge.target, currentNodes, currentConnections);
        }
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    }
  }, [projectId, updateVideoNodeConnectedData]);

  // Handle node creation
  const handleAddNode = async (type: 'image' | 'prompt' | 'video' | 'container' | 'ratio' | 'scene' | 'extension' | 'character' | 'product' | 'setting' | 'stitch') => {
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

  // Handle branch - clone downstream subgraph
  const handleBranch = async (nodeId: string) => {
    try {
      const result = await nodesApi.branch(projectId, nodeId, { offset_y: 250 }, shareToken);
      console.log('[Branch] Created', result.cloned_nodes.length, 'nodes,', result.cloned_connections.length, 'connections, group:', result.branch_group_id);

      // Add cloned nodes to backend state
      const newNodes = result.cloned_nodes as unknown as Node[];
      setBackendNodes(prev => {
        // Also update original nodes with branch_group_id
        const updated = prev.map(n => {
          const originalData = result.cloned_nodes.find(cn => cn.data?.branch_source_node_id === n.id);
          if (originalData && !n.data?.branch_group_id) {
            return { ...n, data: { ...n.data, branch_group_id: result.branch_group_id } };
          }
          return n;
        });
        return [...updated, ...newNodes];
      });

      // Add cloned connections to backend state
      const newConnections = result.cloned_connections as unknown as BackendConnection[];
      setBackendConnections(prev => [...prev, ...newConnections]);

      // Transform and add to React Flow
      setNodes(nds => {
        // Update original nodes to show branch group
        const updated = nds.map(n => {
          const nodeData = (n.data as any)?.data as Record<string, any> | undefined;
          if (nodeData && !nodeData.branch_group_id) {
            const isOriginal = result.cloned_nodes.some(cn => cn.data?.branch_source_node_id === n.id);
            if (isOriginal) {
              return {
                ...n,
                data: {
                  ...n.data,
                  data: { ...nodeData, branch_group_id: result.branch_group_id },
                },
              };
            }
          }
          return n;
        });

        // Add new cloned nodes
        const allBackendNodes = [...backendNodesRef.current, ...newNodes];
        const allConnections = [...backendConnectionsRef.current, ...newConnections];
        const rfNewNodes = transformBackendNodesToRF(newNodes, allConnections);
        return [...updated, ...rfNewNodes];
      });

      // Add edges - branch connections use 'branch' edge type
      const newEdges: Edge[] = newConnections.map(conn => ({
        id: conn.id,
        source: conn.source_node_id,
        target: conn.target_node_id,
        sourceHandle: conn.source_handle || null,
        targetHandle: conn.target_handle || null,
        type: 'branch',
        data: { backendId: conn.id, branchGroupId: result.branch_group_id },
      }));
      setEdges(eds => [...eds, ...newEdges]);

    } catch (error) {
      console.error('Failed to branch node:', error);
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

    const { prompt, imageUrl, characterData, productData, settingData } = getConnectedData(nodeId, currentNodes, currentConnections);
    console.log('Generate video:', { nodeId, prompt, imageUrl, characterData, productData, settingData, connections: currentConnections.length });

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
        character_id: characterData?.character_id,
        wardrobe_preset_id: characterData?.wardrobe_preset_id,
        product_data: productData || undefined,
        setting_data: settingData || undefined,
        resolution: videoNode.data?.resolution || '720p',
        duration: videoNode.data?.duration || 8,
        aspect_ratio: '16:9',
        use_fast_model: videoNode.data?.use_fast_model || false,
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

  // Handle video stitching - gathers connected video URLs and dispatches stitch job
  const handleStitchVideo = useCallback(async (nodeId: string) => {
    const currentNodes = backendNodesRef.current;
    const currentConnections = backendConnectionsRef.current;

    const stitchNode = currentNodes.find(n => n.id === nodeId);
    if (!stitchNode || stitchNode.type !== 'stitch') return;

    const connectedVideos = getConnectedVideosForStitch(nodeId, currentNodes, currentConnections);
    const videoUrls = connectedVideos.map(v => v.video_url).filter(Boolean);

    if (videoUrls.length < 2) {
      alert('Please connect at least 2 video nodes with generated videos');
      return;
    }

    try {
      updateNodeData(nodeId, { progress_message: 'Starting stitch...' }, 'processing');

      const job = await aiApi.stitchVideos({
        node_id: nodeId,
        video_urls: videoUrls,
        transitions: stitchNode.data?.transitions || [],
        aspect_ratio: stitchNode.data?.aspect_ratio || '16:9',
        output_format: 'mp4',
      });

      console.log('Stitch job started:', job);
      startJobPolling(job.job_id, nodeId);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Failed to stitch videos:', errorMessage, error);
      updateNodeData(
        nodeId,
        { progress_message: `Stitch failed: ${errorMessage}` },
        'failed',
        errorMessage
      );
    }
  }, [updateNodeData, startJobPolling]);

  // Handle adding a scene node from the gallery
  const handleAddSceneFromGallery = async (sceneDefinition: SceneDefinitionItem | null) => {
    setShowSceneGallery(false);

    // If we have a target node (changing scene type on existing node), update it
    const targetNodeId = sceneGalleryTargetNodeRef.current;
    sceneGalleryTargetNodeRef.current = null;

    if (targetNodeId) {
      const nodeData = sceneDefinition
        ? {
            scene_definition_id: sceneDefinition.id,
            scene_name: sceneDefinition.name,
            scene_category: sceneDefinition.category,
            scene_tone: sceneDefinition.tone,
            scene_duration: sceneDefinition.duration,
            prompt_template: sceneDefinition.prompt_template,
            default_script: sceneDefinition.default_script,
            script_text: sceneDefinition.default_script || '',
            setting: sceneDefinition.setting,
          }
        : {
            scene_definition_id: null,
            scene_name: null,
            scene_category: null,
            scene_tone: null,
            scene_duration: 5,
            prompt_template: null,
            default_script: null,
            script_text: '',
            setting: {},
          };
      handleNodeUpdate(targetNodeId, nodeData);
      return;
    }

    // Otherwise create a new scene node
    try {
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

      const nodeData = sceneDefinition
        ? {
            scene_definition_id: sceneDefinition.id,
            scene_name: sceneDefinition.name,
            scene_category: sceneDefinition.category,
            scene_tone: sceneDefinition.tone,
            scene_duration: sceneDefinition.duration,
            prompt_template: sceneDefinition.prompt_template,
            default_script: sceneDefinition.default_script,
            script_text: sceneDefinition.default_script || '',
            setting: sceneDefinition.setting,
          }
        : {};

      const newNode = await nodesApi.create(projectId, {
        type: 'scene',
        position_x: posX,
        position_y: posY,
        data: nodeData,
      }, shareToken);

      setBackendNodes(prev => [...prev, newNode as Node]);
      setNodes(nds => [...nds, ...transformBackendNodesToRF([newNode as Node], backendConnections)]);
    } catch (error) {
      console.error('Failed to create scene node:', error);
    }
  };

  // Handle instantiating a template onto the canvas
  const handleInstantiateTemplate = async (template: TemplateItem, variables: Record<string, string>) => {
    setShowTemplateBrowser(false);

    try {
      // Calculate offset to place template at viewport center
      let offsetX = 0;
      let offsetY = 0;

      if (reactFlowInstance.current) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const flowCenter = reactFlowInstance.current.screenToFlowPosition({ x: centerX, y: centerY });
        offsetX = flowCenter.x;
        offsetY = flowCenter.y;
      }

      const result = await templatesApi.instantiate(template.id, {
        project_id: projectId,
        offset_x: offsetX,
        offset_y: offsetY,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      });

      // Add returned nodes to state
      const newNodes = result.nodes as Node[];
      const newConnections = result.connections as BackendConnection[];

      setBackendNodes(prev => [...prev, ...newNodes]);
      setBackendConnections(prev => [...prev, ...newConnections]);

      // Transform and add to React Flow
      const allNodes = [...backendNodesRef.current, ...newNodes];
      const allConnections = [...backendConnectionsRef.current, ...newConnections];

      setNodes(nds => [...nds, ...transformBackendNodesToRF(newNodes, allConnections)]);
      setEdges(eds => [...eds, ...transformBackendConnectionsToRF(newConnections)]);
    } catch (error) {
      console.error('Failed to instantiate template:', error);
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
      title: "Character",
      icon: (
        <IconUser className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('character');
      },
      id: 'character',
    },
    {
      title: "Product",
      icon: (
        <IconPackage className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('product');
      },
      id: 'product',
    },
    {
      title: "Setting",
      icon: (
        <IconMapPin className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('setting');
      },
      id: 'setting',
    },
    {
      title: "Scene",
      icon: (
        <IconMovie className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        sceneGalleryTargetNodeRef.current = null;
        setShowSceneGallery(true);
      },
      id: 'scene',
    },
    {
      title: "Hooks",
      icon: (
        <IconSparkles className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        hookLibraryTargetNodeRef.current = null;
        setShowHookLibrary(true);
      },
      id: 'hooks',
    },
    {
      title: "Templates",
      icon: (
        <IconComponents className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowTemplateBrowser(true);
      },
      id: 'templates',
    },
    {
      title: "Stitch",
      icon: (
        <IconLink className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleAddNode('stitch');
      },
      id: 'stitch',
    },
    {
      title: "A/B Compare",
      icon: (
        <IconGitBranch className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowABPanel(true);
      },
      id: 'ab-compare',
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
        <ScreenshotCapture projectId={projectId} />
      </ReactFlow>

      {/* Save button (top right) */}
      <button
        onClick={async () => {
          setIsSaving(true);
          try {
            await (window as any).captureThumbnail?.();
          } catch (err) {
            console.error('Save failed:', err);
          } finally {
            setTimeout(() => setIsSaving(false), 2000);
          }
        }}
        disabled={isSaving}
        className="fixed top-5 right-5 z-50 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        title="Save thumbnail (Cmd/Ctrl + S)"
      >
        {isSaving ? (
          <>
            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </>
        )}
      </button>

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

      {/* Scene Gallery Panel */}
      <SceneGalleryPanel
        open={showSceneGallery}
        onClose={() => {
          setShowSceneGallery(false);
          sceneGalleryTargetNodeRef.current = null;
        }}
        onSelect={handleAddSceneFromGallery}
      />

      {/* Template Browser Panel */}
      <TemplateBrowserPanel
        open={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelect={handleInstantiateTemplate}
      />

      {/* A/B Comparison Panel */}
      <ABComparisonPanel
        open={showABPanel}
        onClose={() => setShowABPanel(false)}
        nodes={backendNodes}
        onUpdateNode={handleNodeUpdate}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogState.open}
        onClose={() => setExportDialogState({ open: false, videoUrl: null, nodeId: null })}
        videoUrl={exportDialogState.videoUrl}
        nodeId={exportDialogState.nodeId}
      />

      {/* Hook Library Panel */}
      <HookLibraryPanel
        open={showHookLibrary}
        onClose={() => {
          setShowHookLibrary(false);
          hookLibraryTargetNodeRef.current = null;
        }}
        onSelect={async (hookText: string) => {
          setShowHookLibrary(false);
          const targetNodeId = hookLibraryTargetNodeRef.current;
          hookLibraryTargetNodeRef.current = null;
          if (targetNodeId) {
            // Opened from a scene node — fill its script
            handleNodeUpdate(targetNodeId, { script_text: hookText });
          } else {
            // Opened from dock — create a new scene node with the hook as script
            try {
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
                type: 'scene',
                position_x: posX,
                position_y: posY,
                data: {
                  scene_category: 'hook',
                  scene_name: 'Hook Scene',
                  scene_duration: 3,
                  script_text: hookText,
                },
              }, shareToken);
              setBackendNodes(prev => [...prev, newNode as Node]);
              setNodes(nds => [...nds, ...transformBackendNodesToRF([newNode as Node], backendConnections)]);
            } catch (error) {
              console.error('Failed to create scene node from hook:', error);
            }
          }
        }}
      />
    </div>
  );
}

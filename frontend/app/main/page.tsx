"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlowCanvas from "@/components/canvas/ReactFlowCanvas";
import BackendConnection from "@/components/BackendConnection";
import FigmaSidebar from "@/components/FigmaSidebar";
import { useAuth } from "@/lib/contexts/AuthContext";
import { projectsApi } from "@/lib/api";

export default function MainPage() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [isSharedAccess, setIsSharedAccess] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check for share token first (allows guest access)
  useEffect(() => {
    const shareParam = searchParams.get('share');
    if (shareParam) {
      setShareToken(shareParam);
      setIsSharedAccess(true);
      loadSharedProject(shareParam);
    } else if (!authLoading && !isAuthenticated) {
      // No share token and not authenticated - redirect to login
      router.push('/login');
    }
  }, [searchParams, authLoading, isAuthenticated, router]);

  // Load authenticated user's project if no share token
  useEffect(() => {
    if (isSharedAccess) return; // Skip if using shared access
    if (!isAuthenticated) return;

    const projectIdParam = searchParams.get('project');
    if (projectIdParam) {
      setProjectId(projectIdParam);
      loadProject(projectIdParam);
    } else {
      // Try to get or create a default project
      loadOrCreateProject();
    }
  }, [isAuthenticated, searchParams, isSharedAccess]);

  const loadSharedProject = async (token: string) => {
    try {
      setLoading(true);
      const project = await projectsApi.getShared(token);
      setProjectId(project.id);
      setProjectName(project.name);
    } catch (error) {
      console.error('Failed to load shared project:', error);
      // Shared project not found or disabled
      router.push('/login?error=shared_not_found');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async (id: string) => {
    try {
      const project = await projectsApi.get(id);
      setProjectName(project.name);
      setProjectId(id);
    } catch (error) {
      console.error('Failed to load project:', error);
      setShowProjectDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateProject = async () => {
    try {
      const projects = await projectsApi.list();
      if (projects.length > 0) {
        const project = projects[0];
        setProjectId(project.id);
        setProjectName(project.name);
        router.replace(`/main?project=${project.id}`);
      } else {
        setShowProjectDialog(true);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setShowProjectDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (name: string) => {
    try {
      const project = await projectsApi.create(name, 'AI Video Generation Project');
      setProjectId(project.id);
      setProjectName(project.name);
      setShowProjectDialog(false);
      router.replace(`/main?project=${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated and not shared access (will redirect)
  if (!isAuthenticated && !isSharedAccess) {
    return null;
  }

  // Show project dialog if no project (only for authenticated users)
  if (showProjectDialog && !isSharedAccess) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
        <div className="bg-[#0f0f0f] p-8 rounded-lg border border-neutral-800/50 max-w-md w-full">
          <h2 className="text-xl font-semibold text-neutral-200 mb-4">Create New Project</h2>
          <input
            type="text"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && projectName.trim()) {
                handleCreateProject(projectName.trim());
              }
            }}
            className="w-full px-4 py-2 bg-[#0a0a0a] text-neutral-200 rounded-lg border border-neutral-800 focus:border-neutral-600 focus:outline-none mb-4 placeholder:text-neutral-600"
            autoFocus
          />
          <button
            onClick={() => {
              if (projectName.trim()) {
                handleCreateProject(projectName.trim());
              }
            }}
            disabled={!projectName.trim()}
            className="w-full py-2 px-4 bg-neutral-800 text-neutral-200 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-neutral-400">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[#1a1a1a]">
      {/* React Flow Canvas - pass share token for WebSocket */}
      <ReactFlowCanvas projectId={projectId} shareToken={shareToken} />

      {/* Backend Connection Status */}
      <BackendConnection />

      {/* User Info & Logout - different UI for guests */}
      <div className="absolute top-14 left-4 z-20 bg-[#2a2a2a] px-4 py-2 rounded-lg shadow-lg border border-gray-700 flex items-center gap-3">
        <div className="text-sm">
          <div className="text-gray-400 text-xs">Project</div>
          <div className="text-white font-medium">{projectName}</div>
        </div>
        
        {isSharedAccess ? (
          <>
            <div className="w-px h-6 bg-gray-600"></div>
            <div className="text-sm">
              <div className="text-gray-400 text-xs">Access</div>
              <div className="text-[var(--color-success)] font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-current"></span>
                Shared Link
              </div>
            </div>
            {!isAuthenticated && (
              <button
                onClick={() => router.push('/login')}
                className="ml-2 px-3 py-1.5 text-xs bg-[var(--color-accent-primary)] text-white rounded hover:bg-[var(--color-accent-primary-hover)] transition-colors"
              >
                Sign In
              </button>
            )}
          </>
        ) : (
          <>
            <div className="w-px h-6 bg-gray-600"></div>
            <div className="text-sm">
              <div className="text-gray-400 text-xs">User</div>
              <div className="text-white font-medium">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="ml-2 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </FigmaSidebar>
  );
}

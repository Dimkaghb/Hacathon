"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NodeEditor from "@/components/NodeEditor";
import BackendConnection from "@/components/BackendConnection";
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

  useEffect(() => {
    // Redirect to login if not authenticated (after loading check)
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const projectIdParam = searchParams.get('project');
    if (projectIdParam) {
      setProjectId(projectIdParam);
      loadProject(projectIdParam);
    } else {
      // Try to get or create a default project
      loadOrCreateProject();
    }
  }, [isAuthenticated, searchParams]);

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

  // Show loading or nothing while checking auth
  if (authLoading || loading) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show project dialog if no project
  if (showProjectDialog) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
        <div className="bg-[#2a2a2a] p-8 rounded-lg border border-gray-700 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Create New Project</h2>
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
            className="w-full px-4 py-2 bg-[#1a1a1a] text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
            autoFocus
          />
          <button
            onClick={() => {
              if (projectName.trim()) {
                handleCreateProject(projectName.trim());
              }
            }}
            disabled={!projectName.trim()}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[#1a1a1a]">
      {/* Node Editor */}
      <NodeEditor projectId={projectId} />

      {/* Backend Connection Status */}
      <BackendConnection />

      {/* User Info & Logout */}
      <div className="absolute top-4 left-4 z-20 bg-[#2a2a2a] px-4 py-2 rounded-lg shadow-lg border border-gray-700 flex items-center gap-3">
        <div className="text-sm">
          <div className="text-gray-400 text-xs">Project</div>
          <div className="text-white font-medium">{projectName}</div>
        </div>
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
      </div>
    </div>
  );
}

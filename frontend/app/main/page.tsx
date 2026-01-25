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
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
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
    <FigmaSidebar
      projectName={projectName}
      userEmail={user?.email}
      onLogout={logout}
    >
      <div className="relative w-full h-full">
        {/* React Flow Canvas */}
        <ReactFlowCanvas projectId={projectId} />

        {/* Backend Connection Status */}
        <BackendConnection />
      </div>
    </FigmaSidebar>
  );
}

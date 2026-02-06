"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlowCanvas from "@/components/canvas/ReactFlowCanvas";
import BackendConnection from "@/components/BackendConnection";
import { Sidebar, SidebarBody, SidebarLink, SidebarSection, SidebarDivider } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/contexts/AuthContext";
import { projectsApi } from "@/lib/api";
import { motion } from "framer-motion";
import {
  IconFolder,
  IconVideo,
  IconLogout,
  IconPlus,
} from "@tabler/icons-react";

function MainPageContent() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [isSharedAccess, setIsSharedAccess] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Check for share token first (allows guest access)
  useEffect(() => {
    const shareParam = searchParams.get('share');
    if (shareParam) {
      setShareToken(shareParam);
      setIsSharedAccess(true);
      loadSharedProject(shareParam);
    } else if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [searchParams, authLoading, isAuthenticated, router]);

  // Load authenticated user's project if no share token
  useEffect(() => {
    if (isSharedAccess) return;
    if (!isAuthenticated) return;

    const projectIdParam = searchParams.get('project');
    if (projectIdParam) {
      setProjectId(projectIdParam);
      loadProject(projectIdParam);
    } else {
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
      router.push('/login?error=shared_not_found');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async (id: string) => {
    try {
      const [project, projects] = await Promise.all([
        projectsApi.get(id),
        projectsApi.list(),
      ]);
      setProjectName(project.name);
      setProjectId(id);
      setRecentProjects(projects.slice(0, 5).map(p => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error('Failed to load project:', error);
      setShowProjectDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateProject = async () => {
    // No project param specified — redirect to dashboard
    router.replace('/dashboard');
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

  // Handle project switch
  const handleProjectSwitch = (id: string, name: string) => {
    setProjectId(id);
    setProjectName(name);
    router.replace(`/main?project=${id}`);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
          <span className="text-[#606060] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated && !isSharedAccess) {
    return null;
  }

  // Project dialog
  if (showProjectDialog && !isSharedAccess) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0f0f0f] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-md w-full mx-4"
        >
          <h2 className="text-xl font-medium text-white mb-2">Create New Project</h2>
          <p className="text-[#606060] text-sm mb-6">Start a new AI video generation workflow</p>
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
            className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-4 placeholder-[#4a4a4a]"
            autoFocus
          />
          <button
            onClick={() => {
              if (projectName.trim()) {
                handleCreateProject(projectName.trim());
              }
            }}
            disabled={!projectName.trim()}
            className="w-full py-3 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </motion.div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
          <span className="text-[#606060] text-sm">Loading project...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f0f0f]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-6">
          {/* Top section */}
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-white to-[#808080] flex items-center justify-center shrink-0">
                <IconVideo className="w-4 h-4 text-black" />
              </div>
              <motion.span
                animate={{
                  display: sidebarOpen ? "block" : "none",
                  opacity: sidebarOpen ? 1 : 0,
                }}
                className="text-white font-semibold text-sm whitespace-pre"
              >
                Axel
              </motion.span>
            </div>

            {/* New Project Button */}
            <SidebarLink
              link={{
                label: "New Project",
                icon: <IconPlus className="h-5 w-5 shrink-0 text-[#808080]" />,
                onClick: () => setShowProjectDialog(true),
              }}
            />

            <SidebarDivider />

            {/* Recent Projects */}
            <SidebarSection title="Recent">
              {recentProjects.map((project) => (
                <SidebarLink
                  key={project.id}
                  link={{
                    label: project.name,
                    icon: <IconFolder className={`h-5 w-5 shrink-0 ${project.id === projectId ? 'text-white' : 'text-[#808080]'}`} />,
                    onClick: () => handleProjectSwitch(project.id, project.name),
                  }}
                  className={project.id === projectId ? 'bg-[#2a2a2a]' : ''}
                />
              ))}
            </SidebarSection>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col gap-1">
            <SidebarDivider />
            <SidebarLink
              link={{
                label: "Logout",
                icon: <IconLogout className="h-5 w-5 shrink-0 text-[#808080]" />,
                onClick: logout,
              }}
            />

            {/* User info */}
            <SidebarDivider />
            <SidebarLink
              link={{
                label: user?.email || "User",
                href: "#",
                icon: (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] flex items-center justify-center shrink-0 text-white text-xs font-medium">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content area - Full canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowCanvas projectId={projectId} shareToken={shareToken} />
      </div>

      {/* Backend Connection Status */}
      <BackendConnection />
    </div>
  );
}

export default function MainPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen overflow-hidden bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
          <span className="text-[#606060] text-sm">Loading...</span>
        </div>
      </div>
    }>
      <MainPageContent />
    </Suspense>
  );
}

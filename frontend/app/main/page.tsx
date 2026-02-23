"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlowCanvas from "@/components/canvas/ReactFlowCanvas";
import BackendConnection from "@/components/BackendConnection";
import { Sidebar, SidebarBody, SidebarLink, SidebarSection, SidebarDivider, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/contexts/AuthContext";
import { projectsApi } from "@/lib/api";
import { CreditDisplay } from "@/components/ui/CreditDisplay";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconVideo,
  IconLogout,
  IconSettings,
  IconFileText,
  IconLayoutBoard,
} from "@tabler/icons-react";
import ScriptEditor from "@/components/canvas/ScriptEditor";
import { CirclePlus } from "@/components/animate-ui/icons/circle-plus";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { FoldersIcon } from "@/components/animate-ui/icons/folders";

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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [editorMode, setEditorMode] = useState<'canvas' | 'script'>('canvas');

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

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as globalThis.Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} overlay>
        <SidebarBody className="justify-between gap-6">
          {/* Top section */}
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1 mb-4">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-white to-[#808080] flex items-center justify-center shrink-0">
                <IconVideo className="w-3.5 h-3.5 text-black" />
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

            {/* Back to Dashboard */}
            {!isSharedAccess && (
              <SidebarLink
                link={{
                  label: "Back to Dashboard",
                  icon: <ChevronLeft size={16} className="shrink-0 text-[#808080]" />,
                  onClick: () => router.push('/dashboard'),
                }}
              />
            )}

            {/* New Project Button */}
            {!isSharedAccess && (
              <SidebarLink
                link={{
                  label: "New Project",
                  icon: <CirclePlus size={16} className="shrink-0 text-[#808080]" />,
                  onClick: () => setShowProjectDialog(true),
                }}
              />
            )}

            <SidebarDivider />

            {/* Recent Projects */}
            <SidebarSection>
              {recentProjects.map((project) => (
                <SidebarLink
                  key={project.id}
                  link={{
                    label: project.name,
                    icon: <FoldersIcon size={16} className={`shrink-0 ${project.id === projectId ? 'text-white' : 'text-[#808080]'}`} />,
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
            <CreditDisplay />
            <SidebarDivider />

            {/* User avatar with dropdown */}
            <div ref={userDropdownRef} className="relative" onMouseLeave={() => setUserDropdownOpen(false)}>
              <button
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 w-full py-1.5 px-2 rounded-md hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] flex items-center justify-center shrink-0 text-white text-[10px] font-medium">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <motion.span
                  animate={{
                    display: sidebarOpen ? "inline-block" : "none",
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  className="text-[#a0a0a0] text-xs whitespace-pre truncate"
                >
                  {user?.email || "User"}
                </motion.span>
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-1 w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-3 py-2 border-b border-[#2a2a2a]">
                      <p className="text-white text-xs font-medium truncate">
                        {user?.email || "User"}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] transition-colors text-xs"
                      >
                        <IconSettings className="w-3.5 h-3.5" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[#a0a0a0] hover:text-[#ef4444] hover:bg-[#2a2a2a] transition-colors text-xs"
                      >
                        <IconLogout className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Mode toggle — only in canvas mode; script mode has its own "Open in Canvas" in its top bar */}
        {!isSharedAccess && editorMode === 'canvas' && (
          <button
            onClick={() => setEditorMode('script')}
            className="absolute top-5 right-28 z-40 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[#2a2a2a] bg-[#1a1a1a]/80 backdrop-blur-sm text-[#a0a0a0] hover:border-[#3a3a3a] hover:text-white transition-colors"
          >
            <IconFileText className="w-3.5 h-3.5" />
            Script Mode
          </button>
        )}
        <SubscriptionGate>
          {editorMode === 'canvas' ? (
            <ReactFlowCanvas projectId={projectId} shareToken={shareToken} />
          ) : (
            <ScriptEditor
              projectId={projectId}
              onSwitchToCanvas={() => setEditorMode('canvas')}
              onGraphCreated={() => setEditorMode('canvas')}
            />
          )}
        </SubscriptionGate>
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

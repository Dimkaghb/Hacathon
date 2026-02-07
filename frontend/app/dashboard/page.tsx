"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { projectsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconLogout,
  IconTrash,
  IconSettings,
  IconVideo,
} from "@tabler/icons-react";
import { DitherShader } from "@/components/ui/dither-shader";

interface Project {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// Empty placeholder thumbnail
function EmptyThumbnail() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0f0f0f]/60">
      <div className="flex flex-col items-center gap-2 opacity-30">
        <IconVideo className="w-8 h-8 text-[#606060]" />
        <span className="text-[#3a3a3a] text-[10px]">No preview</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated, loadProjects]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as globalThis.Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await projectsApi.create(newProjectName.trim(), "AI Video Generation Project");
      setNewProjectName("");
      setShowCreateDialog(false);
      loadProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectsApi.delete(id);
      setDeleteConfirm(null);
      loadProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleOpenProject = (id: string) => {
    router.push(`/main?project=${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
          <span className="text-[#606060] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0a0a]">
      {/* Dithered background — always visible */}
      <div className="absolute inset-0 pointer-events-none">
        <DitherShader
          src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2670&auto=format&fit=crop"
          gridSize={2}
          ditherMode="bayer"
          colorMode="grayscale"
          invert={false}
          animated={false}
          animationSpeed={0.02}
          primaryColor="#000000"
          secondaryColor="#f5f5f5"
          threshold={0.5}
          className="h-full w-full opacity-30"
        />
      </div>

      {/* User avatar dropdown */}
      <div ref={dropdownRef} className="fixed top-5 right-5 z-50">
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white text-sm font-medium hover:border-[#4a4a4a] transition-colors"
        >
          {user?.email?.charAt(0).toUpperCase() || "U"}
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#2a2a2a]">
                <p className="text-white text-sm font-medium truncate">
                  {user?.email || "User"}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] transition-colors text-sm"
                >
                  <IconSettings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0a0] hover:text-[#ef4444] hover:bg-[#2a2a2a] transition-colors text-sm"
                >
                  <IconLogout className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content — layered above dithered bg */}
      <div className="relative z-10 h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
              <span className="text-[#606060] text-sm">Loading projects...</span>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto h-full p-6">
            <h1 className="text-white text-lg font-medium mb-6">Projects</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* New Project Card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCreateDialog(true)}
                className="group relative bg-[#1a1a1a]/40 backdrop-blur-md border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] flex items-center justify-center"
              >
                {/* Match height structure of project cards */}
                <div className="h-32"></div>
                <div className="p-4">
                  <div className="h-5"></div>
                  <div className="h-4"></div>
                </div>

                {/* Centered content overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <IconPlus className="w-10 h-10 text-[#4a4a4a] group-hover:text-[#6a6a6a] transition-colors" />
                    <h3 className="text-white text-xs font-medium">
                      New Project
                    </h3>
                    <p className="text-[#606060] text-[10px]">
                      Click to create
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Existing Projects */}
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                  onDoubleClick={() => handleOpenProject(project.id)}
                >
                  {/* Thumbnail preview */}
                  <div className="h-32 bg-[#0f0f0f]/60 border-b border-[#2a2a2a] relative">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fall back to empty placeholder if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-full h-full';
                            parent.appendChild(placeholder);
                            const root = parent.ownerDocument.createElement('div');
                            placeholder.appendChild(root);
                          }
                        }}
                      />
                    ) : (
                      <EmptyThumbnail />
                    )}
                  </div>

                  {/* Card info */}
                  <div className="p-4 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between">
                      <h3 className="text-white text-sm font-medium truncate pr-2">
                        {project.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#2a2a2a]"
                        title="Delete project"
                      >
                        <IconTrash className="w-3.5 h-3.5 text-[#606060] hover:text-[#ef4444]" />
                      </button>
                    </div>
                    <p className="text-[#606060] text-[11px]">
                      {formatDate(project.updated_at)}
                    </p>
                  </div>

                  {/* Click hint */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[#606060] text-[10px]">
                      double-click to open
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create project dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowCreateDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-medium text-white mb-2">
                Create New Project
              </h2>
              <p className="text-[#606060] text-sm mb-6">
                Start a new AI video generation workflow
              </p>
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    handleCreateProject();
                  }
                }}
                className="w-full px-4 py-3 bg-[#0a0a0a] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-4 placeholder-[#4a4a4a]"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewProjectName("");
                  }}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="flex-1 py-3 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-medium text-white mb-2">
                Delete Project
              </h2>
              <p className="text-[#808080] text-sm mb-6">
                This action cannot be undone. All nodes and connections in this
                project will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProject(deleteConfirm)}
                  className="flex-1 py-3 px-4 bg-[#ef4444] text-white rounded-lg text-sm font-medium hover:bg-[#dc2626] transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

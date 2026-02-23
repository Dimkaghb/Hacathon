"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  projectsApi,
  campaignsApi,
  type CampaignItem,
  type CampaignDetail,
} from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconLogout,
  IconTrash,
  IconSettings,
  IconVideo,
  IconFolder,
  IconChevronDown,
  IconChevronRight,
  IconUsers,
  IconUser,
  IconArchive,
  IconPlayerPlay,
  IconEdit,
  IconX,
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-[#a0a0a0]", bg: "bg-[#2a2a2a]" },
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  archived: { label: "Archived", color: "text-[#606060]", bg: "bg-[#1a1a1a]" },
};

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

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
  const router = useRouter();

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<CampaignDetail | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");
  const [deleteCampaignConfirm, setDeleteCampaignConfirm] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);

  // Assign project to campaign
  const [assignProjectDialog, setAssignProjectDialog] = useState<string | null>(null);

  // User dropdown
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

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await campaignsApi.list();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
      loadCampaigns();
    }
  }, [isAuthenticated, loadProjects, loadCampaigns]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as globalThis.Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Project handlers ──────────────────────────────────────

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await projectsApi.create(
        newProjectName.trim(),
        "AI Video Generation Project"
      );
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

  // ── Campaign handlers ─────────────────────────────────────

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    try {
      await campaignsApi.create({
        name: newCampaignName.trim(),
        description: newCampaignDesc.trim() || undefined,
        status: "draft",
      });
      setNewCampaignName("");
      setNewCampaignDesc("");
      setShowCreateCampaign(false);
      loadCampaigns();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await campaignsApi.delete(id);
      setDeleteCampaignConfirm(null);
      if (expandedCampaign === id) {
        setExpandedCampaign(null);
        setExpandedDetail(null);
      }
      loadCampaigns();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
  };

  const handleToggleCampaignStatus = async (campaign: CampaignItem) => {
    const nextStatus = campaign.status === "active" ? "archived" : "active";
    try {
      await campaignsApi.update(campaign.id, { status: nextStatus });
      loadCampaigns();
      if (expandedCampaign === campaign.id) {
        const detail = await campaignsApi.getById(campaign.id);
        setExpandedDetail(detail);
      }
    } catch (error) {
      console.error("Failed to update campaign:", error);
    }
  };

  const handleUpdateCampaign = async () => {
    if (!editingCampaign) return;
    try {
      await campaignsApi.update(editingCampaign.id, {
        name: editingCampaign.name,
        description: editingCampaign.description || undefined,
      });
      setEditingCampaign(null);
      loadCampaigns();
      if (expandedCampaign === editingCampaign.id) {
        const detail = await campaignsApi.getById(editingCampaign.id);
        setExpandedDetail(detail);
      }
    } catch (error) {
      console.error("Failed to update campaign:", error);
    }
  };

  const handleExpandCampaign = async (id: string) => {
    if (expandedCampaign === id) {
      setExpandedCampaign(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedCampaign(id);
    try {
      const detail = await campaignsApi.getById(id);
      setExpandedDetail(detail);
    } catch (error) {
      console.error("Failed to load campaign details:", error);
    }
  };

  const handleAssignProject = async (campaignId: string, projectId: string) => {
    try {
      await campaignsApi.addProject(campaignId, projectId);
      setAssignProjectDialog(null);
      loadCampaigns();
      if (expandedCampaign === campaignId) {
        const detail = await campaignsApi.getById(campaignId);
        setExpandedDetail(detail);
      }
    } catch (error: any) {
      if (error?.status === 409) {
        alert("Project is already in this campaign");
      } else {
        console.error("Failed to assign project:", error);
      }
    }
  };

  const handleRemoveProjectFromCampaign = async (
    campaignId: string,
    projectId: string
  ) => {
    try {
      await campaignsApi.removeProject(campaignId, projectId);
      loadCampaigns();
      if (expandedCampaign === campaignId) {
        const detail = await campaignsApi.getById(campaignId);
        setExpandedDetail(detail);
      }
    } catch (error) {
      console.error("Failed to remove project:", error);
    }
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
      {/* Dithered background */}
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

      {/* Main content */}
      <div className="relative z-10 h-full overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
              <span className="text-[#606060] text-sm">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-[1400px] mx-auto">
            {/* ── Campaigns Section ─────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-white text-lg font-medium flex items-center gap-2">
                  <IconFolder className="w-5 h-5 text-[#606060]" />
                  Campaigns
                </h1>
                <button
                  onClick={() => setShowCreateCampaign(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-xs font-medium hover:bg-[#333] hover:text-white transition-colors border border-[#333]"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  New Campaign
                </button>
              </div>

              {campaignsLoading ? (
                <div className="flex items-center gap-2 text-[#606060] text-sm py-4">
                  <div className="w-4 h-4 border border-[#2a2a2a] border-t-white rounded-full animate-spin" />
                  Loading campaigns...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="bg-[#1a1a1a]/40 backdrop-blur-md border border-[#2a2a2a] rounded-xl p-6 text-center">
                  <IconFolder className="w-8 h-8 text-[#3a3a3a] mx-auto mb-2" />
                  <p className="text-[#606060] text-sm mb-3">
                    No campaigns yet. Organize your projects into campaigns.
                  </p>
                  <button
                    onClick={() => setShowCreateCampaign(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-xs font-medium hover:bg-[#333] transition-colors"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    Create Your First Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#2a2a2a] rounded-xl overflow-hidden transition-all duration-200 hover:border-[#3a3a3a]"
                    >
                      {/* Campaign header row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => handleExpandCampaign(campaign.id)}
                      >
                        <div className="text-[#606060]">
                          {expandedCampaign === campaign.id ? (
                            <IconChevronDown className="w-4 h-4" />
                          ) : (
                            <IconChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white text-sm font-medium truncate">
                              {campaign.name}
                            </h3>
                            <StatusBadge status={campaign.status} />
                          </div>
                          {campaign.description && (
                            <p className="text-[#606060] text-[11px] truncate mt-0.5">
                              {campaign.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[#606060] text-[11px] shrink-0">
                          <span className="flex items-center gap-1">
                            <IconVideo className="w-3.5 h-3.5" />
                            {campaign.project_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconUser className="w-3.5 h-3.5" />
                            {campaign.character_count}
                          </span>
                          <span>{formatDate(campaign.updated_at)}</span>
                        </div>

                        {/* Action buttons */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleToggleCampaignStatus(campaign)}
                            className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                            title={campaign.status === "active" ? "Archive" : "Activate"}
                          >
                            {campaign.status === "active" ? (
                              <IconArchive className="w-3.5 h-3.5 text-[#606060] hover:text-[#a0a0a0]" />
                            ) : (
                              <IconPlayerPlay className="w-3.5 h-3.5 text-[#606060] hover:text-emerald-400" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingCampaign(campaign)}
                            className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                            title="Edit"
                          >
                            <IconEdit className="w-3.5 h-3.5 text-[#606060] hover:text-[#a0a0a0]" />
                          </button>
                          <button
                            onClick={() => setDeleteCampaignConfirm(campaign.id)}
                            className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                            title="Delete"
                          >
                            <IconTrash className="w-3.5 h-3.5 text-[#606060] hover:text-[#ef4444]" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded campaign detail */}
                      <AnimatePresence>
                        {expandedCampaign === campaign.id && expandedDetail && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[#2a2a2a] px-4 py-3">
                              {/* Projects in campaign */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[#808080] text-xs font-medium uppercase tracking-wider">
                                    Projects ({expandedDetail.projects.length})
                                  </span>
                                  <button
                                    onClick={() =>
                                      setAssignProjectDialog(campaign.id)
                                    }
                                    className="flex items-center gap-1 text-[#606060] hover:text-white text-[11px] transition-colors"
                                  >
                                    <IconPlus className="w-3 h-3" />
                                    Add Project
                                  </button>
                                </div>

                                {expandedDetail.projects.length === 0 ? (
                                  <p className="text-[#4a4a4a] text-xs py-2">
                                    No projects assigned yet.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {expandedDetail.projects.map((proj) => (
                                      <div
                                        key={proj.id}
                                        className="group relative bg-[#0f0f0f] border border-[#222] rounded-lg overflow-hidden cursor-pointer hover:border-[#333] transition-colors"
                                        onDoubleClick={() =>
                                          handleOpenProject(proj.id)
                                        }
                                      >
                                        <div className="h-16 bg-[#0a0a0a]">
                                          {proj.thumbnail_url ? (
                                            <img
                                              src={proj.thumbnail_url}
                                              alt={proj.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <IconVideo className="w-4 h-4 text-[#333]" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="px-2 py-1.5 flex items-center justify-between">
                                          <span className="text-white text-[11px] truncate">
                                            {proj.name}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveProjectFromCampaign(
                                                campaign.id,
                                                proj.id
                                              );
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#2a2a2a]"
                                            title="Remove from campaign"
                                          >
                                            <IconX className="w-3 h-3 text-[#606060] hover:text-[#ef4444]" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Characters in campaign */}
                              {expandedDetail.characters.length > 0 && (
                                <div>
                                  <span className="text-[#808080] text-xs font-medium uppercase tracking-wider">
                                    Characters ({expandedDetail.characters.length})
                                  </span>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {expandedDetail.characters.map((char) => (
                                      <div
                                        key={char.id}
                                        className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#222] rounded-full px-2.5 py-1"
                                      >
                                        {char.source_image_url ? (
                                          <img
                                            src={char.source_image_url}
                                            alt={char.name || ""}
                                            className="w-4 h-4 rounded-full object-cover"
                                          />
                                        ) : (
                                          <IconUser className="w-3.5 h-3.5 text-[#606060]" />
                                        )}
                                        <span className="text-[#a0a0a0] text-[11px]">
                                          {char.name || "Unnamed"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Projects Section ──────────────────────────────────── */}
            <div>
              <h1 className="text-white text-lg font-medium mb-4">Projects</h1>

              {projects.length === 0 && !loading ? (
                <div className="flex items-center justify-center py-20">
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* New Project Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowCreateDialog(true)}
                    className="group relative bg-[#1a1a1a]/40 backdrop-blur-md border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] flex items-center justify-center"
                  >
                    <div className="h-32"></div>
                    <div className="p-4">
                      <div className="h-5"></div>
                      <div className="h-4"></div>
                    </div>
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
                      <div className="h-32 bg-[#0f0f0f]/60 border-b border-[#2a2a2a] relative">
                        {project.thumbnail_url ? (
                          <img
                            src={project.thumbnail_url}
                            alt={project.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <EmptyThumbnail />
                        )}
                      </div>

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

                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[#606060] text-[10px]">
                          double-click to open
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create project dialog ──────────────────────────────── */}
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

      {/* ── Create campaign dialog ─────────────────────────────── */}
      <AnimatePresence>
        {showCreateCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowCreateCampaign(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-medium text-white mb-2">
                Create Campaign
              </h2>
              <p className="text-[#606060] text-sm mb-6">
                Group related projects and characters together
              </p>
              <input
                type="text"
                placeholder="Campaign name (e.g. Summer Skincare Launch)"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCampaignName.trim()) {
                    handleCreateCampaign();
                  }
                }}
                className="w-full px-4 py-3 bg-[#0a0a0a] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-3 placeholder-[#4a4a4a]"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newCampaignDesc}
                onChange={(e) => setNewCampaignDesc(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[#0a0a0a] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-4 placeholder-[#4a4a4a] resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateCampaign(false);
                    setNewCampaignName("");
                    setNewCampaignDesc("");
                  }}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName.trim()}
                  className="flex-1 py-3 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit campaign dialog ───────────────────────────────── */}
      <AnimatePresence>
        {editingCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setEditingCampaign(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-medium text-white mb-2">
                Edit Campaign
              </h2>
              <input
                type="text"
                placeholder="Campaign name"
                value={editingCampaign.name}
                onChange={(e) =>
                  setEditingCampaign({ ...editingCampaign, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingCampaign.name.trim()) {
                    handleUpdateCampaign();
                  }
                }}
                className="w-full px-4 py-3 bg-[#0a0a0a] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-3 placeholder-[#4a4a4a]"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={editingCampaign.description || ""}
                onChange={(e) =>
                  setEditingCampaign({
                    ...editingCampaign,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="w-full px-4 py-3 bg-[#0a0a0a] text-white rounded-lg border border-[#2a2a2a] focus:border-[#3a3a3a] focus:outline-none text-sm mb-4 placeholder-[#4a4a4a] resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingCampaign(null)}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCampaign}
                  disabled={!editingCampaign.name.trim()}
                  className="flex-1 py-3 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete project dialog ──────────────────────────────── */}
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

      {/* ── Delete campaign dialog ─────────────────────────────── */}
      <AnimatePresence>
        {deleteCampaignConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setDeleteCampaignConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-medium text-white mb-2">
                Delete Campaign
              </h2>
              <p className="text-[#808080] text-sm mb-6">
                This will delete the campaign. Your projects and characters will
                not be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteCampaignConfirm(null)}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteCampaign(deleteCampaignConfirm)}
                  className="flex-1 py-3 px-4 bg-[#ef4444] text-white rounded-lg text-sm font-medium hover:bg-[#dc2626] transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Assign project to campaign dialog ──────────────────── */}
      <AnimatePresence>
        {assignProjectDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setAssignProjectDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] p-8 rounded-xl border border-[#2a2a2a] max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-medium text-white mb-2">
                Add Project to Campaign
              </h2>
              <p className="text-[#606060] text-sm mb-4">
                Select a project to add
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() =>
                      handleAssignProject(assignProjectDialog, project.id)
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#0f0f0f] border border-[#222] rounded-lg hover:border-[#444] hover:bg-[#1a1a1a] transition-colors text-left"
                  >
                    <div className="w-10 h-7 bg-[#0a0a0a] rounded overflow-hidden shrink-0">
                      {project.thumbnail_url ? (
                        <img
                          src={project.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconVideo className="w-3 h-3 text-[#333]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {project.name}
                      </p>
                      <p className="text-[#606060] text-[10px]">
                        {formatDate(project.updated_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setAssignProjectDialog(null)}
                className="w-full mt-4 py-2.5 px-4 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

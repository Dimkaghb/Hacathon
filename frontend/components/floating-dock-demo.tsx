"use client";

import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconHandGrab,
  IconPointer,
  IconComponents,
  IconGitBranch,
  IconPlayerPlay,
  IconDotsVertical,
} from "@tabler/icons-react";

interface FloatingDockDemoProps {
  onToolSelect?: (tool: "select" | "hand" | "rectangle") => void;
  currentTool?: string;
}

export default function FloatingDockDemo({ onToolSelect, currentTool }: FloatingDockDemoProps) {
  const getIconClass = (id: string) => {
    return currentTool === id
      ? "h-full w-full text-white"
      : "h-full w-full text-neutral-500 dark:text-neutral-300";
  };

  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className={getIconClass("home")} />
      ),
      href: "/",
      id: "home",
    },
    {
      title: "Hand Tool",
      icon: (
        <IconHandGrab className={getIconClass("hand")} />
      ),
      href: "#",
      onClick: () => onToolSelect?.("hand"),
      id: "hand",
    },
    {
      title: "Cursor",
      icon: (
        <IconPointer className={getIconClass("select")} />
      ),
      href: "#",
      onClick: () => onToolSelect?.("select"),
      id: "select",
    },
    {
      title: "Components",
      icon: (
        <IconComponents className={getIconClass("components")} />
      ),
      href: "#",
      id: "components",
    },
    {
      title: "Branch",
      icon: (
        <IconGitBranch className={getIconClass("branch")} />
      ),
      href: "#",
      id: "branch",
    },
    {
      title: "Shapes",
      icon: (
        <IconPlayerPlay className={getIconClass("rectangle")} />
      ),
      href: "#",
      onClick: () => onToolSelect?.("rectangle"),
      id: "rectangle",
    },
    {
      title: "More",
      icon: (
        <IconDotsVertical className={getIconClass("more")} />
      ),
      href: "#",
      id: "more",
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock items={links} activeId={currentTool} />
    </div>
  );
}

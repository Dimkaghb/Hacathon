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
  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Hand Tool",
      icon: (
        <IconHandGrab className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: () => onToolSelect?.("hand"),
    },
    {
      title: "Cursor",
      icon: (
        <IconPointer className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: () => onToolSelect?.("select"),
    },
    {
      title: "Components",
      icon: (
        <IconComponents className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Branch",
      icon: (
        <IconGitBranch className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Shapes",
      icon: (
        <IconPlayerPlay className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: () => onToolSelect?.("rectangle"),
    },
    {
      title: "More",
      icon: (
        <IconDotsVertical className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock items={links} />
    </div>
  );
}

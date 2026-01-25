"use client";

import React, { useState, useRef } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import ComponentsMenu from "@/components/ComponentsMenu";
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
  onToolSelect?: (tool: "select" | "hand" | "rectangle" | "avatar") => void;
  currentTool?: string;
}

export default function FloatingDockDemo({ onToolSelect, currentTool }: FloatingDockDemoProps) {
  const [componentsMenuOpen, setComponentsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const componentsButtonRef = useRef<HTMLElement | null>(null);

  const handleComponentsClick = (event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setComponentsMenuOpen(!componentsMenuOpen);
  };
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
      onClick: (e: React.MouseEvent) => onToolSelect?.("hand"),
      id: "hand",
    },
    {
      title: "Cursor",
      icon: (
        <IconPointer className={getIconClass("select")} />
      ),
      href: "#",
      onClick: (e: React.MouseEvent) => onToolSelect?.("select"),
      id: "select",
    },
    {
      title: "Components",
      icon: (
        <IconComponents className={getIconClass("components")} />
      ),
      href: "#",
      onClick: handleComponentsClick,
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
      onClick: (e: React.MouseEvent) => onToolSelect?.("rectangle"),
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
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={links} activeId={currentTool} />
      </div>
      <ComponentsMenu
        isOpen={componentsMenuOpen}
        onClose={() => setComponentsMenuOpen(false)}
        position={menuPosition}
        onComponentSelect={(component) => {
          if (component === "avatar") {
            onToolSelect?.("avatar");
          }
        }}
      />
    </>
  );
}

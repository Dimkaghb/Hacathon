"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLogout,
  IconSettings,
  IconFolder,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FigmaSidebarProps {
  projectName: string;
  userEmail?: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function FigmaSidebar({
  projectName,
  userEmail,
  onLogout,
  children,
}: FigmaSidebarProps) {
  const [open, setOpen] = useState(false);

  // Mock recent projects - replace with actual data
  const recentProjects = [
    { label: projectName, href: "#", icon: <IconFolder className="h-5 w-5 shrink-0 text-neutral-500" /> },
    { label: "Untitled Project", href: "#", icon: <IconFolder className="h-5 w-5 shrink-0 text-neutral-500" /> },
    { label: "Demo Video", href: "#", icon: <IconFolder className="h-5 w-5 shrink-0 text-neutral-500" /> },
  ];

  const bottomLinks = [
    {
      label: "Settings",
      href: "#",
      icon: <IconSettings className="h-5 w-5 shrink-0 text-neutral-500" />,
    },
    {
      label: "Logout",
      href: "#",
      icon: <IconLogout className="h-5 w-5 shrink-0 text-neutral-500" />,
      onClick: onLogout,
    },
  ];

  return (
    <div className={cn("flex h-screen w-full overflow-hidden bg-[#0a0a0a]")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 bg-[#0f0f0f] border-r border-neutral-800/50">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {/* Logo */}
            {open ? <Logo /> : <LogoIcon />}

            {/* Section: Recent Projects - only show when open */}
            <motion.div 
              className="mt-8"
              animate={{
                opacity: open ? 1 : 0,
                display: open ? "block" : "none",
              }}
            >
              <div className="px-2 mb-3">
                <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium">
                  Recent Projects
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {recentProjects.map((project, idx) => (
                  <SidebarLink
                    key={idx}
                    link={project}
                    className="hover:bg-neutral-800/50 rounded-lg px-2"
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col gap-1">
            {bottomLinks.map((link, idx) => (
              <SidebarLink
                key={idx}
                link={link}
                className="hover:bg-neutral-800/50 rounded-lg px-2"
              />
            ))}

            {/* User Profile */}
            <div className="border-t border-neutral-800/50 pt-3 mt-2">
              <SidebarLink
                link={{
                  label: userEmail || "User",
                  href: "#",
                  icon: (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 text-xs font-medium">
                      {userEmail?.[0]?.toUpperCase() || "U"}
                    </div>
                  ),
                }}
                className="hover:bg-neutral-800/50 rounded-lg px-2"
              />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

const Logo = () => {
  return (
    <div className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal">
      <div className="h-6 w-6 shrink-0 rounded-md bg-neutral-800 flex items-center justify-center">
        <span className="text-neutral-300 text-xs font-bold">A</span>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold whitespace-pre text-neutral-200 text-base"
      >
        Axel
      </motion.span>
    </div>
  );
};

const LogoIcon = () => {
  return (
    <div className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal">
      <div className="h-6 w-6 shrink-0 rounded-md bg-neutral-800 flex items-center justify-center">
        <span className="text-neutral-300 text-xs font-bold">A</span>
      </div>
    </div>
  );
};

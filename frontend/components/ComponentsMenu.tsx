"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconUser,
  IconTextSize,
  IconSparkles,
  IconAspectRatio,
  IconPhoto,
} from "@tabler/icons-react";

interface ComponentsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function ComponentsMenu({ isOpen, onClose, position }: ComponentsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const components = [
    {
      name: "Avatar",
      icon: <IconUser className="w-5 h-5" />,
      onClick: () => {
        console.log("Avatar clicked");
        onClose();
      },
    },
    {
      name: "Text",
      icon: <IconTextSize className="w-5 h-5" />,
      onClick: () => {
        console.log("Text clicked");
        onClose();
      },
    },
    {
      name: "Prompt",
      icon: <IconSparkles className="w-5 h-5" />,
      onClick: () => {
        console.log("Prompt clicked");
        onClose();
      },
    },
    {
      name: "Ratio",
      icon: <IconAspectRatio className="w-5 h-5" />,
      onClick: () => {
        console.log("Ratio clicked");
        onClose();
      },
    },
    {
      name: "Background",
      icon: <IconPhoto className="w-5 h-5" />,
      onClick: () => {
        console.log("Background clicked");
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[60] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden"
          style={{
            left: `${position.x}px`,
            bottom: `${window.innerHeight - position.y + 20}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="p-2 min-w-[200px]">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 uppercase tracking-wide">
              Components
            </div>
            <div className="flex flex-col gap-1">
              {components.map((component, index) => (
                <motion.button
                  key={component.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={component.onClick}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {component.icon}
                  </span>
                  <span className="text-sm font-medium">{component.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

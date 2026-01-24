"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface AvatarComponentProps {
  width: number;
  height: number;
  onImageChange?: (imageUrl: string) => void;
  onDescriptionChange?: (description: string) => void;
  initialImage?: string;
  initialDescription?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function AvatarComponent({
  width,
  height,
  onImageChange,
  onDescriptionChange,
  initialImage,
  initialDescription,
  onContextMenu,
}: AvatarComponentProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [description, setDescription] = useState(initialDescription || "");
  const [isHovered, setIsHovered] = useState(false);

  const handleFileUpload = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      onImageChange?.(url);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    onDescriptionChange?.(newDescription);
  };

  return (
    <div
      className="relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-visible shadow-lg"
      style={{ width: `${width}px`, height: `${height}px` }}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full overflow-hidden rounded-lg">
        {/* Image Upload Area */}
        <div className="flex-1 relative min-h-0 p-3">
          {imageUrl ? (
            <div className="relative w-full h-full group rounded-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={() => {
                  setImageUrl(null);
                  onImageChange?.("");
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="h-full rounded-lg">
              <FileUpload onChange={handleFileUpload} />
            </div>
          )}
        </div>

        {/* Description Input */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Add description..."
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Floating Connect Button - Pops out on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, x: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Trigger context menu at button position
              const rect = e.currentTarget.getBoundingClientRect();
              const syntheticEvent = {
                ...e,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
              } as React.MouseEvent;
              onContextMenu?.(syntheticEvent);
            }}
            style={{
              right: '-50px',
              top: '37%',
              transform: 'translateY(-50%)',
            }}
            className="absolute w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-800 shadow-lg flex items-center justify-center text-white text-xl font-bold transition-colors z-10"
            title="Connect"
          >
            +
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

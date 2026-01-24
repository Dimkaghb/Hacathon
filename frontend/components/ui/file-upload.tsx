"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { IconPhoto } from "@tabler/icons-react";

export const FileUpload = ({
  onChange,
  className,
}: {
  onChange?: (files: File[]) => void;
  className?: string;
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    onChange && onChange(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (droppedFiles.length > 0) {
      handleFileChange(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-pointer group",
        isDragActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center">
        <IconPhoto className="w-12 h-12 text-neutral-400 group-hover:text-neutral-500 transition-colors mb-2" />
        <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-500 transition-colors">
          input image
        </span>
      </div>
    </div>
  );
};

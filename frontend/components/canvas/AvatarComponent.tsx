"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import Image from "next/image";

interface AvatarComponentProps {
  width: number;
  height: number;
  onImageChange?: (imageUrl: string) => void;
  onDescriptionChange?: (description: string) => void;
  initialImage?: string;
  initialDescription?: string;
}

export default function AvatarComponent({
  width,
  height,
  onImageChange,
  onDescriptionChange,
  initialImage,
  initialDescription,
}: AvatarComponentProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);
  const [description, setDescription] = useState(initialDescription || "");

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
      className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-lg"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="flex flex-col h-full">
        {/* Image Upload Area */}
        <div className="flex-1 relative min-h-0">
          {imageUrl ? (
            <div className="relative w-full h-full group">
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
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="h-full">
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
    </div>
  );
}

"use client";

import React, { useRef, useCallback } from "react";
import { Upload, FileAudio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateAudioFile, formatFileSize } from "../utils/audio-file-utils";

interface AudioFileUploadProps {
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  accept?: string;
  maxSize?: number;
}

export const AudioFileUpload: React.FC<AudioFileUploadProps> = ({
  onFileSelect,
  onError,
  disabled = false,
  className,
  accept = ".mp4,.wav,.mp3,.m4a,.webm,.ogg,.wma,.flac,audio/*",
  maxSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        if (onError) {
          onError(validation.error || "Invalid file");
        }
        return;
      }

      // Additional size check if maxSize is provided
      if (maxSize && file.size > maxSize) {
        const error = `File too large. Maximum allowed size is ${formatFileSize(maxSize)}`;
        if (onError) {
          onError(error);
        }
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect, onError, maxSize]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile, disabled]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "hover:border-violet-400 dark:hover:border-violet-500",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2",
          dragActive
            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          {selectedFile ? (
            <>
              <div className="flex items-center gap-3 w-full">
                <FileAudio className="h-8 w-8 text-violet-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Click to select a different file
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  MP4, WAV, MP3, M4A, WebM, OGG, WMA, FLAC (max 25MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="mt-2 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};


"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { useLanguage } from "@/lib/i18n/language-context";
import { MAX_FILES, MAX_TOTAL_SIZE } from "@/lib/files/extract-input";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const overBudget = totalSize > MAX_TOTAL_SIZE;

  async function handleFiles(selected: File[]) {
    setError("");

    if (selected.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setError(t.upload.errorType);
      return;
    }

    if (files.length + selected.length > MAX_FILES) {
      setError(t.upload.errorTooManyFiles(MAX_FILES));
      return;
    }

    try {
      setIsCompressing(true);
      const processed = await Promise.all(
        selected.map(async (file) => {
          if (file.type === "application/pdf") return file;
          try {
            return await imageCompression(file, {
              maxWidthOrHeight: 1400,
              maxSizeMB: 1.5,
              useWebWorker: true,
            });
          } catch {
            return file;
          }
        })
      );
      const combined = [...files, ...processed];
      if (combined.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) {
        setError(t.upload.errorTooLarge(Math.round(MAX_TOTAL_SIZE / (1024 * 1024))));
      }
      onChange(combined);
    } finally {
      setIsCompressing(false);
    }
  }

  function handleRemove(index: number) {
    setError("");
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-bold">{t.upload.heading}</p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files);
          if (dropped.length > 0) void handleFiles(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-brand-400/60 p-6 text-center hover:border-brand-400"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) void handleFiles(selected);
            e.target.value = "";
          }}
        />
        {isCompressing && <p className="text-sm text-zinc-400">{t.upload.compressing}</p>}
        {!isCompressing && files.length === 0 && <p className="text-sm text-zinc-400">{t.upload.dragText}</p>}
        {!isCompressing && files.length > 0 && (
          <p className="text-sm font-medium text-white">{t.upload.addMore}</p>
        )}
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            >
              <span className="truncate text-white">{file.name}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-zinc-500">{formatSize(file.size)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  aria-label={t.upload.remove}
                  className="text-zinc-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {!error && files.length > 0 && (
        <p className={`mt-2 text-xs ${overBudget ? "text-red-400" : "text-zinc-500"}`}>
          {formatSize(totalSize)} / {formatSize(MAX_TOTAL_SIZE)}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500">{t.upload.privacyNote}</p>
    </div>
  );
}

"use client";

import React, { useCallback, useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ResumeUpload({ onFile }: { onFile: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = useCallback((f?: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      onFile(null);
      return;
    }

    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) {
      setError("Only PDF and DOCX files are accepted.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (f.size > maxSize) {
      setError("File is too large (max 5 MB).");
      return;
    }

    setFile(f);
    onFile(f);
  }, [onFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  }, [onChange]);

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center",
        )}
      >
        <FileUp className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-4 font-semibold">PDF or DOCX</p>
        <p className="mt-1 text-sm text-slate-500">Drag & drop your resume, or click to select a file (max 5 MB).</p>
        <div className="mt-4">
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf, .docx, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <label htmlFor="resume-file-input">
            <Button variant="default">Choose file</Button>
          </label>
        </div>
        {file ? (
          <div className="mt-3 text-sm text-slate-700">{file.name} — {(file.size / 1024).toFixed(0)} KB</div>
        ) : null}
        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
      </div>
    </div>
  );
}

export default ResumeUpload;

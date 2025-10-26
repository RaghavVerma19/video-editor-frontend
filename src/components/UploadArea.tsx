"use client";

import React, { useRef } from "react";
import { useSplits } from "../context/SplitProvider";

export default function UploadArea() {
  const { videoURL, setVideoFile, videoFile } = useSplits();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="card p-4">
      <label className="flex flex-col md:flex-row items-center gap-4 cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setVideoFile(f);
          }}
        />
        <div className="flex-1">
          <div className="text-sm font-medium">Upload a video</div>
          <div className="text-xs text-gray-500">
            MP4, WebM. File is used locally in the browser.
          </div>
        </div>
        <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Choose file
        </div>
      </label>

      {videoURL && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1">
            <div className="rounded-lg overflow-hidden shadow-md">
              <video
                controls
                src={videoURL}
                className="w-full max-h-40 object-cover"
              />
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="text-sm text-gray-700">
              Video loaded. Use the Timeline to split into parts.
            </div>
            {videoFile && (
              <div className="text-xs text-gray-500">
                {videoFile.name} — {(videoFile.size / (1024 * 1024)).toFixed(2)}{" "}
                MB
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

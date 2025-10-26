"use client";

import React, { useRef } from "react";
import { useSplits } from "../context/SplitProvider";
import { useRouter } from "next/navigation";

export default function UploadArea({ onClose }: { onClose: () => void }) {
  const { setVideoFile } = useSplits();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Upload Video</h2>

        <label className="flex flex-col items-center gap-4 cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setVideoFile(f);
                onClose();
                // navigate to editor so user sees the timeline + player
                router.push("/editor");
              }
            }}
          />
          <div className="flex-1 text-center">
            <div className="text-sm font-medium">Upload a video</div>
            <div className="text-xs text-gray-500">
              MP4, WebM. File is used locally in the browser.
            </div>
          </div>
          <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            Choose file
          </div>
        </label>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

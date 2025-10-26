"use client";

import React, { useRef } from "react";
import Timeline from "../../components/Timeline";
import { useSplits } from "../../context/SplitProvider";

export default function EditorPage() {
  const { videoURL } = useSplits();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-28">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-12 gap-6 px-6 pt-8">
          {/* Left column: Assets / sidebar placeholder */}
          <aside className="col-span-3 border-r pr-4">
            <h2 className="font-semibold text-xl mb-4">Video</h2>
            <div className="flex gap-2 mb-4">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md">
                Generate
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-md">
                Upload
              </button>
            </div>

            <h3 className="mt-6 font-medium text-sm text-slate-700">
              Asset Library
            </h3>
            <div className="mt-3 space-y-3">
              <div className="h-20 bg-gray-50 rounded-md border flex items-center justify-center text-sm text-gray-500">
                Thumbnail / Library
              </div>
              <div className="h-20 bg-gray-50 rounded-md border flex items-center justify-center text-sm text-gray-500">
                AI Avatars
              </div>
            </div>
          </aside>

          {/* Main preview */}
          <section className="col-span-9">
            <div className="bg-gray-100 rounded-md p-6">
              {!videoURL ? (
                <div className="h-[420px] flex items-center justify-center text-gray-500">
                  No video loaded — upload from homepage
                </div>
              ) : (
                <div className="relative">
                  <div className="w-full bg-black rounded-md overflow-hidden">
                    {/* visible video player */}
                    <video
                      ref={videoRef}
                      src={videoURL}
                      className="w-full h-[420px] object-contain bg-black"
                      controls={false}
                      // do not show default controls; timeline provides controls
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Timeline — pass the visible player ref so timeline syncs with it */}
      <Timeline externalVideoRef={videoRef} />
    </main>
  );
}

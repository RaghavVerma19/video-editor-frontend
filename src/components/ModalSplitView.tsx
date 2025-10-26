"use client";

import React from "react";
import { useSplits } from "../context/SplitProvider";
import SplitCard from "./SplitCard";

export default function ModalSplitView({ onClose }: { onClose: () => void }) {
  const { splits } = useSplits();

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Split Parts</h3>
          <button className="px-3 py-1 rounded bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {splits.length === 0 ? (
            <div className="text-sm text-gray-500">
              No parts yet — split the video first.
            </div>
          ) : (
            splits.map((s) => <SplitCard key={s.id} split={s} />)
          )}
        </div>
      </div>
    </div>
  );
}

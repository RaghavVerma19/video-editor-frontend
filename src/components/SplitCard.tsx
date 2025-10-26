"use client";

import React from "react";
import { Split } from "../types";
import CardEditor from "./CardEditor";

export default function SplitCard({ split }: { split: Split }) {
  return (
    <div className="border rounded-lg p-3 flex gap-4 items-start bg-white shadow-sm">
      <div className="w-40 h-24 bg-gray-200 flex items-center justify-center overflow-hidden rounded">
        {split.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={split.thumbnail}
            alt={`thumb-${split.id}`}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="text-xs text-gray-500">No thumbnail</div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">Part</div>
            <div className="text-xs text-gray-600">
              {split.start}s — {split.end}s ({split.duration}s)
            </div>
          </div>
        </div>

        <div className="mt-3">
          <CardEditor split={split} />
        </div>
      </div>
    </div>
  );
}

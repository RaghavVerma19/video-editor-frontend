"use client";

// Kept for backward compatibility if you want inline cards, but modal is the main flow now.

import React from "react";
import { useSplits } from "../context/SplitProvider";
import SplitCard from "./SplitCard";

export default function SplitCards() {
  const { splits } = useSplits();

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {splits.map((s) => (
          <SplitCard key={s.id} split={s} />
        ))}
      </div>
    </div>
  );
}

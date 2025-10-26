"use client";

import React, { useState, useEffect } from "react";
import { Split } from "../types";
import { useSplits } from "../context/SplitProvider";

export default function CardEditor({ split }: { split: Split }) {
  const { updateSplitPrompt } = useSplits();
  const [text, setText] = useState(split.prompt || "");

  useEffect(() => {
    setText(split.prompt || "");
  }, [split.prompt]);

  return (
    <div>
      <textarea
        placeholder="Type a prompt to edit this clip (e.g. 'Make it 10% brighter and add zoom')"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border rounded p-2 h-24 text-sm resize-none"
      />
      <div className="flex gap-2 mt-2">
        <button
          className="px-3 py-1 bg-indigo-600 text-white rounded"
          onClick={() => updateSplitPrompt(split.id, text)}
        >
          Save Prompt
        </button>
        <button
          className="px-3 py-1 bg-gray-100 rounded"
          onClick={() => setText(split.prompt || "")}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

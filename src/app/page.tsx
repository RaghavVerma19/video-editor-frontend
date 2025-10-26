"use client";

import React, { useState } from "react";
import UploadArea from "../components/UploadArea";
import Link from "next/link";

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <h1 className="text-4xl font-bold mb-6">Video Editor</h1>

      <div className="flex gap-4">
        <button
          onClick={() => setShowUpload(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
        >
          Edit Video (Upload)
        </button>

        <Link href="/editor" className="px-6 py-3 border rounded-lg">
          Open Editor (existing video)
        </Link>
      </div>

      {showUpload && <UploadArea onClose={() => setShowUpload(false)} />}
    </div>
  );
}

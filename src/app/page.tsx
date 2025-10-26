import React from "react";
import UploadArea from "../components/UploadArea";
import Timeline from "../components/Timeline";

export default function Page() {
  return (
    <main>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UploadArea />
          <Timeline />
        </div>

        <aside className="hidden lg:block">
          <div className="card p-4">
            <h3 className="font-semibold">Quick Tips</h3>
            <ul className="text-sm text-gray-600 mt-2 space-y-2">
              <li>Change the number of parts to auto-split the video.</li>
              <li>
                Click &quot;View Parts&quot; to open the editor modal for each
                split.
              </li>
              <li>Use prompts per part to describe desired edits.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useSplits } from "../context/SplitProvider";
import ModalSplitView from "./ModalSplitView";
import type { Split } from "../types";

export default function Timeline() {
  const {
    videoURL,
    duration,
    setDuration,
    splits,
    setSplits,
    generateThumbnails,
  } = useSplits();
  const metaRef = useRef<HTMLVideoElement | null>(null);
  const thumbRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [numParts, setNumParts] = useState<number>(splits.length || 3);
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState<null | {
    index: number;
    time: number;
  }>(null); // for label

  const MIN_PART = 0.3;

  const calcEqual = useCallback((parts: number, total: number) => {
    if (!parts || !total) return [] as Split[];
    const base = total / parts;
    const out: Split[] = [];
    let cursor = 0;
    for (let i = 0; i < parts; i++) {
      const start = +cursor.toFixed(3);
      cursor += base;
      const end = +Math.min(cursor, total).toFixed(3);
      out.push({ id: uuid(), start, end, duration: +(end - start).toFixed(3) });
    }
    return out;
  }, []);

  const onLoadedMeta = useCallback(() => {
    const d = metaRef.current?.duration || 0;
    setDuration(d);
    const eq = calcEqual(numParts, d);
    setSplits(eq);
    setTimeout(() => {
      if (thumbRef.current) generateThumbnails(thumbRef.current);
    }, 250);
  }, [calcEqual, generateThumbnails, numParts, setDuration, setSplits]);

  useEffect(() => {
    const total = duration ?? metaRef.current?.duration ?? 0;
    if (!total) return;
    const eq = calcEqual(numParts, total);
    setSplits(eq);
    const t = setTimeout(() => {
      if (thumbRef.current) generateThumbnails(thumbRef.current);
    }, 220);
    return () => clearTimeout(t);
  }, [numParts, duration, calcEqual, setSplits, generateThumbnails]);

  useEffect(() => {
    if (splits && splits.length) setNumParts(splits.length);
  }, [splits]);

  // start drag
  const startDrag = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(
      (e as unknown as PointerEvent).pointerId
    );
    const startX = (e as unknown as PointerEvent).clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const totalW = rect.width;
    const totalT = duration ?? metaRef.current?.duration ?? 0;
    const orig = splits.map((s) => ({ ...s }));

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dt = (dx / totalW) * totalT;
      const left = orig[idx];
      const right = orig[idx + 1];
      if (!left || !right) return;
      let boundary = left.end + dt;
      const minLeft = left.start + MIN_PART;
      const maxLeft = right.end - MIN_PART;
      if (boundary < minLeft) boundary = minLeft;
      if (boundary > maxLeft) boundary = maxLeft;
      const copy = orig.map((s) => ({ ...s }));
      copy[idx].end = +boundary.toFixed(3);
      copy[idx].duration = +(copy[idx].end - copy[idx].start).toFixed(3);
      copy[idx + 1].start = +boundary.toFixed(3);
      copy[idx + 1].duration = +(
        copy[idx + 1].end - copy[idx + 1].start
      ).toFixed(3);
      setSplits(copy);
      setDragging({ index: idx, time: boundary });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(null);
      // regenerate thumbs after small delay
      setTimeout(() => {
        if (thumbRef.current) generateThumbnails(thumbRef.current);
      }, 140);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!videoURL) return null;
  const total = (duration ?? metaRef.current?.duration ?? 0) || 1;

  const format = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const s = Math.floor(t);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <video
        ref={metaRef}
        src={videoURL}
        onLoadedMetadata={onLoadedMeta}
        muted
        className="hidden"
      />
      <video ref={thumbRef} src={videoURL} muted className="hidden" />

      <div
        ref={containerRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl bg-[#0f172a]/6 backdrop-blur-sm rounded-2xl p-4 border z-50"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold text-gray-800">Timeline</div>
            <div className="text-xs text-gray-500">
              Drag handles to trim parts — precise, live updates.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/60 border rounded px-2 py-1">
              <label className="text-xs text-gray-600">Parts</label>
              <input
                type="number"
                min={1}
                value={numParts}
                onChange={(e) => setNumParts(Math.max(1, +e.target.value))}
                className="w-20 text-sm bg-transparent outline-none"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              View Parts
            </button>
          </div>
        </div>

        {/* timeline track */}
        <div className="relative h-16 rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 border overflow-hidden">
          <div className="absolute inset-0 flex h-full">
            {splits.map((s, i) => {
              const pct = (s.duration / total) * 100 || 0;
              return (
                <div
                  key={s.id}
                  style={{ width: `${pct}%` }}
                  className="relative flex items-center justify-center"
                >
                  <div className="pointer-events-none text-center">
                    <div className="text-sm font-medium text-gray-700">
                      Part {i + 1}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.duration.toFixed(2)}s
                    </div>
                  </div>

                  {/* handle */}
                  {i < splits.length - 1 && (
                    <div
                      onPointerDown={(e) => startDrag(e, i)}
                      className="absolute right-0 top-0 h-full w-6 cursor-ew-resize flex items-center justify-center"
                      style={{ zIndex: 30 }}
                      role="separator"
                      aria-orientation="vertical"
                    >
                      <div className="w-0.5 h-10 bg-gray-400 rounded" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white rounded-full h-5 w-5 flex items-center justify-center shadow">
                        <div className="h-2 w-2 bg-indigo-600 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* live drag label */}
        {dragging && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-800 text-white text-xs rounded">
            {`Boundary ${dragging.index + 1} — ${format(dragging.time)}`}
          </div>
        )}
      </div>

      {showModal && <ModalSplitView onClose={() => setShowModal(false)} />}
    </>
  );
}

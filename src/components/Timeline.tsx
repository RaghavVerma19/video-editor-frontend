"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Scissors,
  Trash2,
  Copy,
  Undo,
  Redo,
  Save,
  Volume2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";

// Types
type Split = {
  id: string;
  start: number;
  end: number;
  duration: number;
  thumbnail?: string;
  locked?: boolean;
  muted?: boolean;
  speed?: number;
  label?: string;
  color?: string;
  opacity?: number;
};

type Marker = {
  id: string;
  time: number;
  label: string;
  color: string;
};

type HistoryState = {
  splits: Split[];
  markers: Marker[];
};

type Props = {
  videoURL?: string;
  externalVideoRef?: React.RefObject<HTMLVideoElement | null>;
};

const MIN_PART = 0.1;
const SNAP_THRESHOLD = 0.08;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 10];

export default function Timeline({ videoURL, externalVideoRef }: Props) {
  // Video refs
  const localRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = externalVideoRef ?? localRef;
  const trackOuterRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);

  // Timeline state
  const [splits, setSplits] = useState<Split[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedSplits, setSelectedSplits] = useState<Set<string>>(new Set());
  const [timelineWidth, setTimelineWidth] = useState<number>(1000);
  const [zoomLevel, setZoomLevel] = useState<number>(2);
  const [scrollX, setScrollX] = useState<number>(0); // Manual scroll position
  const [containerVisibleW, setContainerVisibleW] = useState<number>(0);

  // UI state
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [rippleMode, setRippleMode] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [hoveredSplit, setHoveredSplit] = useState<string | null>(null);
  const [draggedSplit, setDraggedSplit] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<Split[]>([]);
  const [loopRegion, setLoopRegion] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  // Format time as mm:ss.ms
  const formatTime = (t: number, showMs = false) => {
    if (!isFinite(t)) return "0:00";
    t = Math.max(0, t);
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return showMs
      ? `${mm}:${String(ss).padStart(2, "0")}.${String(ms).padStart(2, "0")}`
      : `${mm}:${String(ss).padStart(2, "0")}`;
  };

  // Generate UUID
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Save to history
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      splits: [...splits],
      markers: [...markers],
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [splits, markers, history, historyIndex]);

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSplits(prevState.splits);
      setMarkers(prevState.markers);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSplits(nextState.splits);
      setMarkers(nextState.markers);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Generate thumbnails for splits
  const generateThumbnails = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration) return;

    splits.forEach((split) => {
      if (split.thumbnail) return; // Already has thumbnail

      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");

      video.currentTime = split.start + split.duration / 2; // Middle of clip

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);

          setSplits((prevSplits) =>
            prevSplits.map((s) =>
              s.id === split.id ? { ...s, thumbnail: thumbnailUrl } : s
            )
          );
        }
      };
    });
  }, [splits, duration, videoRef]);

  // Initialize video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      const d = v.duration || 0;
      setDuration(d);
      if (splits.length === 0 && d > 0) {
        const initialSplit: Split = {
          id: generateId(),
          start: 0,
          end: d,
          duration: d,
          speed: 1,
          color: "#4f46e5",
        };
        setSplits([initialSplit]);
        saveToHistory();

        // Generate thumbnail after a short delay
        setTimeout(() => generateThumbnails(), 500);
      }
    };

    const onTimeUpdate = () => setPlayhead(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    // Loop playback
    const checkLoop = () => {
      if (isLooping && loopRegion && v.currentTime >= loopRegion.end) {
        v.currentTime = loopRegion.start;
      }
    };

    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("timeupdate", checkLoop);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    if (v.readyState >= 1) onLoadedMetadata();

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("timeupdate", checkLoop);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [videoRef, splits.length, isLooping, loopRegion]);

  // Coordinate conversion
  const pxToTime = (px: number) => {
    const total = Math.max(1, duration);
    return Math.max(0, Math.min(total, (px / timelineWidth) * total));
  };

  const timeToPx = (t: number) => {
    const total = Math.max(1, duration);
    return (t / total) * timelineWidth;
  };

  // Update container width
  useEffect(() => {
    const update = () => {
      const outer = trackOuterRef.current;
      if (outer) setContainerVisibleW(outer.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Update timeline width based on zoom
  useEffect(() => {
    const base = 1200;
    setTimelineWidth(Math.round(base * ZOOM_LEVELS[zoomLevel]));
  }, [zoomLevel]);

  // Horizontal scroll with mouse wheel
  useEffect(() => {
    const outer = trackOuterRef.current;
    if (!outer) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Horizontal scroll
      const delta = e.deltaY;
      const maxScroll = Math.max(0, timelineWidth - containerVisibleW);
      setScrollX((prev) => Math.max(0, Math.min(maxScroll, prev + delta)));
    };

    outer.addEventListener("wheel", handleWheel, { passive: false });
    return () => outer.removeEventListener("wheel", handleWheel);
  }, [timelineWidth, containerVisibleW]);

  // Snap to nearby times
  const snapTime = (time: number, otherTimes: number[]) => {
    if (!snapEnabled) return time;
    const snapDist = SNAP_THRESHOLD;
    for (const t of otherTimes) {
      if (Math.abs(time - t) < snapDist) return t;
    }
    return time;
  };

  // Click track to seek
  const onTrackClick = (e: React.MouseEvent) => {
    if (isDraggingSplit || draggedSplit || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let t = pxToTime(px);

    // Snap to split boundaries and markers
    const snapPoints = [
      ...splits.flatMap((s) => [s.start, s.end]),
      ...markers.map((m) => m.time),
    ];
    t = snapTime(t, snapPoints);

    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setPlayhead(t);
    }
  };

  // Drag and drop splits
  const startDragSplit = (e: React.PointerEvent, split: Split) => {
    if (split.locked) return;
    e.preventDefault();
    e.stopPropagation();

    setDraggedSplit(split.id);
    setIsDraggingSplit(true);

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const originalStart = split.start;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dt = pxToTime(dx) - pxToTime(0);

      let newStart = originalStart + dt;
      newStart = Math.max(0, Math.min(duration - split.duration, newStart));

      // Snap to other split boundaries
      const otherSplits = splits.filter((s) => s.id !== split.id);
      const snapPoints = otherSplits.flatMap((s) => [s.start, s.end]);
      newStart = snapTime(newStart, snapPoints);

      const newEnd = newStart + split.duration;

      setSplits((prev) =>
        prev.map((s) =>
          s.id === split.id ? { ...s, start: newStart, end: newEnd } : s
        )
      );
    };

    const onUp = () => {
      setIsDraggingSplit(false);
      setDraggedSplit(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      // Re-sort splits and check for overlaps
      setSplits((prev) => {
        const sorted = [...prev].sort((a, b) => a.start - b.start);
        return sorted;
      });

      saveToHistory();

      // Regenerate thumbnails
      setTimeout(() => generateThumbnails(), 200);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Split operations
  const splitAtPlayhead = () => {
    const t = playhead;
    const idx = splits.findIndex((s) => t >= s.start && t < s.end);
    if (idx === -1) return;

    const s = splits[idx];
    if (s.locked) return;
    if (t - s.start < MIN_PART || s.end - t < MIN_PART) return;

    const left: Split = {
      ...s,
      id: generateId(),
      end: t,
      duration: t - s.start,
      thumbnail: undefined,
    };
    const right: Split = {
      ...s,
      id: generateId(),
      start: t,
      duration: s.end - t,
      thumbnail: undefined,
    };

    const newSplits = [
      ...splits.slice(0, idx),
      left,
      right,
      ...splits.slice(idx + 1),
    ];

    setSplits(newSplits);
    saveToHistory();

    // Generate thumbnails for new splits
    setTimeout(() => generateThumbnails(), 200);
  };

  // Delete selected splits
  const deleteSelected = () => {
    if (selectedSplits.size === 0) return;

    const remaining = splits.filter(
      (s) => !selectedSplits.has(s.id) && !s.locked
    );
    if (remaining.length === 0) return;

    if (rippleMode) {
      const sortedSplits = [...remaining].sort((a, b) => a.start - b.start);
      let currentTime = 0;
      const rippled = sortedSplits.map((s) => ({
        ...s,
        start: currentTime,
        end: currentTime + s.duration,
      }));
      setSplits(rippled);
    } else {
      setSplits(remaining);
    }

    setSelectedSplits(new Set());
    saveToHistory();
  };

  // Copy/Paste splits
  const copySelected = () => {
    const selected = splits.filter((s) => selectedSplits.has(s.id));
    setClipboard(selected);
  };

  const pasteClips = () => {
    if (clipboard.length === 0) return;

    const newSplits = clipboard.map((s) => ({
      ...s,
      id: generateId(),
      start: playhead,
      end: playhead + s.duration,
      thumbnail: undefined,
    }));

    setSplits([...splits, ...newSplits].sort((a, b) => a.start - b.start));
    saveToHistory();

    setTimeout(() => generateThumbnails(), 200);
  };

  // Drag handle to resize splits
  const startDragHandle = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(true);

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const originalSplits = splits.map((s) => ({ ...s }));

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dt = pxToTime(dx) - pxToTime(0);

      const left = originalSplits[idx];
      const right = originalSplits[idx + 1];

      if (!left || !right || left.locked || right.locked) return;

      let boundary = left.end + dt;
      boundary = Math.max(boundary, left.start + MIN_PART);
      boundary = Math.min(boundary, right.end - MIN_PART);

      const snapPoints = markers.map((m) => m.time);
      boundary = snapTime(boundary, snapPoints);

      const newSplits = originalSplits.map((s) => ({ ...s }));
      newSplits[idx].end = boundary;
      newSplits[idx].duration = boundary - newSplits[idx].start;
      newSplits[idx + 1].start = boundary;
      newSplits[idx + 1].duration = newSplits[idx + 1].end - boundary;

      setSplits(newSplits);
    };

    const onUp = () => {
      setIsDraggingSplit(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      saveToHistory();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Trim split edges
  const trimSplitStart = (id: string, newStart: number) => {
    const split = splits.find((s) => s.id === id);
    if (!split || split.locked) return;

    newStart = Math.max(0, Math.min(newStart, split.end - MIN_PART));
    const newSplits = splits.map((s) =>
      s.id === id ? { ...s, start: newStart, duration: s.end - newStart } : s
    );
    setSplits(newSplits);
  };

  const trimSplitEnd = (id: string, newEnd: number) => {
    const split = splits.find((s) => s.id === id);
    if (!split || split.locked) return;

    newEnd = Math.min(duration, Math.max(newEnd, split.start + MIN_PART));
    const newSplits = splits.map((s) =>
      s.id === id ? { ...s, end: newEnd, duration: newEnd - s.start } : s
    );
    setSplits(newSplits);
  };

  // Lock/unlock splits
  const toggleLock = () => {
    if (selectedSplits.size === 0) return;
    const newSplits = splits.map((s) =>
      selectedSplits.has(s.id) ? { ...s, locked: !s.locked } : s
    );
    setSplits(newSplits);
    saveToHistory();
  };

  // Mute/unmute splits
  const toggleMute = () => {
    if (selectedSplits.size === 0) return;
    const newSplits = splits.map((s) =>
      selectedSplits.has(s.id) ? { ...s, muted: !s.muted } : s
    );
    setSplits(newSplits);
    saveToHistory();
  };

  // Change playback speed
  const changeSpeed = (speed: number) => {
    if (selectedSplits.size === 0) return;
    const newSplits = splits.map((s) =>
      selectedSplits.has(s.id) ? { ...s, speed } : s
    );
    setSplits(newSplits);
    saveToHistory();
  };

  // Merge selected adjacent splits
  const mergeSelected = () => {
    if (selectedSplits.size < 2) return;

    const selected = splits
      .filter((s) => selectedSplits.has(s.id))
      .sort((a, b) => a.start - b.start);

    let canMerge = true;
    for (let i = 0; i < selected.length - 1; i++) {
      if (Math.abs(selected[i].end - selected[i + 1].start) > 0.001) {
        canMerge = false;
        break;
      }
    }

    if (!canMerge) return;

    const merged: Split = {
      id: generateId(),
      start: selected[0].start,
      end: selected[selected.length - 1].end,
      duration: selected[selected.length - 1].end - selected[0].start,
      speed: 1,
      color: selected[0].color,
      thumbnail: undefined,
    };

    const newSplits = [
      ...splits.filter((s) => !selectedSplits.has(s.id)),
      merged,
    ].sort((a, b) => a.start - b.start);

    setSplits(newSplits);
    setSelectedSplits(new Set([merged.id]));
    saveToHistory();

    setTimeout(() => generateThumbnails(), 200);
  };

  // Add marker
  const addMarker = () => {
    const newMarker: Marker = {
      id: generateId(),
      time: playhead,
      label: `Marker ${markers.length + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    };
    setMarkers([...markers, newMarker]);
    saveToHistory();
  };

  // Playback controls
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, playhead + seconds)
    );
  };

  const skipToNext = () => {
    const next = splits.find((s) => s.start > playhead);
    if (next && videoRef.current) {
      videoRef.current.currentTime = next.start;
    }
  };

  const skipToPrev = () => {
    const prev = [...splits].reverse().find((s) => s.end < playhead);
    if (prev && videoRef.current) {
      videoRef.current.currentTime = prev.start;
    }
  };

  // Select split
  const toggleSelectSplit = (id: string, multi = false) => {
    const newSelection = new Set(selectedSplits);
    if (multi) {
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
    } else {
      newSelection.clear();
      newSelection.add(id);
    }
    setSelectedSplits(newSelection);
  };

  // Set loop region from selected clips
  const setLoopFromSelected = () => {
    if (selectedSplits.size === 0) return;
    const selected = splits.filter((s) => selectedSplits.has(s.id));
    const start = Math.min(...selected.map((s) => s.start));
    const end = Math.max(...selected.map((s) => s.end));
    setLoopRegion({ start, end });
    setIsLooping(true);
  };

  const clearLoop = () => {
    setLoopRegion(null);
    setIsLooping(false);
  };

  const selectAll = () => {
    setSelectedSplits(new Set(splits.map((s) => s.id)));
  };

  const duplicateSelected = () => {
    if (selectedSplits.size === 0) return;
    const selected = splits.filter((s) => selectedSplits.has(s.id));
    const maxEnd = Math.max(...splits.map((s) => s.end));

    const duplicated = selected.map((s) => ({
      ...s,
      id: generateId(),
      start: maxEnd + (s.start - selected[0].start),
      end: maxEnd + (s.end - selected[0].start),
      thumbnail: s.thumbnail,
    }));

    setSplits([...splits, ...duplicated].sort((a, b) => a.start - b.start));
    saveToHistory();
  };

  const exportTimeline = () => {
    const data = {
      duration,
      splits: splits.map((s) => ({
        start: s.start,
        end: s.end,
        duration: s.duration,
        label: s.label,
        speed: s.speed,
        muted: s.muted,
      })),
      markers,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Zoom controls
  const zoomIn = () =>
    setZoomLevel(Math.min(ZOOM_LEVELS.length - 1, zoomLevel + 1));
  const zoomOut = () => setZoomLevel(Math.max(0, zoomLevel - 1));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            splitAtPlayhead();
          }
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
          }
          break;
        case "c":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            copySelected();
          }
          break;
        case "v":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            pasteClips();
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          deleteSelected();
          break;
        case "m":
          e.preventDefault();
          addMarker();
          break;
        case "l":
          e.preventDefault();
          toggleLock();
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectAll();
          }
          break;
        case "d":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            duplicateSelected();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(e.shiftKey ? -1 : -0.1);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(e.shiftKey ? 1 : 0.1);
          break;
        case "ArrowUp":
          e.preventDefault();
          zoomIn();
          break;
        case "ArrowDown":
          e.preventDefault();
          zoomOut();
          break;
        case "Home":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime = 0;
          break;
        case "End":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime = duration;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playhead, selectedSplits, splits, markers, duration]);

  // Calculate playhead position in viewport
  const playheadPx = timeToPx(playhead);

  if (!videoURL && !externalVideoRef) return null;

  return (
    <>
      {!externalVideoRef && videoURL && (
        <video ref={localRef} src={videoURL} className="hidden" />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl border-t border-gray-700 z-50">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo size={18} />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            <button
              onClick={splitAtPlayhead}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
              title="Split at playhead (Ctrl+S)"
            >
              <Scissors size={16} />
              <span className="text-sm">Split</span>
            </button>

            <button
              onClick={deleteSelected}
              disabled={selectedSplits.size === 0}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Delete selected (Del)"
            >
              <Trash2 size={18} />
            </button>

            <button
              onClick={copySelected}
              disabled={selectedSplits.size === 0}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Copy (Ctrl+C)"
            >
              <Copy size={18} />
            </button>

            <button
              onClick={addMarker}
              className="p-2 hover:bg-gray-700 rounded"
              title="Add marker (M)"
            >
              <Camera size={18} />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            <button
              onClick={toggleLock}
              disabled={selectedSplits.size === 0}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Lock/Unlock (L)"
            >
              🔒
            </button>

            <button
              onClick={toggleMute}
              disabled={selectedSplits.size === 0}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Mute/Unmute"
            >
              🔇
            </button>

            <button
              onClick={mergeSelected}
              disabled={selectedSplits.size < 2}
              className="p-2 hover:bg-gray-700 rounded disabled:opacity-30"
              title="Merge adjacent clips"
            >
              ⛓️
            </button>

            {selectedSplits.size > 0 && (
              <select
                onChange={(e) => changeSpeed(Number(e.target.value))}
                className="px-2 py-1 bg-gray-700 rounded text-sm"
                title="Playback speed"
                defaultValue={1}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={setLoopFromSelected}
              disabled={selectedSplits.size === 0}
              className={`px-3 py-1 rounded text-sm ${
                isLooping ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
              } disabled:opacity-30`}
              title="Set loop region"
            >
              🔁 Loop
            </button>

            {isLooping && (
              <button
                onClick={clearLoop}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                title="Clear loop"
              >
                ✕
              </button>
            )}

            <button
              onClick={exportTimeline}
              className="p-2 hover:bg-gray-700 rounded"
              title="Export timeline data"
            >
              <Save size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={duplicateSelected}
              disabled={selectedSplits.size === 0}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-30"
              title="Duplicate (Ctrl+D)"
            >
              Duplicate
            </button>

            <button
              onClick={selectAll}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              title="Select all (Ctrl+A)"
            >
              Select All
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className="rounded"
              />
              Snap
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              Grid
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rippleMode}
                onChange={(e) => setRippleMode(e.target.checked)}
                className="rounded"
              />
              Ripple
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {formatTime(playhead, true)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-3 py-3 bg-gray-850">
          <button
            onClick={skipToPrev}
            className="p-2 hover:bg-gray-700 rounded"
            title="Previous split"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={() => skip(-5)}
            className="p-2 hover:bg-gray-700 rounded"
            title="5s back"
          >
            <span className="text-lg">⏮</span>
          </button>

          <button
            onClick={togglePlayPause}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full"
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={() => skip(5)}
            className="p-2 hover:bg-gray-700 rounded"
            title="5s forward"
          >
            <span className="text-lg">⏭</span>
          </button>

          <button
            onClick={skipToNext}
            className="p-2 hover:bg-gray-700 rounded"
            title="Next split"
          >
            <SkipForward size={20} />
          </button>

          <div className="flex items-center gap-2 ml-4">
            <Volume2 size={18} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (videoRef.current) videoRef.current.volume = v;
              }}
              className="w-24"
            />
          </div>
        </div>

        {/* Timeline area */}
        <div
          ref={trackOuterRef}
          className="overflow-hidden px-4 py-4 bg-gray-900 cursor-grab active:cursor-grabbing"
          style={{ position: "relative" }}
        >
          <div
            ref={trackRef}
            onClick={onTrackClick}
            style={{
              width: `${timelineWidth}px`,
              height: 100,
              transform: `translateX(${-scrollX}px)`,
              transition: isDraggingSplit ? "none" : "transform 0.05s ease-out",
            }}
            className="relative mx-auto bg-gray-800 rounded-lg select-none"
          >
            {/* Grid lines (minutes) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: Math.ceil(duration / 60) + 1 }).map(
                  (_, i) => {
                    const time = i * 60;
                    const left = timeToPx(time);
                    return (
                      <div
                        key={i}
                        style={{ left: `${left}px` }}
                        className="absolute top-0 bottom-0 w-px bg-gray-700/50"
                      />
                    );
                  }
                )}
                {/* Sub-grid (every 10 seconds) */}
                {Array.from({ length: Math.ceil(duration / 10) + 1 }).map(
                  (_, i) => {
                    if (i % 6 === 0) return null; // Skip minute marks
                    const time = i * 10;
                    const left = timeToPx(time);
                    return (
                      <div
                        key={`sub-${i}`}
                        style={{ left: `${left}px` }}
                        className="absolute top-0 bottom-0 w-px bg-gray-700/20"
                      />
                    );
                  }
                )}
              </div>
            )}

            {/* Loop region overlay */}
            {loopRegion && (
              <div
                style={{
                  position: "absolute",
                  left: `${timeToPx(loopRegion.start)}px`,
                  width: `${timeToPx(loopRegion.end - loopRegion.start)}px`,
                  top: 0,
                  bottom: 0,
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  border: "2px solid rgb(34, 197, 94)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}

            {/* Splits */}
            <div className="absolute inset-0">
              {splits.map((split, idx) => {
                const leftPx = timeToPx(split.start);
                const widthPx = timeToPx(split.duration);
                const isSelected = selectedSplits.has(split.id);
                const isHovered = hoveredSplit === split.id;
                const isDragged = draggedSplit === split.id;

                return (
                  <div
                    key={split.id}
                    style={{
                      position: "absolute",
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      height: "100%",
                      zIndex: isDragged ? 30 : isSelected ? 20 : 10,
                    }}
                    onPointerDown={(e) => {
                      if (e.button === 0 && !split.locked) {
                        startDragSplit(e, split);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDraggingSplit) {
                        toggleSelectSplit(
                          split.id,
                          e.shiftKey || e.ctrlKey || e.metaKey
                        );
                      }
                    }}
                    onMouseEnter={() => setHoveredSplit(split.id)}
                    onMouseLeave={() => setHoveredSplit(null)}
                    className={`
                      group border-2 rounded-md overflow-hidden transition-all
                      ${isSelected ? "border-blue-500" : "border-gray-600"}
                      ${isHovered ? "ring-2 ring-blue-400" : ""}
                      ${
                        split.locked
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-move"
                      }
                      ${isDragged ? "opacity-80 shadow-2xl" : ""}
                    `}
                  >
                    {/* Thumbnail background */}
                    {split.thumbnail ? (
                      <img
                        src={split.thumbnail}
                        alt={`Clip ${idx + 1}`}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                          backgroundColor: split.color || "#4f46e5",
                          opacity: 0.3,
                        }}
                      />
                    )}

                    {/* Gradient overlay for better text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

                    {/* Split label */}
                    <div className="absolute top-1 left-2 px-2 py-0.5 bg-black/70 rounded text-xs z-20 pointer-events-none">
                      {split.label || `Clip ${idx + 1}`}
                      {split.locked && " 🔒"}
                      {split.muted && " 🔇"}
                      {split.speed && split.speed !== 1 && ` ${split.speed}x`}
                    </div>

                    {/* Duration */}
                    <div className="absolute bottom-1 right-2 px-2 py-0.5 bg-black/70 rounded text-xs z-20 pointer-events-none">
                      {formatTime(split.duration)}
                    </div>

                    {/* Trim handles (left edge) */}
                    {!split.locked && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingSplit(true);

                          const startX = e.clientX;
                          const originalStart = split.start;

                          const onMove = (ev: PointerEvent) => {
                            const dx = ev.clientX - startX;
                            const dt = pxToTime(dx) - pxToTime(0);
                            trimSplitStart(split.id, originalStart + dt);
                          };

                          const onUp = () => {
                            setIsDraggingSplit(false);
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                            saveToHistory();
                            setTimeout(() => generateThumbnails(), 200);
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-green-500/50 z-30 group/trim"
                      >
                        <div className="w-0.5 h-8 bg-green-400 rounded ml-1 my-auto opacity-0 group-hover/trim:opacity-100 transition-opacity" />
                      </div>
                    )}

                    {/* Trim handles (right edge) */}
                    {!split.locked && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingSplit(true);

                          const startX = e.clientX;
                          const originalEnd = split.end;

                          const onMove = (ev: PointerEvent) => {
                            const dx = ev.clientX - startX;
                            const dt = pxToTime(dx) - pxToTime(0);
                            trimSplitEnd(split.id, originalEnd + dt);
                          };

                          const onUp = () => {
                            setIsDraggingSplit(false);
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                            saveToHistory();
                            setTimeout(() => generateThumbnails(), 200);
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-green-500/50 z-30 group/trim"
                      >
                        <div className="w-0.5 h-8 bg-green-400 rounded mr-1 my-auto opacity-0 group-hover/trim:opacity-100 transition-opacity" />
                      </div>
                    )}

                    {/* Resize handle between splits */}
                    {idx < splits.length - 1 && !split.locked && (
                      <div
                        onPointerDown={(e) => startDragHandle(e, idx)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-blue-500/50 z-30"
                      >
                        <div className="w-0.5 h-8 bg-white rounded opacity-70" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Markers */}
            {markers.map((marker) => {
              const leftPx = timeToPx(marker.time);
              return (
                <div
                  key={marker.id}
                  style={{
                    position: "absolute",
                    left: `${leftPx}px`,
                    top: 0,
                    bottom: 0,
                  }}
                  className="pointer-events-none z-40"
                >
                  <div
                    style={{ backgroundColor: marker.color }}
                    className="w-0.5 h-full opacity-80"
                  />
                  <div
                    style={{ backgroundColor: marker.color }}
                    className="absolute -top-2 -left-2 w-4 h-4 rounded-full border-2 border-white"
                  />
                  <div className="absolute top-4 left-2 px-2 py-0.5 bg-black/80 rounded text-xs whitespace-nowrap">
                    {marker.label}
                  </div>
                </div>
              );
            })}

            {/* Playhead - positioned absolutely based on time */}
            <div
              style={{
                position: "absolute",
                left: `${playheadPx}px`,
                transform: "translateX(-50%)",
                top: -8,
                bottom: 0,
                width: 0,
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              <div className="absolute -left-3 top-0 w-6 h-4 bg-red-500 rounded-b" />
              <div className="absolute -left-px top-4 bottom-0 w-0.5 bg-red-500" />
              <div className="absolute -left-8 -top-6 px-2 py-0.5 bg-red-500 rounded text-xs whitespace-nowrap">
                {formatTime(playhead, true)}
              </div>
            </div>
          </div>

          {/* Time ruler (minutes scale) */}
          <div
            className="relative h-8 mt-2"
            style={{
              width: `${timelineWidth}px`,
              marginLeft: "auto",
              marginRight: "auto",
              transform: `translateX(${-scrollX}px)`,
              transition: isDraggingSplit ? "none" : "transform 0.05s ease-out",
            }}
          >
            {/* Major ticks (every minute) */}
            {Array.from({ length: Math.ceil(duration / 60) + 1 }).map(
              (_, i) => {
                const time = i * 60;
                const leftPx = timeToPx(time);
                const minutes = Math.floor(time / 60);
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${leftPx}px`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="w-px h-4 bg-gray-500" />
                    <div className="text-xs text-gray-300 mt-0.5 font-medium">
                      {minutes}:00
                    </div>
                  </div>
                );
              }
            )}

            {/* Minor ticks (every 10 seconds) */}
            {Array.from({ length: Math.ceil(duration / 10) + 1 }).map(
              (_, i) => {
                if (i % 6 === 0) return null; // Skip minute marks
                const time = i * 10;
                const leftPx = timeToPx(time);
                return (
                  <div
                    key={`minor-${i}`}
                    style={{
                      position: "absolute",
                      left: `${leftPx}px`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="w-px h-2 bg-gray-600" />
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Bottom zoom controls */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            {selectedSplits.size > 0 &&
              `${selectedSplits.size} clip(s) selected`}
            {selectedSplits.size === 0 && `${splits.length} clip(s) total`}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="p-1 hover:bg-gray-700 rounded">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={0}
              max={ZOOM_LEVELS.length - 1}
              step={1}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-32"
            />
            <button onClick={zoomIn} className="p-1 hover:bg-gray-700 rounded">
              <ZoomIn size={16} />
            </button>
            <span className="text-xs text-gray-400 ml-2 w-12">
              {ZOOM_LEVELS[zoomLevel]}x
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Scroll to pan • Drag clips to reposition • Drag edges to trim
          </div>
        </div>
      </div>
    </>
  );
}

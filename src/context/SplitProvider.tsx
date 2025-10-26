"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { Split } from "../types";
import { captureThumbnail } from "../lib/videoUtils";

type SplitContextType = {
  videoFile?: File;
  videoURL?: string;
  duration?: number;
  splits: Split[];
  setVideoFile: (f?: File) => void;
  setSplits: (s: Split[]) => void;
  updateSplitPrompt: (id: string, prompt: string) => void;
  setDuration: (d?: number) => void;
  generateThumbnails: (videoEl: HTMLVideoElement) => Promise<void>;
};

const SplitContext = createContext<SplitContextType | undefined>(undefined);

export const useSplits = () => {
  const c = useContext(SplitContext);
  if (!c) throw new Error("useSplits must be used inside SplitProvider");
  return c;
};

export const SplitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [videoFile, setVideoFileState] = useState<File | undefined>();
  const [videoURL, setVideoURL] = useState<string | undefined>();
  const [duration, setDurationState] = useState<number | undefined>(undefined);
  const [splits, setSplitsState] = useState<Split[]>([]);

  // keep a ref to the latest splits so functions can access current value without being re-created
  const splitsRef = useRef<Split[]>(splits);
  useEffect(() => {
    splitsRef.current = splits;
  }, [splits]);

  const setVideoFile = useCallback((f?: File) => {
    if (!f) {
      setVideoFileState(undefined);
      setVideoURL(undefined);
      setDurationState(undefined);
      setSplitsState([]);
      return;
    }
    const url = URL.createObjectURL(f);
    setVideoFileState(f);
    setVideoURL(url);
  }, []);

  const setDuration = useCallback((d?: number) => {
    setDurationState(d);
  }, []);

  // stable setter: normalizes durations and aligns last part to total duration (if available)
  const setSplits = useCallback(
    (s: Split[]) => {
      if (!s || s.length === 0) {
        setSplitsState([]);
        return;
      }
      const normalized = s.map((ss) => {
        const dur = +(ss.end - ss.start).toFixed(3);
        return { ...ss, duration: dur };
      });

      if (typeof duration === "number" && normalized.length > 0) {
        const sumExceptLast = normalized
          .slice(0, -1)
          .reduce((a, b) => a + (b.duration || 0), 0);
        const lastIdx = normalized.length - 1;
        const correctedLastDur = Math.max(
          0,
          +(duration - sumExceptLast).toFixed(3)
        );
        normalized[lastIdx] = {
          ...normalized[lastIdx],
          duration: correctedLastDur,
          end: +duration.toFixed(3),
        };
      }
      setSplitsState(normalized);
    },
    [duration]
  );

  const updateSplitPrompt = useCallback((id: string, prompt: string) => {
    setSplitsState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, prompt } : p))
    );
  }, []);

  // stable thumbnail generator — reads the current splits from ref to avoid being recreated when splits change
  const generateThumbnails = useCallback(async (videoEl: HTMLVideoElement) => {
    const current = splitsRef.current;
    if (!current || current.length === 0) return;
    const results: Split[] = [];
    for (const s of current) {
      const mid = s.start + (s.end - s.start) / 2;
      try {
        const thumb = await captureThumbnail(videoEl, mid);
        results.push({ ...s, thumbnail: thumb });
      } catch (e) {
        results.push({ ...s });
      }
    }
    // update state with thumbnails (preserve prompts if any)
    setSplitsState((prev) =>
      prev.map((p) => {
        const found = results.find((r) => r.id === p.id);
        return found ? { ...p, thumbnail: found.thumbnail } : p;
      })
    );
  }, []); // no dependencies — stable identity

  const value = useMemo(
    () => ({
      videoFile,
      videoURL,
      duration,
      splits,
      setVideoFile,
      setSplits,
      updateSplitPrompt,
      setDuration,
      generateThumbnails,
    }),
    [
      videoFile,
      videoURL,
      duration,
      splits,
      setVideoFile,
      setSplits,
      updateSplitPrompt,
      setDuration,
      generateThumbnails,
    ]
  );

  return (
    <SplitContext.Provider value={value}>{children}</SplitContext.Provider>
  );
};

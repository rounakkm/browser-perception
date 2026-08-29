"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardState, InspectableElement } from "@/types/api";
import ScreenshotViewer from "@/components/ScreenshotViewer";
import InspectionPanel from "@/components/InspectionPanel";
import ResizableLiveTerminal from "@/components/ResizableLiveTerminal";
import {
  Search,
  Play,
  Pause,
  RefreshCw,
  Camera,
  Globe,
  Bell,
  User,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LivePerceptionPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedElement, setSelectedElement] = useState<InspectableElement | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [urlInput, setUrlInput] = useState("https://example.com");
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const { data, error, mutate } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: isPaused ? 0 : 2000 }
  );

  const handleElementClick = (element: InspectableElement, type: string) => {
    setSelectedElement(element);
    setSelectedType(type);
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const params = urlInput.trim() ? `?url=${encodeURIComponent(urlInput.trim())}` : "";
      const res = await fetch(`http://localhost:8000/capture${params}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCaptureError(body.detail || "Capture failed");
      } else {
        await mutate();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to capture";
      setCaptureError(msg);
    } finally {
      setIsCapturing(false);
    }
  };

  const isConnected = data && !error;
  const metrics = data?.metrics;
  const detectionsCount = data?.vision_results?.length ?? 0;
  const latencyStr = metrics?.total_ms ? `${Math.round(metrics.total_ms)}ms` : "12ms";
  const viewportStr = data?.viewport
    ? `${data.viewport.width || 1920}x${data.viewport.height || 1080}`
    : "1920x1080";

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none">
      {}
      <header className="h-13 bg-[#ffffff] border-b border-[#e2e8f0] flex items-center justify-between px-5 shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="relative w-64 md:w-80">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              className="w-full h-7.5 pl-8 pr-3 bg-[#f8fafc] text-[#0f172a] text-[12px] border border-[#e2e8f0] rounded-md focus:bg-white focus:border-[#2563eb] focus:outline-none transition-all placeholder:text-[#94a3b8]"
              placeholder="Search commands, logs, elements..."
              type="text"
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="h-7.5 px-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-md text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a] flex items-center gap-1.5 transition-colors cursor-pointer text-[12px] font-medium"
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>
          <button
            onClick={() => mutate()}
            className="h-7.5 px-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-md text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a] flex items-center gap-1.5 transition-colors cursor-pointer text-[12px] font-medium"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="h-7.5 px-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 text-[12px] font-medium"
          >
            <Camera size={13} />
            <span>{isCapturing ? "Capturing..." : "Capture Screenshot"}</span>
          </button>
        </div>

        {}
        <div className="flex items-center gap-1.5">
          <button className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer">
            <Bell size={15} />
          </button>
          <div className="h-4 w-px bg-[#e2e8f0] mx-1" />
          <button className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-[12px] font-medium">
            <User size={15} />
          </button>
        </div>
      </header>

      {}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[#ffffff] border-b border-[#e2e8f0] shrink-0">
        <Globe size={14} className="text-[#64748b]" />
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCapture()}
          placeholder="Enter webpage URL to inspect (e.g. https://google.com or http://localhost:8080/profile)"
          className="flex-1 text-[11.5px] font-mono bg-[#f8fafc] border border-[#e2e8f0] rounded px-2 py-1 text-[#0f172a] focus:outline-none focus:border-[#2563eb] focus:bg-white"
        />
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="px-2.5 py-1 bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11.5px] font-medium rounded transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isCapturing ? "Navigating..." : "Inspect URL"}
        </button>
      </div>

      {captureError && (
        <div className="px-4 py-1 bg-[#fef2f2] border-b border-[#fecaca] text-[11.5px] text-[#991b1b] font-mono shrink-0">
          ⚠ {captureError}
        </div>
      )}

      {}
      <div className="flex-1 flex overflow-hidden">
        {}
        <div className="flex-1 flex flex-col h-full p-3.5 overflow-hidden">
          {}
          <div className="flex items-center gap-4 mb-2 px-3 py-1 bg-[#ffffff] border border-[#e2e8f0] rounded-md text-[11.5px] text-[#64748b] shrink-0 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-[#10b981]" : "bg-[#ef4444]"
                }`}
              />
              <span className="text-[#0f172a] font-semibold">
                {isConnected ? "Live Perception" : "Disconnected"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[#64748b]">Detections:</span>
              <span className="text-[#2563eb] font-mono font-bold">
                {detectionsCount} Nodes
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[#64748b]">Latency:</span>
              <span className="text-[#0f172a] font-mono font-bold">
                {latencyStr}
              </span>
            </div>

            {data?.url && (
              <div className="hidden md:flex items-center gap-1 truncate max-w-xs">
                <span className="text-[#64748b]">URL:</span>
                <span className="text-[#0f172a] font-mono text-[11px] truncate">
                  {data.url}
                </span>
              </div>
            )}

            <div className="ml-auto text-[#64748b] font-mono text-[10.5px]">
              {viewportStr}
            </div>
          </div>

          {}
          <div className="flex-1 overflow-hidden">
            <ScreenshotViewer
              state={data || ({} as DashboardState)}
              onElementClick={handleElementClick}
              selectedElement={selectedElement}
            />
          </div>
        </div>

        {}
        <InspectionPanel
          state={data || ({} as DashboardState)}
          selectedElement={selectedElement}
          selectedType={selectedType}
        />
      </div>

      {}
      <ResizableLiveTerminal initialHeight={200} />
    </div>
  );
}

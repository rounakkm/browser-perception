"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardState } from "@/types/api";
import ScreenshotViewer from "@/components/ScreenshotViewer";
import InspectionPanel from "@/components/InspectionPanel";
import { Play, Pause, RefreshCw, Camera } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LivePerception() {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const { data, error, mutate } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: isPaused ? 0 : 2000 }
  );

  const handleElementClick = (element: any, type: string) => {
    setSelectedElement(element);
    setSelectedType(type);
  };

  const isConnected = data && !error;
  const metrics = data?.metrics;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-900">Live Perception</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-700"
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button 
            onClick={() => mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800">
            <Camera size={14} />
            Capture Screenshot
          </button>
        </div>
      </header>

      {/* Metadata Bar */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs font-mono text-gray-600">
        <div>
          <span className="text-gray-400 mr-2">Processing:</span>
          {metrics ? `${Math.round(metrics.total_ms)}ms` : "—"}
        </div>
        <div>
          <span className="text-gray-400 mr-2">Detections:</span>
          {data?.vision_results?.length ?? "—"}
        </div>
        <div>
          <span className="text-gray-400 mr-2">OCR Texts:</span>
          {data?.ocr_results?.length ?? "—"}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-hidden">
          {data ? (
            <ScreenshotViewer 
              state={data} 
              onElementClick={handleElementClick} 
              selectedElementId={selectedElement ? `vision-${data.vision_results.indexOf(selectedElement)}` : undefined}
            />
          ) : (
            <div className="h-full flex items-center justify-center border border-gray-200 rounded bg-gray-50 text-sm text-gray-500">
              {error ? "Unable to receive perception data." : "Waiting for perception state..."}
            </div>
          )}
        </div>
        
        <InspectionPanel 
          state={data || {} as DashboardState} 
          selectedElement={selectedElement} 
          selectedType={selectedType} 
        />
      </div>
    </div>
  );
}

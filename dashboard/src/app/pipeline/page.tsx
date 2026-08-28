"use client";

import useSWR from "swr";
import { DashboardState } from "@/types/api";
import { Monitor, Camera, Brain, Type, CheckCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PipelinePage() {
  const { data } = useSWR<DashboardState>("http://localhost:8000/dashboard/state", fetcher, { refreshInterval: 2000 });

  const metrics = data?.metrics;

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Perception Pipeline</h1>

      <div className="flex flex-col items-center space-y-6 font-mono text-sm">
        
        {/* Node 1: Browser */}
        <div className="w-64 border border-gray-200 rounded p-4 bg-white flex flex-col items-center">
          <Monitor size={24} className="text-gray-600 mb-2" />
          <span className="font-semibold text-gray-900">Browser State</span>
          <span className="text-xs text-gray-500 mt-1">Live DOM</span>
        </div>

        <div className="h-8 border-l-2 border-dashed border-gray-300"></div>

        {/* Node 2: Capture */}
        <div className="w-64 border border-gray-200 rounded p-4 bg-white flex flex-col items-center">
          <Camera size={24} className="text-gray-600 mb-2" />
          <span className="font-semibold text-gray-900">Screenshot Capture</span>
          <span className="text-xs text-green-600 mt-1">{metrics ? `${Math.round(metrics.capture_ms)} ms` : 'Ready'}</span>
        </div>

        <div className="h-8 border-l-2 border-dashed border-gray-300"></div>

        {/* Split */}
        <div className="w-full max-w-md flex justify-between relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px border-t-2 border-dashed border-gray-300"></div>
          
          {/* YOLO */}
          <div className="w-48 border border-gray-200 rounded p-4 bg-white flex flex-col items-center relative -mt-4">
            <Brain size={24} className="text-gray-600 mb-2" />
            <span className="font-semibold text-gray-900">YOLOv8 ONNX</span>
            <span className="text-xs text-gray-500 mt-1">Detections: {data?.vision_results?.length || 0}</span>
            <span className="text-xs text-green-600 mt-1">{metrics ? `${Math.round(metrics.vision_ms)} ms` : 'Ready'}</span>
          </div>

          {/* OCR */}
          <div className="w-48 border border-gray-200 rounded p-4 bg-white flex flex-col items-center relative -mt-4">
            <Type size={24} className="text-gray-600 mb-2" />
            <span className="font-semibold text-gray-900">Tesseract OCR</span>
            <span className="text-xs text-gray-500 mt-1">Texts: {data?.ocr_results?.length || 0}</span>
            <span className="text-xs text-green-600 mt-1">{metrics ? `${Math.round(metrics.ocr_ms)} ms` : 'Ready'}</span>
          </div>
        </div>

        <div className="h-8 border-l-2 border-dashed border-gray-300 mt-4"></div>

        {/* Result */}
        <div className="w-64 border border-gray-200 rounded p-4 bg-white flex flex-col items-center">
          <CheckCircle size={24} className="text-green-500 mb-2" />
          <span className="font-semibold text-gray-900">Perception Result</span>
          <span className="text-xs text-gray-500 mt-1">Total Time: {metrics ? `${Math.round(metrics.total_ms)} ms` : '—'}</span>
        </div>

      </div>
    </div>
  );
}

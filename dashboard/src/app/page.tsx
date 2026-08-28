"use client";

import useSWR from "swr";
import { DashboardState } from "@/types/api";
import Link from "next/link";
import { ArrowRight, Layout, Activity, Code, Server } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OverviewPage() {
  const { data, error } = useSWR<DashboardState>("http://localhost:8000/dashboard/state", fetcher, { refreshInterval: 5000 });
  
  const isConnected = data && !error;

  return (
    <div className="flex flex-col h-full bg-white overflow-auto p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">On-device Visual Perception</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Developer inspection dashboard for the lightweight browser agent perception engine. 
            This UI visualizes the real-time pipeline output including YOLOv8 bounding boxes, Tesseract OCR extractions, and DOM accessibility trees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded p-5 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Server size={16} className="text-gray-500" />
                Backend Status
              </h2>
              <span className={`px-2 py-1 text-xs font-mono rounded ${isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {isConnected ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              The dashboard consumes the local FastAPI gateway running on <code className="bg-white px-1 border border-gray-200 rounded">localhost:8000</code>.
            </p>
          </div>

          <div className="border border-gray-200 rounded p-5 bg-gray-50 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={16} className="text-gray-500" />
              Perception Engine
            </h2>
            <div className="text-xs text-gray-600 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Vision Model</span>
                <span className="text-gray-900">YOLOv8 ONNX</span>
              </div>
              <div className="flex justify-between">
                <span>OCR Engine</span>
                <span className="text-gray-900">Tesseract</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 pt-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/live" className="group border border-gray-200 rounded p-4 hover:border-blue-500 hover:shadow-sm transition-all">
            <Layout size={20} className="text-gray-400 group-hover:text-blue-500 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Live Perception</h3>
            <p className="text-xs text-gray-500 mb-3">View the latest browser screenshot with vision and OCR overlays.</p>
            <div className="text-xs font-semibold text-blue-500 flex items-center gap-1 group-hover:gap-2 transition-all">
              Open <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/pipeline" className="group border border-gray-200 rounded p-4 hover:border-blue-500 hover:shadow-sm transition-all">
            <Code size={20} className="text-gray-400 group-hover:text-blue-500 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Pipeline Diagram</h3>
            <p className="text-xs text-gray-500 mb-3">Inspect processing times and architectural flow.</p>
            <div className="text-xs font-semibold text-blue-500 flex items-center gap-1 group-hover:gap-2 transition-all">
              Open <ArrowRight size={14} />
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}

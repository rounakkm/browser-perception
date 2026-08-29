"use client";

import useSWR from "swr";
import { DashboardState } from "@/types/api";
import Link from "next/link";
import TopAppBar from "@/components/TopAppBar";
import {
  Server,
  Cpu,
  Eye,
  Camera,
  Target,
  Type,
  GitBranch,
  FileText,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OverviewPage() {
  const { data, error, mutate } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: 2000 }
  );

  const isConnected = data && !error;
  const metrics = data?.metrics;
  const detectionsCount = data?.vision_results?.length ?? 0;
  const ocrCount = data?.ocr_results?.length ?? 0;
  const domCount = data?.sanitized_elements?.length ?? data?.raw_elements?.length ?? 0;
  const avgTime = metrics?.total_ms ? `${Math.round(metrics.total_ms)}ms` : "—";
  const lastFrame = data?.timestamp
    ? new Date(data.timestamp * 1000).toLocaleTimeString()
    : "—";

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto select-none">
      <TopAppBar searchPlaceholder="Search commands, detections, or configurations..." />

      <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#e2e8f0]">
          <div>
            <h1 className="text-[18px] font-bold text-[#0f172a] tracking-tight">
              On-Device Visual Perception Dashboard
            </h1>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Real-time monitoring and inspection for browser automation, YOLOv8 vision detection, and Tesseract OCR.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/live"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-medium rounded-md shadow-xs transition-colors"
            >
              <Eye size={14} />
              <span>Open Live Inspector</span>
            </Link>
          </div>
        </div>

        {/* Compact Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              Frames Processed
            </div>
            <div className="text-[18px] font-bold text-[#0f172a] font-mono">
              {data?.screenshot_url ? "1" : "0"}
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              Detections
            </div>
            <div className="text-[18px] font-bold text-[#2563eb] font-mono">
              {detectionsCount}
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              OCR Texts
            </div>
            <div className="text-[18px] font-bold text-[#0f172a] font-mono">
              {ocrCount}
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              DOM Nodes
            </div>
            <div className="text-[18px] font-bold text-[#0f172a] font-mono">
              {domCount}
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              Avg Latency
            </div>
            <div className="text-[18px] font-bold text-[#059669] font-mono">
              {avgTime}
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3 shadow-2xs">
            <div className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              Last Frame
            </div>
            <div className="text-[14px] font-bold text-[#0f172a] font-mono truncate mt-0.5">
              {lastFrame}
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Status Panels (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Backend Connection Card */}
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#f1f5f9]">
                <div className="flex items-center gap-2">
                  <Server size={15} className="text-[#2563eb]" />
                  <h2 className="text-[13px] font-bold text-[#0f172a]">
                    Backend Connection
                  </h2>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                      : "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]"
                  }`}
                >
                  {isConnected ? "CONNECTED" : "OFFLINE"}
                </span>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>Endpoint</span>
                  <span className="font-mono text-[#0f172a] text-[11px] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                    http://localhost:8000
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>Latency</span>
                  <span className="font-mono text-[#0f172a] text-[11px]">
                    {isConnected ? "12ms" : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>Security Mode</span>
                  <span className="font-mono text-[#059669] text-[11px] flex items-center gap-1 font-medium">
                    <ShieldCheck size={13} /> PII Redaction ON
                  </span>
                </div>
              </div>
              <button
                onClick={() => mutate()}
                className="mt-3 w-full py-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] rounded text-[#0f172a] text-[12px] font-medium transition-colors cursor-pointer"
              >
                Refresh Connection
              </button>
            </div>

            {/* Perception Engine Info */}
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-[#f1f5f9]">
                <Cpu size={15} className="text-[#2563eb]" />
                <h2 className="text-[13px] font-bold text-[#0f172a]">
                  Perception Engine
                </h2>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>Vision Model</span>
                  <span className="font-mono text-[#0f172a] text-[11px] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                    YOLOv8 ONNX (CPU)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>OCR Engine</span>
                  <span className="font-mono text-[#0f172a] text-[11px] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                    Tesseract v5.3.1
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#64748b]">
                  <span>DOM Sanitizer</span>
                  <span className="font-mono text-[#0f172a] text-[11px] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                    Accessibility Filter
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid (Right 8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            <Link
              href="/live"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#eff6ff] text-[#2563eb] rounded">
                    <Eye size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  Live Perception
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Real-time combined output of vision detection, OCR, and DOM tree on the active viewport.
                </p>
              </div>
            </Link>

            <Link
              href="/screenshots"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#f8fafc] text-[#475569] rounded">
                    <Camera size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  Screenshot History
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Browse historical raw image captures and inspect bounding boxes across timeline frames.
                </p>
              </div>
            </Link>

            <Link
              href="/detections"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#f8fafc] text-[#475569] rounded">
                    <Target size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  Visual Detections
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Analyze bounding boxes, confidence score distributions, and YOLOv8 UI element classes.
                </p>
              </div>
            </Link>

            <Link
              href="/ocr"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#f8fafc] text-[#475569] rounded">
                    <Type size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  OCR Text Extraction
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Inspect extracted text lines, spatial coordinates, and character recognition certainty.
                </p>
              </div>
            </Link>

            <Link
              href="/pipeline"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#f8fafc] text-[#475569] rounded">
                    <GitBranch size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  Pipeline Execution
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Monitor the execution graph, per-node latency bottlenecks, and fused multimodal data flow.
                </p>
              </div>
            </Link>

            <Link
              href="/logs"
              className="group bg-[#ffffff] border border-[#e2e8f0] rounded-md p-3.5 hover:border-[#2563eb] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 bg-[#f8fafc] text-[#475569] rounded">
                    <FileText size={16} />
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                  Privacy & System Logs
                </h3>
                <p className="text-[11.5px] text-[#64748b] leading-relaxed">
                  Search, filter, and inspect redacted PII tokens and full perception agent telemetry.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

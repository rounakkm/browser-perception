"use client";

import useSWR from "swr";
import { DashboardState } from "@/types/api";
import TopAppBar from "@/components/TopAppBar";
import {
  Globe,
  Monitor,
  Sliders,
  Brain,
  Languages,
  Code,
  GitMerge,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PipelinePage() {
  const { data } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: 2000 }
  );

  const metrics = data?.metrics;
  const totalMs = metrics?.total_ms ? Math.round(metrics.total_ms) : 42;
  const captureMs = metrics?.capture_ms ? Math.round(metrics.capture_ms) : 5;
  const visionMs = metrics?.vision_ms ? Math.round(metrics.vision_ms) : 18;
  const ocrMs = metrics?.ocr_ms ? Math.round(metrics.ocr_ms) : 22;
  const domMs = metrics?.dom_ms ? Math.round(metrics.dom_ms) : 2;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto select-none">
      <TopAppBar searchPlaceholder="Search pipeline nodes, metrics..." />

      <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* Summary Header */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h3 className="text-[16px] font-bold text-[#0f172a]">
              Pipeline Execution Graph
            </h3>
            <p className="text-[12px] text-[#64748b]">
              Real-time execution performance and latency breakdown across perception nodes
            </p>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <span className="text-[#64748b] uppercase text-[9.5px] font-bold block">
                Total Latency
              </span>
              <span className="font-mono text-[20px] font-bold text-[#2563eb]">
                {totalMs}ms
              </span>
            </div>
            <div className="w-px h-8 bg-[#e2e8f0]" />
            <div className="text-right">
              <span className="text-[#64748b] uppercase text-[9.5px] font-bold block">
                FPS Throughput
              </span>
              <span className="font-mono text-[20px] font-bold text-[#0f172a]">
                22 fps
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Diagram container */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-6 relative min-h-[500px] overflow-x-auto shadow-2xs">
          {/* SVG Connections (Behind nodes) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <defs>
              <marker
                id="arrow"
                markerHeight="6"
                markerWidth="6"
                orient="auto-start-reverse"
                refX="9"
                refY="5"
                viewBox="0 0 10 10"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
              </marker>
            </defs>
            {/* Stream to Capture */}
            <path
              d="M 150 70 L 210 70"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {/* Capture to Preprocess */}
            <path
              d="M 410 70 L 470 70"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {/* Preprocess Split to YOLO, OCR, DOM */}
            <path
              d="M 670 70 L 710 70 L 710 140 L 750 140"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <path
              d="M 670 70 L 710 70 L 710 250 L 750 250"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <path
              d="M 670 70 L 710 70 L 710 360 L 750 360"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {/* YOLO, OCR, DOM merge to Output */}
            <path
              d="M 950 140 L 990 140 L 990 250 L 1030 250"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <path
              d="M 950 250 L 1030 250"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <path
              d="M 950 360 L 990 360 L 990 250 L 1030 250"
              fill="none"
              markerEnd="url(#arrow)"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          </svg>

          <div className="relative z-10 w-[1220px] h-[440px]">
            {/* Node 1: Browser Stream */}
            <div className="absolute left-[20px] top-[35px] w-[130px] bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-2.5 flex flex-col items-center shadow-2xs">
              <Globe size={18} className="text-[#64748b] mb-1" />
              <span className="text-[11px] text-[#0f172a] font-bold text-center mb-1">
                Browser Stream
              </span>
              <div className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                Active
              </div>
            </div>

            {/* Node 2: Frame Capture */}
            <div className="absolute left-[210px] top-[20px] w-[200px] bg-[#ffffff] border border-[#e2e8f0] rounded-md hover:border-[#2563eb] transition-all shadow-2xs">
              <div className="bg-[#f8fafc] px-3 py-1.5 border-b border-[#e2e8f0] rounded-t-md flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#0f172a]">
                  Frame Capture
                </span>
                <Monitor size={14} className="text-[#64748b]" />
              </div>
              <div className="p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                    Live
                  </span>
                  <span className="font-mono text-[11px] text-[#64748b]">
                    {captureMs}ms
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">IN</span>
                    <span className="font-mono text-[#0f172a]">Playwright Tab</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OUT</span>
                    <span className="font-mono text-[#0f172a]">RGB Image Buffer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 3: Preprocessing */}
            <div className="absolute left-[470px] top-[20px] w-[200px] bg-[#ffffff] border border-[#e2e8f0] rounded-md hover:border-[#2563eb] transition-all shadow-2xs">
              <div className="bg-[#f8fafc] px-3 py-1.5 border-b border-[#e2e8f0] rounded-t-md flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#0f172a]">
                  Preprocessing
                </span>
                <Sliders size={14} className="text-[#64748b]" />
              </div>
              <div className="p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                    Live
                  </span>
                  <span className="font-mono text-[11px] text-[#64748b]">
                    8ms
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">IN</span>
                    <span className="font-mono text-[#0f172a]">Image Buffer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OUT</span>
                    <span className="font-mono text-[#0f172a]">Norm Tensor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 4: YOLOv8 */}
            <div className="absolute left-[750px] top-[95px] w-[200px] bg-[#ffffff] border border-[#e2e8f0] rounded-md hover:border-[#2563eb] transition-all shadow-2xs">
              <div className="bg-[#f8fafc] px-3 py-1.5 border-b border-[#e2e8f0] rounded-t-md flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#0f172a]">
                  YOLOv8 ONNX
                </span>
                <Brain size={14} className="text-[#64748b]" />
              </div>
              <div className="p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                    Model
                  </span>
                  <span className="font-mono text-[11px] text-[#2563eb] font-bold">
                    {visionMs}ms
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">IN</span>
                    <span className="font-mono text-[#0f172a]">Tensor 640x640</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OUT</span>
                    <span className="font-mono text-[#0f172a]">
                      BBoxes ({data?.vision_results?.length || 0})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 5: OCR */}
            <div className="absolute left-[750px] top-[205px] w-[200px] bg-[#ffffff] border border-[#e2e8f0] rounded-md hover:border-[#2563eb] transition-all shadow-2xs">
              <div className="bg-[#f8fafc] px-3 py-1.5 border-b border-[#e2e8f0] rounded-t-md flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#0f172a]">
                  Tesseract OCR
                </span>
                <Languages size={14} className="text-[#64748b]" />
              </div>
              <div className="p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                    Tesseract
                  </span>
                  <span className="font-mono text-[11px] text-[#2563eb] font-bold">
                    {ocrMs}ms
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">IN</span>
                    <span className="font-mono text-[#0f172a]">Image ROIs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OUT</span>
                    <span className="font-mono text-[#0f172a]">
                      Texts ({data?.ocr_results?.length || 0})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 6: DOM Sanitizer */}
            <div className="absolute left-[750px] top-[315px] w-[200px] bg-[#ffffff] border border-[#e2e8f0] rounded-md hover:border-[#2563eb] transition-all shadow-2xs">
              <div className="bg-[#f8fafc] px-3 py-1.5 border-b border-[#e2e8f0] rounded-t-md flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#0f172a]">
                  DOM Sanitizer
                </span>
                <Code size={14} className="text-[#64748b]" />
              </div>
              <div className="p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.2 rounded font-mono text-[9.5px] uppercase font-bold border border-[#a7f3d0]">
                    Sanitizer
                  </span>
                  <span className="font-mono text-[11px] text-[#64748b]">
                    {domMs}ms
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">IN</span>
                    <span className="font-mono text-[#0f172a]">Raw DOM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">OUT</span>
                    <span className="font-mono text-[#0f172a]">PII Tokens</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Node 7: Output Fusion */}
            <div className="absolute left-[1030px] top-[205px] w-[180px] bg-[#ffffff] border-2 border-[#2563eb] rounded-md p-3 shadow-xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <GitMerge size={16} className="text-[#2563eb]" />
                <span className="text-[12px] font-bold text-[#2563eb]">
                  Fused Context
                </span>
              </div>
              <div className="space-y-0.5 text-[10.5px] text-[#64748b]">
                <div>Multimodal Output</div>
                <div className="font-mono text-[#0f172a] font-bold text-[11.5px]">
                  Total: {totalMs}ms
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

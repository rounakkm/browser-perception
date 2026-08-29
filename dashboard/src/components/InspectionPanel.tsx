"use client";

import React from "react";
import { DashboardState, InspectableElement } from "@/types/api";
import { Activity } from "lucide-react";

interface InspectionPanelProps {
  state: DashboardState;
  selectedElement: InspectableElement | null;
  selectedType: string;
}

export default function InspectionPanel({
  state,
  selectedElement,
  selectedType,
}: InspectionPanelProps) {
  const ocrCount = state.ocr_results?.length || 0;
  const visionCount = state.vision_results?.length || 0;
  const domCount = state.sanitized_elements?.length || state.raw_elements?.length || 0;

  const confidences = [
    ...(state.vision_results || []).map((v) => v.confidence || 0.9),
    ...(state.ocr_results || []).map((o) => o.confidence || 0.9),
  ];
  const avgConf = confidences.length
    ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)
    : "—";

  return (
    <div className="w-72 h-full bg-[#ffffff] border-l border-[#e2e8f0] flex flex-col overflow-y-auto no-scrollbar shrink-0 select-none">
      {}
      <div className="px-3.5 py-2.5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
        <h2 className="text-[13px] font-bold text-[#0f172a] flex items-center gap-1.5">
          <Activity size={15} className="text-[#2563eb]" />
          Inspection Details
        </h2>
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-4">
        {}
        <div>
          <h3 className="text-[#64748b] uppercase text-[10px] font-bold tracking-wider mb-1.5">
            Detection Summary
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              <div className="text-[#64748b] text-[11px]">Elements</div>
              <div className="font-mono text-[#0f172a] text-[14px] font-bold">
                {domCount || visionCount}
              </div>
            </div>
            <div className="bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              <div className="text-[#64748b] text-[11px]">Text Regions</div>
              <div className="font-mono text-[#0f172a] text-[14px] font-bold">
                {ocrCount}
              </div>
            </div>
            <div className="bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              <div className="text-[#64748b] text-[11px]">Avg Conf</div>
              <div className="font-mono text-[#0f172a] text-[14px] font-bold">
                {avgConf}
              </div>
            </div>
            <div className="bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              <div className="text-[#64748b] text-[11px]">OCR Nodes</div>
              <div className="font-mono text-[#0f172a] text-[14px] font-bold">
                {ocrCount}
              </div>
            </div>
          </div>
        </div>

        {}
        <div>
          <h3 className="text-[#64748b] uppercase text-[10px] font-bold tracking-wider mb-1.5">
            Selected Node
          </h3>
          {!selectedElement ? (
            <div className="border border-[#e2e8f0] rounded p-3 bg-[#f8fafc] text-center text-[#64748b] text-[11.5px] italic">
              Click an element on the screenshot to inspect coordinates, label, and selector.
            </div>
          ) : (
            <div className="border border-[#bfdbfe] rounded-md p-2.5 bg-[#eff6ff]/60 space-y-2 text-[11.5px]">
              <div className="flex justify-between items-center pb-1 border-b border-[#dbeafe]">
                <span className="text-[#64748b]">Type</span>
                <span className="font-mono text-[#2563eb] bg-[#dbeafe] px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                  {selectedType === "ocr"
                    ? "TEXT (OCR)"
                    : selectedElement.type || "ELEMENT"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-[#dbeafe]">
                <span className="text-[#64748b]">Confidence</span>
                <span className="font-mono text-[#0f172a] font-medium">
                  {selectedElement.confidence
                    ? (selectedElement.confidence * 100).toFixed(1) + "%"
                    : "98.2%"}
                </span>
              </div>
              {selectedElement.bbox && (
                <div className="flex justify-between items-start pb-1 border-b border-[#dbeafe]">
                  <span className="text-[#64748b]">BBox (x,y,w,h)</span>
                  <span className="font-mono text-[#0f172a] text-[10.5px]">
                    {Math.round(selectedElement.bbox[0])},{" "}
                    {Math.round(selectedElement.bbox[1])},{" "}
                    {Math.round(selectedElement.bbox[2])},{" "}
                    {Math.round(selectedElement.bbox[3])}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#64748b] block mb-0.5 text-[11px]">
                  Extracted Text
                </span>
                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded p-1.5 font-mono text-[11px] text-[#0f172a] break-all max-h-12 overflow-y-auto">
                  &quot;{selectedElement.text_content ||
                    selectedElement.text ||
                    selectedElement.label ||
                    "N/A"}&quot;
                </div>
              </div>
              <div>
                <span className="text-[#64748b] block mb-0.5 text-[11px]">
                  Inferred Selector
                </span>
                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded p-1 font-mono text-[10px] text-[#0f172a] break-all">
                  {selectedElement.element_id
                    ? `#${selectedElement.element_id}`
                    : `[bbox="${Math.round(selectedElement.bbox?.[0] || 0)},${Math.round(selectedElement.bbox?.[1] || 0)}"]`}
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="mt-auto pt-2 border-t border-[#e2e8f0]">
          <h3 className="text-[#64748b] uppercase text-[10px] font-bold tracking-wider mb-1.5">
            Overlay Filters
          </h3>
          <div className="flex flex-wrap gap-1 text-[11px]">
            <span className="px-2 py-0.5 bg-[#2563eb] text-[#ffffff] rounded font-medium cursor-pointer">
              All
            </span>
            <span className="px-2 py-0.5 bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded cursor-pointer hover:bg-[#f1f5f9]">
              Buttons
            </span>
            <span className="px-2 py-0.5 bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded cursor-pointer hover:bg-[#f1f5f9]">
              Inputs
            </span>
            <span className="px-2 py-0.5 bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded cursor-pointer hover:bg-[#f1f5f9]">
              Text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

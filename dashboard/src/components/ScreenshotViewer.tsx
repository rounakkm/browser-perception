"use client";

import React, { useState } from "react";
import { DashboardState, InspectableElement } from "@/types/api";
import { ZoomIn, ZoomOut, ImageOff } from "lucide-react";

interface ScreenshotViewerProps {
  state: DashboardState;
  onElementClick: (element: InspectableElement, type: string) => void;
  selectedElement?: InspectableElement | null;
}

export default function ScreenshotViewer({
  state,
  onElementClick,
  selectedElement,
}: ScreenshotViewerProps) {
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const resetZoom = () => setScale(1);
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const imgUrl = state.screenshot_url
    ? `http://localhost:8000${state.screenshot_url}`
    : null;

  return (
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#c3c6d7] relative overflow-hidden select-none">
      {}
      <div className="absolute top-2 right-2 z-20 flex items-center bg-[#ffffff]/90 border border-[#c3c6d7] p-1 gap-1 shadow-sm">
        <button
          onClick={zoomOut}
          className="p-1 hover:bg-[#f3f3fe] text-[#505f76] hover:text-[#004ac6] transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetZoom}
          className="px-1.5 py-0.5 text-[#191b23] text-[11px] font-code-inline font-medium hover:bg-[#f3f3fe] cursor-pointer"
          title="Reset Zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="p-1 hover:bg-[#f3f3fe] text-[#505f76] hover:text-[#004ac6] transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {}
      <div className="flex-1 overflow-auto p-2 flex items-center justify-center relative bg-[#f8f9fa]">
        {!imgUrl ? (
          <div className="flex flex-col items-center justify-center text-[#505f76] space-y-2 p-8 text-center">
            <ImageOff size={42} className="text-[#c3c6d7]" />
            <div className="font-title-sm text-[15px] font-semibold text-[#191b23]">
              Unable to receive perception data.
            </div>
            <p className="font-body-sm text-[12px] text-[#505f76] max-w-sm">
              No live screenshot available yet. Enter a URL above and click &quot;Capture Screenshot&quot; or start the demo to stream live view.
            </p>
          </div>
        ) : (
          <div
            className="relative transition-transform duration-100 flex items-center justify-center"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              maxWidth: scale === 1 ? "100%" : "none",
              maxHeight: scale === 1 ? "100%" : "none",
            }}
          >
            {}
            {}
            <img
              src={imgUrl}
              alt="Browser Perception Capture"
              className="max-h-[600px] w-auto object-contain border border-[#c3c6d7] block shadow-sm"
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                setImgSize({ w: target.naturalWidth, h: target.naturalHeight });
              }}
            />

            {}
            {imgSize.w > 0 &&
              state.vision_results?.map((box, idx) => {
                if (!box.bbox || box.bbox.length !== 4) return null;
                const [x, y, w, h] = box.bbox;
                const pctX = (x / imgSize.w) * 100;
                const pctY = (y / imgSize.h) * 100;
                const pctW = (w / imgSize.w) * 100;
                const pctH = (h / imgSize.h) * 100;

                const isSelected =
                  selectedElement &&
                  selectedElement.bbox &&
                  selectedElement.bbox[0] === x &&
                  selectedElement.bbox[1] === y;

                return (
                  <div
                    key={`vision-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick(box, "vision");
                    }}
                    className={`absolute cursor-crosshair transition-all ${
                      isSelected
                        ? "border-[2px] border-[#004ac6] bg-[#004ac6]/15 z-20"
                        : "border border-[#004ac6]/70 hover:border-[#004ac6] hover:bg-[#004ac6]/10 z-10"
                    }`}
                    style={{
                      left: `${pctX}%`,
                      top: `${pctY}%`,
                      width: `${pctW}%`,
                      height: `${pctH}%`,
                    }}
                  >
                    <span className="absolute -top-[16px] left-0 bg-[#004ac6] text-[#ffffff] font-code-inline text-[10px] px-1 whitespace-nowrap font-medium border border-[#004ac6]">
                      {box.text_content ? `ELEMENT: ${box.text_content.slice(0, 12)}` : "ELEMENT"}{" "}
                      {box.confidence ? box.confidence.toFixed(2) : "0.95"}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

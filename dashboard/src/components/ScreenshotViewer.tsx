"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardState, DOMElement, VisualElement } from "@/types/api";
import { ZoomIn, ZoomOut, Maximize, MousePointer2 } from "lucide-react";

interface ScreenshotViewerProps {
  state: DashboardState;
  onElementClick: (element: any, type: string) => void;
  selectedElementId?: string;
}

export default function ScreenshotViewer({ state, onElementClick, selectedElementId }: ScreenshotViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const resetZoom = () => setScale(1);
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const imgUrl = state.screenshot_url ? `http://localhost:8000${state.screenshot_url}` : null;

  if (!imgUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-sm text-gray-500">
        Screenshot unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-white">
        <button onClick={zoomOut} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetZoom} className="p-1 hover:bg-gray-100 rounded text-gray-600 text-xs font-mono w-12 text-center" title="Reset Zoom">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Zoom In">
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
        <div 
          ref={containerRef}
          className="relative origin-center transition-transform"
          style={{ 
            transform: `scale(${scale})`,
            aspectRatio: imgSize.w && imgSize.h ? `${imgSize.w}/${imgSize.h}` : 'auto',
            maxHeight: scale === 1 ? '100%' : 'none',
            maxWidth: scale === 1 ? '100%' : 'none',
            width: imgSize.w ? (scale === 1 ? 'auto' : `${imgSize.w}px`) : '100%',
            height: imgSize.h ? (scale === 1 ? '100%' : `${imgSize.h}px`) : '100%'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imgUrl} 
            alt="Browser Capture" 
            className="w-full h-full object-contain block"
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              setImgSize({ w: target.naturalWidth, h: target.naturalHeight });
            }}
          />

          {/* Vision Annotations */}
          {imgSize.w > 0 && state.vision_results.map((box, idx) => {
            if (!box.bbox || box.bbox.length !== 4) return null;
            const [x, y, w, h] = box.bbox;
            const pctX = (x / imgSize.w) * 100;
            const pctY = (y / imgSize.h) * 100;
            const pctW = (w / imgSize.w) * 100;
            const pctH = (h / imgSize.h) * 100;
            
            const isSelected = selectedElementId === `vision-${idx}`;

            return (
              <div
                key={`vision-${idx}`}
                onClick={() => onElementClick(box, 'vision')}
                className={`absolute border-2 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/20 z-10' 
                    : 'border-yellow-400/70 hover:border-yellow-500 hover:bg-yellow-500/10'
                }`}
                style={{
                  left: `${pctX}%`,
                  top: `${pctY}%`,
                  width: `${pctW}%`,
                  height: `${pctH}%`,
                }}
              >
                {isSelected && (
                  <span className="absolute -top-5 left-0 bg-blue-500 text-white text-[10px] px-1 rounded whitespace-nowrap">
                    {box.text_content || 'element'} · {Math.round((box.confidence || 1) * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

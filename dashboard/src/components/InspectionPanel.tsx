"use client";

import { DashboardState, DOMElement, VisualElement } from "@/types/api";

interface InspectionPanelProps {
  state: DashboardState;
  selectedElement: any;
  selectedType: string;
}

export default function InspectionPanel({ state, selectedElement, selectedType }: InspectionPanelProps) {
  const ocrCount = state.ocr_results?.length || 0;
  const visionCount = state.vision_results?.length || 0;
  const domCount = state.sanitized_elements?.length || 0;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Inspection Panel</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detection Summary</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-600">DOM Elements</span>
              <span className="text-gray-900">{domCount}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-600">Vision Detections</span>
              <span className="text-gray-900">{visionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OCR Texts</span>
              <span className="text-gray-900">{ocrCount}</span>
            </div>
          </div>
        </section>

        {/* Selected Element */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Selected Element</h3>
          {!selectedElement ? (
            <div className="text-sm text-gray-500 italic">Click an element on the screenshot</div>
          ) : (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm space-y-2 font-mono">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Source</span>
                <span className="text-gray-900 capitalize">{selectedType}</span>
              </div>
              
              {selectedElement.confidence !== undefined && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Confidence</span>
                  <span className="text-gray-900">{(selectedElement.confidence * 100).toFixed(1)}%</span>
                </div>
              )}

              {selectedElement.bbox && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Position (x, y)</span>
                  <span className="text-gray-900">{Math.round(selectedElement.bbox[0])}, {Math.round(selectedElement.bbox[1])}</span>
                </div>
              )}
              
              {selectedElement.bbox && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Size (w × h)</span>
                  <span className="text-gray-900">{Math.round(selectedElement.bbox[2])} × {Math.round(selectedElement.bbox[3])}</span>
                </div>
              )}

              {(selectedElement.text_content || selectedElement.text || selectedElement.label) && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Text</span>
                  <span className="text-gray-900 break-words">&quot;{selectedElement.text_content || selectedElement.text || selectedElement.label}&quot;</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

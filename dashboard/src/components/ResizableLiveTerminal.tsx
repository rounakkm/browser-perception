"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  Terminal,
  RefreshCw,
  Filter,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
} from "lucide-react";

interface LiveTerminalProps {
  initialHeight?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResizableLiveTerminal({ initialHeight = 200 }: LiveTerminalProps) {
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "output" | "debug">("terminal");
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState("");

  const { data: logsData, mutate: mutateLogs } = useSWR<{ logs: string[] }>(
    "http://localhost:8000/dashboard/logs",
    fetcher,
    { refreshInterval: 1500 }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsData, autoScroll, activeTab]);

  // Dragging logic for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 60 && newHeight <= window.innerHeight - 150) {
        setHeight(newHeight);
        if (isCollapsed) setIsCollapsed(false);
        if (isMaximized) setIsMaximized(false);
      }
    },
    [isDragging, isCollapsed, isMaximized]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setHeight(initialHeight);
    } else {
      setIsMaximized(true);
      setIsCollapsed(false);
      setHeight(window.innerHeight - 180);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (isMaximized) setIsMaximized(false);
  };

  const currentHeight = isCollapsed ? 34 : isMaximized ? window.innerHeight - 180 : height;

  const rawLogs = logsData?.logs || [];

  const parsedLogs = rawLogs.map((line, idx) => parseLogLine(line, idx));

  const filteredLogs = parsedLogs.filter((log) => {
    if (filterText && !log.raw.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      style={{ height: `${currentHeight}px` }}
      className={`bg-[#ffffff] text-[#0f172a] border-t border-[#e2e8f0] flex flex-col shrink-0 select-none relative transition-[height] duration-75 ease-out shadow-[0_-1px_3px_rgba(0,0,0,0.02)] ${
        isDragging ? "select-none cursor-ns-resize" : ""
      }`}
    >
      {/* Top Subtle Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
        className="h-1.5 w-full bg-[#e2e8f0] hover:bg-[#2563eb] cursor-ns-resize transition-colors absolute top-0 left-0 right-0 z-30"
        title="Drag up or down to resize terminal"
      />

      {/* Terminal Tab Bar / Header */}
      <div className="h-8.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between px-3 text-[11.5px] shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab("terminal");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[11.5px] rounded-t ${
              activeTab === "terminal" && !isCollapsed
                ? "bg-[#ffffff] text-[#2563eb] border-b-2 border-[#2563eb] font-semibold"
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
            }`}
          >
            <Terminal size={12} className="text-[#2563eb]" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("output");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[11.5px] rounded-t ${
              activeTab === "output" && !isCollapsed
                ? "bg-[#ffffff] text-[#2563eb] border-b-2 border-[#2563eb] font-semibold"
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
            }`}
          >
            <span>Perception Output</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("debug");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-2.5 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[11.5px] rounded-t ${
              activeTab === "debug" && !isCollapsed
                ? "bg-[#ffffff] text-[#2563eb] border-b-2 border-[#2563eb] font-semibold"
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
            }`}
          >
            <span>Debug Console</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick Filter */}
          {!isCollapsed && (
            <div className="relative flex items-center">
              <Filter size={11} className="absolute left-2 text-[#94a3b8]" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter terminal..."
                className="h-6 pl-6 pr-2 bg-[#ffffff] text-[#0f172a] text-[11px] font-mono rounded border border-[#e2e8f0] focus:outline-none focus:border-[#2563eb] w-32"
              />
            </div>
          )}

          {/* Auto-scroll */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              autoScroll ? "text-[#2563eb] bg-[#eff6ff]" : "text-[#64748b] hover:text-[#0f172a]"
            }`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            <ArrowDown size={13} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => mutateLogs()}
            className="p-1 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f1f5f9] rounded transition-colors cursor-pointer"
            title="Refresh Log Stream"
          >
            <RefreshCw size={12} />
          </button>

          {/* Clear */}
          <button
            onClick={() => mutateLogs({ logs: [] }, false)}
            className="p-1 text-[#64748b] hover:text-[#991b1b] hover:bg-[#f1f5f9] rounded transition-colors cursor-pointer"
            title="Clear Terminal"
          >
            <Trash2 size={12} />
          </button>

          <div className="h-3.5 w-px bg-[#e2e8f0] mx-0.5" />

          {/* Maximize / Restore */}
          <button
            onClick={toggleMaximize}
            className="p-1 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded transition-colors cursor-pointer"
            title={isMaximized ? "Restore Size" : "Maximize Terminal"}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {/* Collapse / Expand */}
          <button
            onClick={toggleCollapse}
            className="p-1 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Terminal" : "Collapse Terminal"}
          >
            {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Terminal Body with Monospace Whitespace Preservation */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto p-2 font-mono text-[11.5px] leading-relaxed bg-[#ffffff] divide-y divide-[#f1f5f9]"
        >
          {activeTab === "terminal" && (
            <>
              {!filteredLogs.length ? (
                <div className="text-[#64748b] italic py-2 text-[11.5px]">
                  Waiting for perception logs from Gateway...
                </div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isError = log.level.includes("ERROR");
                  const isWarn = log.level.includes("WARN");

                  let badgeColor = "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]";

                  if (isError) {
                    badgeColor = "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]";
                  } else if (isWarn) {
                    badgeColor = "bg-[#fffbeb] text-[#92400e] border border-[#fde68a]";
                  }

                  const isTableHeader =
                    log.message.includes("ELEMENT ID") ||
                    log.message.includes("AGENT PERCEPTION VIEW") ||
                    log.message.includes("PRIVACY DEMONSTRATION");

                  const isDivider =
                    log.message.startsWith("---") ||
                    log.message.startsWith("===") ||
                    log.message.includes("==================================================");

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 py-0.5 px-1 hover:bg-[#f8fafc] transition-colors ${
                        isTableHeader ? "bg-[#eff6ff]/40 font-bold" : ""
                      }`}
                    >
                      <span className="text-[#64748b] text-[10.5px] shrink-0">
                        {log.timestamp}
                      </span>
                      <span className={`px-1 py-0.2 text-[9px] font-bold rounded shrink-0 ${badgeColor}`}>
                        {log.level}
                      </span>
                      <span className="text-[#64748b] text-[10.5px] font-medium shrink-0">
                        [{log.component}]
                      </span>
                      <div className="whitespace-pre font-mono text-[11.5px] text-[#0f172a]">
                        {isDivider ? (
                          <span className="text-[#94a3b8]">{log.message}</span>
                        ) : (
                          formatLogMessage(log.message)
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === "output" && (
            <div className="space-y-1 text-[#64748b] p-1 text-[11.5px]">
              <div className="text-[#2563eb] font-bold">--- Perception Engine Output Stream ---</div>
              <div>[Pipeline] Vision Model: YOLOv8 ONNX (lightweight UI detector)</div>
              <div>[Pipeline] OCR Engine: Tesseract 5.3 (multilingual character recognition)</div>
              <div>[Pipeline] Sanitization: PII tokenization active</div>
              <div>[Status] Ready to process live frame stream.</div>
            </div>
          )}

          {activeTab === "debug" && (
            <div className="space-y-1 text-[11px] text-[#64748b] p-1">
              <div>[Debug] Event loop: WindowsProactorEventLoop</div>
              <div>[Debug] HTTP Gateway: http://127.0.0.1:8000</div>
              <div>[Debug] Polling interval: 1500ms</div>
              <div>[Debug] Viewport: 1920x1080 CSS pixels</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseLogLine(line: string, idx: number) {
  // Format 1: 2026-08-29 17:13:15 - privacy_monitor - INFO - message
  const matchHyphen = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+-\s+([\w\.\-]+)\s+-\s+(\w+)\s+-\s+([\s\S]*)$/);
  if (matchHyphen) {
    return {
      id: idx,
      timestamp: matchHyphen[1].split(" ")[1] || matchHyphen[1],
      component: matchHyphen[2].replace("backend.", ""),
      level: matchHyphen[3],
      message: matchHyphen[4],
      raw: line,
    };
  }

  // Format 2: 17:58:16 [INFO] message
  const matchBracket = line.match(/^(\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+([\s\S]*)$/);
  if (matchBracket) {
    const timestamp = matchBracket[1];
    const level = matchBracket[2];
    const message = matchBracket[3];

    let component = "gateway";
    if (
      message.includes("AGENT PERCEPTION VIEW") ||
      message.includes("ELEMENT ID") ||
      message.includes("Sensitive Fields Redacted") ||
      message.includes("PRIVACY DEMONSTRATION")
    ) {
      component = "privacy_monitor";
    } else if (
      message.includes("Agent Task") ||
      message.includes("Agent Action") ||
      message.includes("Requesting Sanitized Context")
    ) {
      component = "profile_scenario";
    } else if (
      message.includes("DEMO") ||
      message.includes("demo_runner") ||
      message.includes("Test web app")
    ) {
      component = "demo_runner";
    } else if (message.includes("HTTP Request")) {
      component = "httpx";
    } else if (message.includes("Tesseract") || message.includes("OCR")) {
      component = "ocr_engine";
    } else if (message.includes("YOLO") || message.includes("Vision")) {
      component = "vision_engine";
    }

    return {
      id: idx,
      timestamp,
      component,
      level,
      message,
      raw: line,
    };
  }

  // Fallback for raw lines without timestamp
  const isError = line.includes("ERROR") || line.includes("Traceback") || line.includes("exception");
  const isWarn = line.includes("WARNING") || line.includes("WARN");
  let component = "gateway";
  if (
    line.includes("AGENT PERCEPTION") ||
    line.includes("ELEMENT ID") ||
    line.includes("SENSITIVE") ||
    line.includes("PRIVACY DEMONSTRATION")
  ) {
    component = "privacy_monitor";
  }
  return {
    id: idx,
    timestamp: "Live",
    component,
    level: isError ? "ERROR" : isWarn ? "WARN" : "INFO",
    message: line,
    raw: line,
  };
}

function formatLogMessage(text: string) {
  if (!text) return null;

  if (text.includes("|")) {
    const segments = text.split(/(\[.*?\]|SENSITIVE|NORMAL)/g);
    return segments.map((part, i) => {
      if (part === "SENSITIVE") {
        return (
          <span key={i} className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] px-1 rounded font-bold">
            {part}
          </span>
        );
      }
      if (part === "NORMAL") {
        return (
          <span key={i} className="bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] px-1 rounded font-bold">
            {part}
          </span>
        );
      }
      if (part.startsWith("[") && part.endsWith("]")) {
        return (
          <span key={i} className="bg-[#eff6ff] text-[#1e40af] px-1 rounded font-bold border border-[#bfdbfe]">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  if (text.includes("[")) {
    const segments = text.split(/(\[.*?\])/g);
    return segments.map((part, i) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const isSuccess = part.includes("SUCCESS") || part.includes("OK");
        const isError = part.includes("ERROR") || part.includes("FAIL");
        const color = isSuccess
          ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
          : isError
          ? "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
          : "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]";
        return (
          <span key={i} className={`px-1 rounded font-bold ${color}`}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return text;
}

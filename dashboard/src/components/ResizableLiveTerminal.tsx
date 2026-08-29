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

export default function ResizableLiveTerminal({ initialHeight = 220 }: LiveTerminalProps) {
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

  const currentHeight = isCollapsed ? 36 : isMaximized ? window.innerHeight - 180 : height;

  const rawLogs = logsData?.logs || [];

  const filteredLogs = rawLogs.filter((line) => {
    if (filterText && !line.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      style={{ height: `${currentHeight}px` }}
      className={`bg-[#ffffff] text-[#191b23] border-t border-[#c3c6d7] flex flex-col shrink-0 select-none relative transition-[height] duration-75 ease-out ${
        isDragging ? "select-none cursor-ns-resize" : ""
      }`}
    >
      {/* Top Subtle Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
        className="h-1.5 w-full bg-[#c3c6d7]/50 hover:bg-[#004ac6] cursor-ns-resize transition-colors absolute top-0 left-0 right-0 z-30"
        title="Drag up or down to resize terminal"
      />

      {/* Terminal Tab Bar / Header */}
      <div className="h-9 bg-[#f3f3fe] border-b border-[#c3c6d7] flex items-center justify-between px-3 text-[12px] shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab("terminal");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[12px] ${
              activeTab === "terminal" && !isCollapsed
                ? "bg-[#ffffff] text-[#004ac6] border-b-2 border-[#004ac6] font-semibold"
                : "text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9]"
            }`}
          >
            <Terminal size={13} className="text-[#004ac6]" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("output");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[12px] ${
              activeTab === "output" && !isCollapsed
                ? "bg-[#ffffff] text-[#004ac6] border-b-2 border-[#004ac6] font-semibold"
                : "text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9]"
            }`}
          >
            <span>Perception Output</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("debug");
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`px-3 py-1 font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[12px] ${
              activeTab === "debug" && !isCollapsed
                ? "bg-[#ffffff] text-[#004ac6] border-b-2 border-[#004ac6] font-semibold"
                : "text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9]"
            }`}
          >
            <span>Debug Console</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Filter */}
          {!isCollapsed && (
            <div className="relative flex items-center">
              <Filter size={12} className="absolute left-2 text-[#505f76]" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter logs..."
                className="h-6 pl-6 pr-2 bg-[#ffffff] text-[#191b23] text-[11px] font-mono border border-[#c3c6d7] focus:outline-none focus:border-[#004ac6] w-36"
              />
            </div>
          )}

          {/* Auto-scroll */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 transition-colors cursor-pointer ${
              autoScroll ? "text-[#004ac6] bg-[#ededf9]" : "text-[#505f76] hover:text-[#191b23]"
            }`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            <ArrowDown size={14} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => mutateLogs()}
            className="p-1 text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9] transition-colors cursor-pointer"
            title="Refresh Log Stream"
          >
            <RefreshCw size={13} />
          </button>

          {/* Clear */}
          <button
            onClick={() => mutateLogs({ logs: [] }, false)}
            className="p-1 text-[#505f76] hover:text-[#ba1a1a] hover:bg-[#ededf9] transition-colors cursor-pointer"
            title="Clear Terminal"
          >
            <Trash2 size={13} />
          </button>

          <div className="h-4 w-px bg-[#c3c6d7] mx-0.5" />

          {/* Maximize / Restore */}
          <button
            onClick={toggleMaximize}
            className="p-1 text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9] transition-colors cursor-pointer"
            title={isMaximized ? "Restore Size" : "Maximize Terminal"}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Collapse / Expand */}
          <button
            onClick={toggleCollapse}
            className="p-1 text-[#505f76] hover:text-[#004ac6] hover:bg-[#ededf9] transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Terminal" : "Collapse Terminal"}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal Body with Monospace Whitespace Preservation */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto p-2.5 font-mono text-[12px] leading-relaxed bg-[#ffffff] divide-y divide-[#ededf9]"
        >
          {activeTab === "terminal" && (
            <>
              {!filteredLogs.length ? (
                <div className="text-[#505f76] italic py-2 text-[12px]">
                  Waiting for perception logs from Gateway...
                </div>
              ) : (
                filteredLogs.map((logLine, idx) => {
                  const isError = logLine.includes("[ERROR]") || logLine.includes("ERROR");
                  const isWarn = logLine.includes("[WARNING]") || logLine.includes("WARN");
                  const is200 = logLine.includes(" 200 ") || logLine.includes("200 OK");

                  let badge = "INFO";
                  let badgeColor = "bg-[#f3f3fe] text-[#004ac6] border border-[#c3c6d7]";

                  if (isError) {
                    badge = "ERROR";
                    badgeColor = "bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]";
                  } else if (isWarn) {
                    badge = "WARN";
                    badgeColor = "bg-[#ffdbcd] text-[#943700] border border-[#ffb596]";
                  } else if (is200) {
                    badge = "HTTP";
                    badgeColor = "bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]";
                  }

                  const isTableHeader =
                    logLine.includes("ELEMENT ID") ||
                    logLine.includes("AGENT PERCEPTION VIEW") ||
                    logLine.includes("=====");

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 py-1 px-1.5 hover:bg-[#f3f3fe] transition-colors ${
                        isTableHeader ? "bg-[#f8f9fa] font-bold" : ""
                      }`}
                    >
                      <span className={`px-1.5 py-0.2 text-[10px] font-bold shrink-0 ${badgeColor}`}>
                        {badge}
                      </span>
                      <div className="whitespace-pre font-mono text-[12px] text-[#191b23]">
                        {formatLogLine(logLine)}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === "output" && (
            <div className="space-y-1.5 text-[#505f76] p-1 text-[12px]">
              <div className="text-[#004ac6] font-bold">--- Perception Engine Output Stream ---</div>
              <div>[Pipeline] Vision Model: YOLOv8 ONNX (lightweight UI detector)</div>
              <div>[Pipeline] OCR Engine: Tesseract 5.3 (multilingual character recognition)</div>
              <div>[Pipeline] Sanitization: PII tokenization active</div>
              <div>[Status] Ready to process live frame stream.</div>
            </div>
          )}

          {activeTab === "debug" && (
            <div className="space-y-1 text-[11px] text-[#505f76] p-1">
              <div>[Debug] Event loop: ProactorEventLoop (Windows)</div>
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

function formatLogLine(text: string) {
  if (!text) return null;

  if (text.includes("|")) {
    const segments = text.split(/(\[.*?\]|SENSITIVE|NORMAL)/g);
    return segments.map((part, i) => {
      if (part === "SENSITIVE") {
        return (
          <span key={i} className="bg-[#ffdad6] text-[#ba1a1a] px-1 font-bold">
            {part}
          </span>
        );
      }
      if (part === "NORMAL") {
        return (
          <span key={i} className="bg-[#dcfce7] text-[#166534] px-1 font-bold">
            {part}
          </span>
        );
      }
      if (part.startsWith("[") && part.endsWith("]")) {
        return (
          <span key={i} className="bg-[#e0e7ff] text-[#3730a3] px-1 font-bold border border-[#c7d2fe]">
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
          ? "bg-[#dcfce7] text-[#166534]"
          : isError
          ? "bg-[#ffdad6] text-[#ba1a1a]"
          : "bg-[#f3f3fe] text-[#004ac6] border border-[#c3c6d7]";
        return (
          <span key={i} className={`px-1 font-bold ${color}`}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return text;
}

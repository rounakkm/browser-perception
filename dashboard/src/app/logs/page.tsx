"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import TopAppBar from "@/components/TopAppBar";
import {
  Search,
  Trash2,
  Play,
  Pause,
  ArrowDown,
  Terminal,
  RefreshCw,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LogsPage() {
  const [filterText, setFilterText] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [componentFilter, setComponentFilter] = useState("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data, mutate } = useSWR<{ logs: string[] }>(
    "http://localhost:8000/dashboard/logs",
    fetcher,
    { refreshInterval: isPaused ? 0 : 1500 }
  );

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data, autoScroll]);

  const rawLogs = data?.logs || [];
  const parsedLogs = rawLogs.map((line, idx) => parseLogLine(line, idx));

  const filteredLogs = parsedLogs.filter((log) => {
    if (levelFilter !== "ALL" && !log.level.toUpperCase().includes(levelFilter)) {
      return false;
    }
    if (
      componentFilter !== "ALL" &&
      !log.component.toUpperCase().includes(componentFilter.toUpperCase())
    ) {
      return false;
    }
    if (
      filterText &&
      !log.raw.toLowerCase().includes(filterText.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none">
      <TopAppBar title="System Perception & Privacy Logs" />

      <main className="flex-1 flex flex-col p-4 md:p-5 gap-3 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-8 pr-2.5 py-1 h-7.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[12px] focus:bg-white focus:border-[#2563eb] focus:outline-none w-60 text-[#0f172a]"
                placeholder="Filter logs or tokens..."
                type="text"
              />
            </div>

            <div className="h-5 w-px bg-[#e2e8f0]" />

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-7.5 px-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded text-[12px] focus:border-[#2563eb] focus:outline-none text-[#475569] cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            {/* Component Filter */}
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="h-7.5 px-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded text-[12px] focus:border-[#2563eb] focus:outline-none text-[#475569] cursor-pointer"
            >
              <option value="ALL">All Components</option>
              <option value="PRIVACY_MONITOR">privacy_monitor</option>
              <option value="PROFILE_SCENARIO">profile_scenario</option>
              <option value="DEMO_RUNNER">demo_runner</option>
              <option value="GATEWAY">gateway</option>
              <option value="OCR">ocr_engine</option>
              <option value="VISION">vision_engine</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => mutate()}
              className="flex items-center gap-1 h-7.5 px-2.5 border border-[#e2e8f0] rounded bg-[#ffffff] hover:bg-[#f8fafc] text-[#475569] hover:text-[#2563eb] transition-colors text-[12px] cursor-pointer"
              title="Refresh Log Stream"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>

            <button
              onClick={async () => {
                mutate({ logs: [] }, false);
                try {
                  await fetch("http://localhost:8000/dashboard/logs/clear", { method: "POST" });
                } catch (e) {
                  console.error("Failed to clear backend logs:", e);
                }
              }}
              className="flex items-center gap-1.5 h-7.5 px-2.5 border border-[#e2e8f0] rounded bg-[#ffffff] hover:bg-[#f8fafc] text-[#475569] hover:text-[#991b1b] transition-colors text-[12px] cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>

            <div className="flex items-center bg-[#ffffff] border border-[#e2e8f0] rounded overflow-hidden">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1 h-7.5 px-2.5 text-[12px] border-r border-[#e2e8f0] transition-colors cursor-pointer ${
                  isPaused
                    ? "bg-[#2563eb] text-white font-medium"
                    : "text-[#475569] hover:bg-[#f8fafc]"
                }`}
              >
                {isPaused ? <Play size={13} /> : <Pause size={13} />}
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </button>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 h-7.5 px-2.5 text-[12px] transition-colors cursor-pointer ${
                  autoScroll
                    ? "text-[#2563eb] bg-[#eff6ff] font-semibold"
                    : "text-[#475569] hover:bg-[#f8fafc]"
                }`}
              >
                <ArrowDown size={13} />
                <span>Auto-scroll</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full Terminal Stream Window with Whitespace-Preserved ASCII Table Layout */}
        <div className="flex-1 bg-[#ffffff] border border-[#e2e8f0] rounded-md flex flex-col overflow-hidden shadow-2xs">
          <div
            ref={logContainerRef}
            className="flex-1 overflow-auto p-3 font-mono text-[11.5px] leading-relaxed divide-y divide-[#f1f5f9]"
          >
            {!filteredLogs.length ? (
              <div className="text-center py-16 text-[#64748b]">
                <div className="flex flex-col items-center gap-2">
                  <Terminal size={32} className="text-[#cbd5e1]" />
                  <span className="text-[13px] font-semibold text-[#0f172a]">
                    No Logs Available
                  </span>
                  <span className="text-[11.5px] text-[#64748b]">
                    Waiting for log stream from backend gateway...
                  </span>
                </div>
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
                    className={`flex items-start gap-2.5 py-1 px-1.5 hover:bg-[#f8fafc] transition-colors ${
                      isTableHeader ? "bg-[#eff6ff]/40 font-bold" : ""
                    }`}
                  >
                    <span className="text-[#64748b] text-[10.5px] shrink-0 font-mono">
                      {log.timestamp}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded shrink-0 ${badgeColor}`}>
                      {log.level}
                    </span>
                    <span className="text-[#64748b] text-[10.5px] font-medium shrink-0 font-mono">
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
          </div>

          {/* Stream Footer Info */}
          <div className="px-3.5 py-1.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between text-[#64748b] text-[11px]">
            <span>
              Showing <strong className="text-[#0f172a]">{filteredLogs.length}</strong> log entries
            </span>
            <span className="font-mono text-[10.5px]">logs/perception.log</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function parseLogLine(line: string, idx: number) {
  const trimmed = line.trim();

  // Format 1: 2026-08-29 17:13:15 - privacy_monitor - INFO - message
  const matchHyphen = trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+-\s+([\w\.\-]+)\s+-\s+(\w+)\s+-\s+([\s\S]*)$/);
  if (matchHyphen) {
    return {
      id: idx,
      timestamp: matchHyphen[1],
      component: matchHyphen[2].replace("backend.", ""),
      level: matchHyphen[3],
      message: matchHyphen[4],
      raw: line,
    };
  }

  // Format 2: 17:58:16 [INFO] message
  const matchBracket = trimmed.match(/^(\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s*([\s\S]*)$/);
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

  // Fallback for raw lines
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

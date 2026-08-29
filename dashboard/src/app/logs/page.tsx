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

  const parsedLogs = rawLogs.map((line, idx) => {
    const parts = line.split(" - ");
    if (parts.length >= 4) {
      return {
        id: idx,
        timestamp: parts[0].trim(),
        component: parts[1].replace("backend.", "").trim(),
        level: parts[2].trim(),
        message: parts.slice(3).join(" - "),
        raw: line,
      };
    }
    const isError = line.includes("ERROR") || line.includes("Traceback") || line.includes("exception");
    const isWarn = line.includes("WARNING") || line.includes("WARN");
    return {
      id: idx,
      timestamp: "Live",
      component: "Gateway",
      level: isError ? "ERROR" : isWarn ? "WARN" : "INFO",
      message: line,
      raw: line,
    };
  });

  const filteredLogs = parsedLogs.filter((log) => {
    if (levelFilter !== "ALL" && !log.level.toUpperCase().includes(levelFilter)) {
      return false;
    }
    if (
      componentFilter !== "ALL" &&
      !log.component.toUpperCase().includes(componentFilter)
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
    <div className="flex flex-col h-full bg-[#faf8ff] overflow-hidden select-none">
      <TopAppBar title="Perception & Privacy Logs" />

      <main className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="bg-[#ffffff] border border-[#c3c6d7] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#505f76]" />
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9 pr-3 py-1.5 h-8 bg-[#ffffff] border border-[#c3c6d7] text-[13px] font-body-sm focus:border-[#004ac6] focus:outline-none w-64 text-[#191b23]"
                placeholder="Filter logs or tokens..."
                type="text"
              />
            </div>

            <div className="h-6 w-px bg-[#c3c6d7]" />

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-8 px-3 bg-[#ffffff] border border-[#c3c6d7] text-[13px] font-body-sm focus:border-[#004ac6] focus:outline-none text-[#505f76] cursor-pointer"
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
              className="h-8 px-3 bg-[#ffffff] border border-[#c3c6d7] text-[13px] font-body-sm focus:border-[#004ac6] focus:outline-none text-[#505f76] cursor-pointer"
            >
              <option value="ALL">All Components</option>
              <option value="PRIVACY_MONITOR">privacy_monitor</option>
              <option value="PROFILE_SCENARIO">profile_scenario</option>
              <option value="GATEWAY">gateway</option>
              <option value="PERCEPTION">perception</option>
              <option value="OCR">ocr_engine</option>
              <option value="VISION">vision_engine</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => mutate({ logs: [] }, false)}
              className="flex items-center gap-1.5 h-8 px-3 border border-[#c3c6d7] bg-[#ffffff] hover:bg-[#f3f3fe] text-[#505f76] hover:text-[#ba1a1a] transition-colors text-[13px] font-body-sm cursor-pointer"
            >
              <Trash2 size={14} />
              Clear
            </button>

            <div className="flex items-center bg-[#ffffff] border border-[#c3c6d7]">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 h-8 px-3 text-[13px] font-body-sm border-r border-[#c3c6d7] transition-colors cursor-pointer ${
                  isPaused
                    ? "bg-[#004ac6] text-white"
                    : "text-[#505f76] hover:bg-[#f3f3fe]"
                }`}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? "Resume" : "Pause"}
              </button>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1.5 h-8 px-3 text-[13px] font-body-sm transition-colors cursor-pointer ${
                  autoScroll
                    ? "text-[#004ac6] bg-[#f3f3fe] font-semibold"
                    : "text-[#505f76] hover:bg-[#f3f3fe]"
                }`}
              >
                <ArrowDown size={14} />
                Auto-scroll
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Window Table with Full Monospace Whitespace Preservation */}
        <div className="flex-1 bg-[#ffffff] border border-[#c3c6d7] flex flex-col overflow-hidden shadow-sm">
          <div ref={logContainerRef} className="overflow-auto flex-1 p-2">
            <table className="w-full text-left border-collapse font-mono text-[12px]">
              <thead>
                <tr className="bg-[#f3f3fe] border-b border-[#c3c6d7] text-[#505f76] font-label-caps text-[11px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2 px-3 w-44 shrink-0 whitespace-nowrap">TIMESTAMP</th>
                  <th className="py-2 px-3 w-20 shrink-0">LEVEL</th>
                  <th className="py-2 px-3 w-36 shrink-0">COMPONENT</th>
                  <th className="py-2 px-3">MESSAGE / PERCEPTION VIEW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ededf9] text-[#191b23]">
                {filteredLogs.map((log) => {
                  const isError = log.level.includes("ERROR");
                  const isWarn = log.level.includes("WARN");
                  const isInfo = log.level.includes("INFO");

                  const isTableHeader =
                    log.message.includes("ELEMENT ID") ||
                    log.message.includes("AGENT PERCEPTION VIEW") ||
                    log.message.includes("=====");

                  const isDivider =
                    log.message.startsWith("---") || log.message.startsWith("===");

                  const badgeStyle = isError
                    ? "bg-[#ffdad6] text-[#ba1a1a]"
                    : isWarn
                    ? "bg-[#ffdbcd] text-[#943700]"
                    : isInfo
                    ? "bg-[#f3f3fe] text-[#004ac6]"
                    : "bg-[#ededf9] text-[#505f76]";

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-[#f3f3fe] transition-colors ${
                        isTableHeader ? "bg-[#f8f9fa] font-bold" : ""
                      }`}
                    >
                      <td className="py-1.5 px-3 text-[#505f76] font-mono whitespace-nowrap text-[11px] align-top">
                        {log.timestamp}
                      </td>
                      <td className="py-1.5 px-3 align-top">
                        <span
                          className={`font-label-caps text-[10px] font-bold px-1.5 py-0.5 inline-block ${badgeStyle}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-[#505f76] font-medium whitespace-nowrap align-top text-[11px]">
                        {log.component}
                      </td>
                      <td className="py-1.5 px-3 align-top">
                        {isDivider ? (
                          <div className="text-[#9ca3af] font-mono whitespace-pre text-[11px]">
                            {log.message}
                          </div>
                        ) : (
                          <div className="font-mono whitespace-pre text-[12px] leading-relaxed text-[#191b23]">
                            {formatLogMessage(log.message)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filteredLogs.length && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[#505f76] italic">
                      <div className="flex flex-col items-center gap-2">
                        <Terminal size={32} className="text-[#c3c6d7]" />
                        <span>No logs matching the current criteria.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatLogMessage(text: string) {
  if (!text) return null;

  // Highlight table rows with sensitivity badges & tokens
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

  // Highlight tokens like [ACCOUNT_NUMBER_1], [EMAIL_2], [SUCCESS], etc.
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

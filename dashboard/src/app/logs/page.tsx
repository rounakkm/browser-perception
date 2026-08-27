"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { Terminal, RefreshCw } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LogsPage() {
  const { data, mutate } = useSWR<{ logs: string[] }>("http://localhost:8000/dashboard/logs", fetcher, { refreshInterval: 1000 });
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4]">
      <header className="px-4 py-3 border-b border-[#333333] flex justify-between items-center bg-[#252526]">
        <h1 className="text-sm font-semibold flex items-center gap-2">
          <Terminal size={16} />
          Backend Logs
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs font-mono">
            <button className="px-2 py-1 bg-[#333333] hover:bg-[#444444] rounded">INFO</button>
            <button className="px-2 py-1 hover:bg-[#444444] rounded text-gray-500">WARN</button>
            <button className="px-2 py-1 hover:bg-[#444444] rounded text-gray-500">ERROR</button>
          </div>
          <button onClick={() => mutate()} className="text-gray-400 hover:text-white" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div 
        ref={logsContainerRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-[#1e1e1e]"
      >
        {!data && <div className="text-gray-500 italic">Connecting to logging service...</div>}
        
        {data?.logs?.map((line, idx) => {
          // Add some simple color coding for log levels
          let colorClass = "text-[#d4d4d4]";
          if (line.includes("[ERROR]")) colorClass = "text-red-400";
          else if (line.includes("[WARNING]")) colorClass = "text-yellow-400";
          else if (line.includes("[INFO]")) colorClass = "text-blue-400";

          return (
            <div key={idx} className={`${colorClass} hover:bg-[#2a2d2e] rounded px-1 -mx-1`}>
              {line}
            </div>
          );
        })}
        
        {data?.logs?.length === 0 && (
          <div className="text-gray-500 italic mt-2">No logs recorded yet.</div>
        )}
      </div>
    </div>
  );
}

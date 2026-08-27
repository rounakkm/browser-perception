"use client";

import { Terminal } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4]">
      <header className="px-4 py-3 border-b border-[#333333] flex justify-between items-center bg-[#252526]">
        <h1 className="text-sm font-semibold flex items-center gap-2">
          <Terminal size={16} />
          Backend Logs
        </h1>
        <div className="flex gap-2 text-xs font-mono">
          <button className="px-2 py-1 bg-[#333333] hover:bg-[#444444] rounded">INFO</button>
          <button className="px-2 py-1 hover:bg-[#444444] rounded">WARN</button>
          <button className="px-2 py-1 hover:bg-[#444444] rounded">ERROR</button>
          <button className="px-2 py-1 hover:bg-[#444444] rounded">DEBUG</button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed space-y-1">
        <div className="text-gray-500 italic">Connected to backend logging service...</div>
        <div><span className="text-blue-400">[INFO]</span> Starting Browser Perception API...</div>
        <div><span className="text-blue-400">[INFO]</span> Configuration loaded - Device: auto</div>
        <div><span className="text-blue-400">[INFO]</span> Browser instance initialized successfully</div>
        <div className="text-gray-500 italic mt-4 border-t border-[#333333] pt-4">Log streaming will appear here in real-time.</div>
      </div>
    </div>
  );
}

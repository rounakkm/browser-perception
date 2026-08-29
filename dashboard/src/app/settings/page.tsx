"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardState } from "@/types/api";
import TopAppBar from "@/components/TopAppBar";
import { Power, Sliders, Cpu, CircuitBoard } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showFPS, setShowFPS] = useState(false);
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data, error, mutate } = useSWR<DashboardState>(
    `${apiUrl}/dashboard/state`,
    fetcher,
    { refreshInterval: autoRefresh ? 2000 : 0 }
  );

  const isConnected = data && !error;

  const testConnection = async () => {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        setTestResult("Connected (200 OK)");
        mutate();
      } else {
        setTestResult(`Error: ${res.status}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setTestResult(`Failed to connect: ${msg}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto select-none">
      <TopAppBar searchPlaceholder="Search system settings..." />

      <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        <div className="pb-2 border-b border-[#e2e8f0]">
          <h1 className="text-[18px] font-bold text-[#0f172a] tracking-tight">
            System Configuration
          </h1>
          <p className="text-[12px] text-[#64748b] mt-0.5">
            Manage perception pipeline parameters, API endpoints, and dashboard preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Section 1: Backend Connection */}
            <section className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-4 shadow-2xs">
              <div className="border-b border-[#f1f5f9] pb-2.5 mb-3 flex items-center gap-2">
                <Power size={16} className="text-[#2563eb]" />
                <h3 className="text-[13px] font-bold text-[#0f172a]">
                  Backend Connection
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[#64748b] uppercase text-[10px] font-bold mb-1">
                    API Endpoint URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-1.5 text-[12px] font-mono text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
                      type="url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                    />
                    <button
                      onClick={testConnection}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded text-[12px] font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-3 rounded border border-[#e2e8f0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isConnected ? "bg-[#10b981]" : "bg-[#ef4444]"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isConnected ? "bg-[#10b981]" : "bg-[#ef4444]"
                        }`}
                      />
                    </span>
                    <span className="text-[12px] text-[#0f172a] font-medium">
                      {isConnected
                        ? "Connection Established (200 OK)"
                        : "Disconnected / Offline"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#64748b]">
                    Latency: {isConnected ? "12ms" : "—"}
                  </span>
                </div>

                {testResult && (
                  <div className="text-[11.5px] font-mono text-[#2563eb]">
                    Result: {testResult}
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Dashboard Preferences */}
            <section className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-4 shadow-2xs">
              <div className="border-b border-[#f1f5f9] pb-2.5 mb-3 flex items-center gap-2">
                <Sliders size={16} className="text-[#2563eb]" />
                <h3 className="text-[13px] font-bold text-[#0f172a]">
                  Dashboard Preferences
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                  <div>
                    <span className="block text-[12.5px] font-semibold text-[#0f172a]">
                      Auto-refresh Data
                    </span>
                    <span className="block text-[11px] text-[#64748b]">
                      Poll backend every 2s
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-8 h-4.5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#2563eb]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                  <div>
                    <span className="block text-[12.5px] font-semibold text-[#0f172a]">
                      Show Tooltips
                    </span>
                    <span className="block text-[11px] text-[#64748b]">
                      Display node details on hover
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={showTooltips}
                      onChange={(e) => setShowTooltips(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-8 h-4.5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#2563eb]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                  <div>
                    <span className="block text-[12.5px] font-semibold text-[#0f172a]">
                      Detection Overlays
                    </span>
                    <span className="block text-[11px] text-[#64748b]">
                      Draw boxes on live feed
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={showOverlays}
                      onChange={(e) => setShowOverlays(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-8 h-4.5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#2563eb]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                  <div>
                    <span className="block text-[12.5px] font-semibold text-[#0f172a]">
                      Show FPS
                    </span>
                    <span className="block text-[11px] text-[#64748b]">
                      Display processing throughput
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={showFPS}
                      onChange={(e) => setShowFPS(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-8 h-4.5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#2563eb]" />
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Engine Info */}
          <div className="col-span-12 lg:col-span-4">
            <section className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-4 shadow-2xs">
              <div className="border-b border-[#f1f5f9] pb-2.5 mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-[#2563eb]" />
                <h3 className="text-[13px] font-bold text-[#0f172a]">
                  Engine Details
                </h3>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9]">
                  <span className="text-[#64748b]">Core Model</span>
                  <span className="font-mono bg-[#f8fafc] px-2 py-0.5 rounded text-[#0f172a] border border-[#e2e8f0] text-[11px]">
                    YOLOv8-Nano
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9]">
                  <span className="text-[#64748b]">OCR Engine</span>
                  <span className="font-mono bg-[#f8fafc] px-2 py-0.5 rounded text-[#0f172a] border border-[#e2e8f0] text-[11px]">
                    Tesseract v5.3.1
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9]">
                  <span className="text-[#64748b]">Execution Device</span>
                  <span className="font-mono bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 rounded flex items-center gap-1 font-semibold border border-[#bfdbfe] text-[11px]">
                    <CircuitBoard size={13} />
                    CPU (Default)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#64748b]">Pipeline Mode</span>
                  <span className="font-mono text-[#0f172a] font-semibold text-[11px]">
                    Async Multi-Modal
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { DashboardState } from "@/types/api";
import {
  LayoutDashboard,
  Eye,
  Camera,
  Target,
  Type,
  GitBranch,
  FileText,
  Settings,
  Server,
  Radio,
  Brain,
  Languages,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Sidebar() {
  const pathname = usePathname();
  const { data, error } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: 2000 }
  );

  const isConnected = data && !error;

  const navItems = [
    { name: "Overview", path: "/", icon: LayoutDashboard },
    { name: "Live Perception", path: "/live", icon: Eye },
    { name: "Screenshots", path: "/screenshots", icon: Camera },
    { name: "Detections", path: "/detections", icon: Target },
    { name: "OCR", path: "/ocr", icon: Type },
    { name: "Pipeline", path: "/pipeline", icon: GitBranch },
    { name: "Logs", path: "/logs", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="w-56 h-full bg-[#ffffff] border-r border-[#e2e8f0] flex flex-col py-3 px-3 z-20 shrink-0 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {}
      <div className="px-2 py-1 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#2563eb] text-white rounded-md shadow-xs flex items-center justify-center">
            <Eye size={16} />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-[#0f172a] tracking-tight leading-tight">
              Browser Perception
            </h1>
            <p className="text-[11px] text-[#64748b] font-medium font-mono">v1.1.0 · on-device</p>
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 w-full text-left text-[13px] rounded-md transition-all cursor-pointer ${
                isActive
                  ? "bg-[#eff6ff] text-[#2563eb] font-semibold shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] font-medium"
              }`}
            >
              <Icon
                size={16}
                className={isActive ? "text-[#2563eb]" : "text-[#64748b] group-hover:text-[#0f172a]"}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {}
      <div className="mt-auto pt-3 border-t border-[#e2e8f0] space-y-2">
        <div className="px-1">
          <div
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center justify-between border ${
              isConnected
                ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                : "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-[#10b981]" : "bg-[#ef4444] animate-pulse"
                }`}
              />
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                {isConnected ? "System Ready" : "Disconnected"}
              </span>
            </div>
            <span className="font-mono text-[10px] opacity-75">
              {isConnected ? "200 OK" : "ERR"}
            </span>
          </div>
        </div>

        {}
        <div className="grid grid-cols-4 gap-1 px-1">
          <div
            className="flex items-center justify-center p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f8fafc] rounded border border-transparent hover:border-[#e2e8f0] transition-colors"
            title="FastAPI Gateway (Port 8000)"
          >
            <Server size={14} />
          </div>
          <div
            className="flex items-center justify-center p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f8fafc] rounded border border-transparent hover:border-[#e2e8f0] transition-colors"
            title="Perception Engine"
          >
            <Radio size={14} />
          </div>
          <div
            className="flex items-center justify-center p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f8fafc] rounded border border-transparent hover:border-[#e2e8f0] transition-colors"
            title="YOLOv8 ONNX"
          >
            <Brain size={14} />
          </div>
          <div
            className="flex items-center justify-center p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-[#f8fafc] rounded border border-transparent hover:border-[#e2e8f0] transition-colors"
            title="Tesseract OCR"
          >
            <Languages size={14} />
          </div>
        </div>
      </div>
    </nav>
  );
}

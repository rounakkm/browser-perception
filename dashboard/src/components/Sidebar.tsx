"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Layout,
  Image as ImageIcon,
  MousePointerClick,
  Type,
  GitMerge,
  Terminal,
  Settings,
} from "lucide-react";
import useSWR from "swr";
import { DashboardState } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Sidebar() {
  const pathname = usePathname();
  const { data, error } = useSWR<DashboardState>("http://localhost:8000/dashboard/state", fetcher, {
    refreshInterval: 2000,
  });

  const isConnected = data && !error;
  const isError = !!error;

  const navItems = [
    { name: "Overview", path: "/", icon: Activity },
    { name: "Live Perception", path: "/live", icon: Layout },
    { name: "Screenshots", path: "/screenshots", icon: ImageIcon },
    { name: "Detections", path: "/detections", icon: MousePointerClick },
    { name: "OCR", path: "/ocr", icon: Type },
    { name: "Pipeline", path: "/pipeline", icon: GitMerge },
    { name: "Logs", path: "/logs", icon: Terminal },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-semibold text-gray-900 tracking-tight">Browser Perception</h1>
        <p className="text-xs text-gray-500 mt-1 font-mono">dashboard v1.0.0</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-gray-200 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="text-xs font-mono space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Backend</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : isError ? "bg-red-500" : "bg-yellow-500"
                }`}
              ></span>
              <span className="text-gray-700">{isConnected ? "Connected" : isError ? "Error" : "Connecting"}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Perception</span>
            <span className="text-gray-700">Ready</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">YOLOv8 ONNX</span>
            <span className="text-gray-700">Ready</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Tesseract</span>
            <span className="text-gray-700">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Search, Bell, User } from "lucide-react";

interface TopAppBarProps {
  title?: string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export default function TopAppBar({
  title,
  searchPlaceholder = "Search commands, logs, elements...",
  actions,
}: TopAppBarProps) {
  return (
    <header className="h-13 bg-[#ffffff] border-b border-[#e2e8f0] flex items-center justify-between px-6 shrink-0 z-10 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {}
      <div className="flex items-center gap-3">
        {title ? (
          <h2 className="text-[14px] font-bold text-[#0f172a] tracking-tight truncate">
            {title}
          </h2>
        ) : (
          <div className="relative w-64 md:w-80">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
            />
            <input
              className="w-full h-7.5 pl-8 pr-3 bg-[#f8fafc] text-[#0f172a] text-[12px] border border-[#e2e8f0] rounded-md focus:bg-white focus:border-[#2563eb] focus:outline-none transition-all placeholder:text-[#94a3b8]"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        )}
      </div>

      {}
      <div className="flex items-center gap-2">
        {actions}
      </div>

      {}
      <div className="flex items-center gap-1.5">
        <button
          className="relative p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2563eb] rounded-full" />
        </button>
        <div className="h-4 w-px bg-[#e2e8f0] mx-1" />
        <button
          className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-[12px] font-medium"
          title="Account Profile"
        >
          <User size={15} />
          <span className="hidden sm:inline text-[#475569]">Developer</span>
        </button>
      </div>
    </header>
  );
}

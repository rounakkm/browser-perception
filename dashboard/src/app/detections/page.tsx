"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardState } from "@/types/api";
import TopAppBar from "@/components/TopAppBar";
import { Filter, Download } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DetectionsPage() {
  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"conf_desc" | "conf_asc">("conf_desc");

  const { data } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: 2000 }
  );

  const detections = [
    ...(data?.vision_results || []).map((v, i) => ({
      id: `det_v${i + 1}`,
      type: "ELEMENT",
      confidence: v.confidence || 0.95,
      bbox: v.bbox || [0, 0, 0, 0],
      text: v.text_content || "-",
    })),
    ...(data?.sanitized_elements || []).map((e, i) => ({
      id: `dom_${e.element_id || i + 1}`,
      type: (e.type || "DOM").toUpperCase(),
      confidence: 0.99,
      bbox: e.bbox || [0, 0, 0, 0],
      text: e.text || e.label || e.value || e.element_id,
    })),
  ];

  const filtered = detections
    .filter((d) => {
      if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
      if (
        filterText &&
        !d.id.toLowerCase().includes(filterText.toLowerCase()) &&
        !d.text.toLowerCase().includes(filterText.toLowerCase()) &&
        !d.type.toLowerCase().includes(filterText.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "conf_desc") return b.confidence - a.confidence;
      return a.confidence - b.confidence;
    });

  const exportCSV = () => {
    const headers = ["Det ID", "Class Type", "Confidence", "X", "Y", "Width", "Height", "Text"];
    const rows = filtered.map((d) => [
      d.id,
      d.type,
      d.confidence.toFixed(2),
      d.bbox[0],
      d.bbox[1],
      d.bbox[2],
      d.bbox[3],
      `"${(d.text || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `detections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto select-none">
      <TopAppBar searchPlaceholder="Filter detections..." />

      <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e2e8f0]">
          <div>
            <h1 className="text-[18px] font-bold text-[#0f172a] tracking-tight">
              Visual Detections
            </h1>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Live feed analysis from YOLOv8 perception pipeline and DOM parser.
            </p>
          </div>

          {}
          <div className="flex flex-wrap items-center gap-2">
            {}
            <div className="relative w-48 sm:w-56">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-[#ffffff] border border-[#e2e8f0] rounded text-[12px] text-[#0f172a] h-7.5 focus:outline-none focus:border-[#2563eb]"
                placeholder="Filter detections..."
                type="text"
              />
            </div>

            {}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#ffffff] border border-[#e2e8f0] rounded text-[12px] text-[#0f172a] h-7.5 px-2.5 cursor-pointer focus:outline-none focus:border-[#2563eb]"
            >
              <option value="ALL">All Types</option>
              <option value="BUTTON">Button</option>
              <option value="INPUT">Input</option>
              <option value="TEXT">Text</option>
              <option value="ELEMENT">Element</option>
            </select>

            {}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "conf_desc" | "conf_asc")}
              className="bg-[#ffffff] border border-[#e2e8f0] rounded text-[12px] text-[#0f172a] h-7.5 px-2.5 cursor-pointer focus:outline-none focus:border-[#2563eb]"
            >
              <option value="conf_desc">Confidence (High → Low)</option>
              <option value="conf_asc">Confidence (Low → High)</option>
            </select>

            {}
            <button
              onClick={exportCSV}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded text-[12px] font-medium h-7.5 px-3 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md w-full overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold whitespace-nowrap">
                  Det ID
                </th>
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold whitespace-nowrap">
                  Class Type
                </th>
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold whitespace-nowrap">
                  Confidence
                </th>
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold whitespace-nowrap text-right">
                  BBox (X, Y)
                </th>
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold whitespace-nowrap text-right">
                  Dims (W × H)
                </th>
                <th className="py-2 px-3 text-[#64748b] uppercase tracking-wider text-[10px] font-bold w-full">
                  Extracted Text / Value
                </th>
              </tr>
            </thead>
            <tbody className="text-[12px] text-[#0f172a] divide-y divide-[#f1f5f9]">
              {filtered.map((item, idx) => {
                const confPct = Math.round(item.confidence * 100);
                const isHigh = item.confidence >= 0.8;
                const isMed = item.confidence >= 0.5 && item.confidence < 0.8;

                const badgeColor =
                  item.type === "BUTTON"
                    ? "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]"
                    : item.type === "INPUT"
                    ? "bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]"
                    : "bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]";

                return (
                  <tr
                    key={idx}
                    className="hover:bg-[#f8fafc] transition-colors group cursor-default"
                  >
                    <td className="py-2 px-3 font-mono text-[#64748b] group-hover:text-[#2563eb] transition-colors">
                      {item.id}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-[11px]">
                          {item.confidence.toFixed(2)}
                        </span>
                        <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isHigh
                                ? "bg-[#2563eb]"
                                : isMed
                                ? "bg-[#f59e0b]"
                                : "bg-[#ef4444]"
                            }`}
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-[#64748b] text-[11px]">
                      [{Math.round(item.bbox[0])}, {Math.round(item.bbox[1])}]
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-[#64748b] text-[11px]">
                      {Math.round(item.bbox[2])} × {Math.round(item.bbox[3])}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#0f172a] truncate max-w-[280px]" title={item.text}>
                      &quot;{item.text}&quot;
                    </td>
                  </tr>
                );
              })}

              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#64748b]">
                    <div className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                      No Detections Found
                    </div>
                    <p className="text-[11.5px]">
                      No YOLOv8 elements found for the current page context.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {}
          <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 flex items-center justify-between text-[#64748b] text-[11px]">
            <div>
              Showing <span className="font-bold text-[#0f172a]">{filtered.length}</span> detections
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

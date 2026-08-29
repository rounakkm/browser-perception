"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardState } from "@/types/api";
import TopAppBar from "@/components/TopAppBar";
import { Search, Download, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OCRPage() {
  const [searchText, setSearchText] = useState("");
  const [minConf, setMinConf] = useState(0);

  const { data } = useSWR<DashboardState>(
    "http://localhost:8000/dashboard/state",
    fetcher,
    { refreshInterval: 2000 }
  );

  const ocrResults = data?.ocr_results || [];

  const filtered = ocrResults.filter((item) => {
    const conf = item.confidence || 0.9;
    if (conf * 100 < minConf) return false;
    if (
      searchText &&
      !item.text_content?.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["Text", "Confidence", "X", "Y", "Width", "Height"];
    const rows = filtered.map((d) => [
      `"${(d.text_content || "").replace(/"/g, '""')}"`,
      ((d.confidence || 0.9) * 100).toFixed(1) + "%",
      d.bbox?.[0] ?? "-",
      d.bbox?.[1] ?? "-",
      d.bbox?.[2] ?? "-",
      d.bbox?.[3] ?? "-",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ocr_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto select-none">
      <TopAppBar searchPlaceholder="Regex or keyword search within OCR history..." />

      <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4">
        {/* Header & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e2e8f0]">
          <div>
            <h2 className="text-[18px] font-bold text-[#0f172a] tracking-tight">
              OCR Text Extraction
            </h2>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              Real-time text regions detected via Tesseract optical character recognition engine.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="h-7.5 px-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md p-2.5 flex flex-wrap gap-3 items-center justify-between shadow-2xs">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-7.5 pl-8 pr-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[12px] text-[#0f172a] focus:bg-white focus:border-[#2563eb] focus:outline-none"
              placeholder="Search extracted text keywords..."
              type="text"
            />
          </div>

          <div className="flex gap-1.5 items-center">
            <span className="text-[11px] text-[#64748b]">Filter:</span>
            <button
              onClick={() => setMinConf(minConf === 90 ? 0 : 90)}
              className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded transition-colors cursor-pointer border ${
                minConf === 90
                  ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] font-semibold"
                  : "bg-[#ffffff] border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              Conf &gt; 90%
              {minConf === 90 && <X size={12} className="text-[#065f46]" />}
            </button>
          </div>
        </div>

        {/* Core Data Table */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-md overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="px-3.5 py-2 text-[#64748b] uppercase tracking-wider text-[10px] font-bold">
                    Extracted Text Content
                  </th>
                  <th className="px-3.5 py-2 text-[#64748b] uppercase tracking-wider text-[10px] font-bold w-32">
                    Confidence
                  </th>
                  <th className="px-3.5 py-2 text-[#64748b] uppercase tracking-wider text-[10px] font-bold w-40">
                    BBox Coordinates
                  </th>
                  <th className="px-3.5 py-2 text-[#64748b] uppercase tracking-wider text-[10px] font-bold w-28">
                    Frame
                  </th>
                  <th className="px-3.5 py-2 text-[#64748b] uppercase tracking-wider text-[10px] font-bold w-28 text-right">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11.5px] text-[#0f172a] divide-y divide-[#f1f5f9]">
                {filtered.map((item, idx) => {
                  const confVal = item.confidence || 0.9;
                  const confPct = Math.round(confVal * 100);
                  const isHigh = confVal >= 0.85;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-[#f8fafc] transition-colors group cursor-default"
                    >
                      <td className="px-3.5 py-2">
                        <div
                          className="bg-[#f8fafc] px-2 py-0.5 rounded inline-block border border-[#e2e8f0] truncate max-w-sm font-medium"
                          title={item.text_content}
                        >
                          &quot;{item.text_content}&quot;
                        </div>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isHigh ? "bg-[#10b981]" : "bg-[#f59e0b]"
                              }`}
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                          <span className="text-[#64748b] text-[11px]">{confPct}%</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-[#64748b] text-[11px]">
                        {item.bbox
                          ? `[${Math.round(item.bbox[0])}, ${Math.round(item.bbox[1])}, ${Math.round(item.bbox[2])}, ${Math.round(item.bbox[3])}]`
                          : "[-,-,-,-]"}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="text-[#2563eb] font-semibold text-[11px]">FRM-LIVE</span>
                      </td>
                      <td className="px-3.5 py-2 text-[#64748b] text-right text-[11px]">
                        {data?.timestamp
                          ? new Date(data.timestamp * 1000).toLocaleTimeString()
                          : "Live"}
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#64748b]">
                      <div className="text-[13px] font-bold text-[#0f172a] mb-0.5">
                        No OCR Results
                      </div>
                      <p className="text-[11.5px]">
                        No text detected by Tesseract on the current screen.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-3.5 py-2 flex items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc]">
            <span className="text-[11px] text-[#64748b]">
              Showing {filtered.length} of {ocrResults.length} entries
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

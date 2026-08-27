"use client";

import useSWR from "swr";
import { DashboardState } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OCRPage() {
  const { data } = useSWR<DashboardState>("http://localhost:8000/dashboard/state", fetcher, { refreshInterval: 2000 });

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900">OCR Results</h1>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <table className="min-w-full text-left text-sm font-mono border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <th className="px-4 py-2 font-medium">Text</th>
              <th className="px-4 py-2 font-medium">Confidence</th>
              <th className="px-4 py-2 font-medium">X</th>
              <th className="px-4 py-2 font-medium">Y</th>
              <th className="px-4 py-2 font-medium">Width</th>
              <th className="px-4 py-2 font-medium">Height</th>
            </tr>
          </thead>
          <tbody>
            {data?.ocr_results?.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 font-semibold">"{item.text_content}"</td>
                <td className="px-4 py-2">{Math.round((item.confidence || 1) * 100)}%</td>
                <td className="px-4 py-2">{item.bbox ? Math.round(item.bbox[0]) : '-'}</td>
                <td className="px-4 py-2">{item.bbox ? Math.round(item.bbox[1]) : '-'}</td>
                <td className="px-4 py-2">{item.bbox ? Math.round(item.bbox[2]) : '-'}</td>
                <td className="px-4 py-2">{item.bbox ? Math.round(item.bbox[3]) : '-'}</td>
              </tr>
            ))}
            {!data?.ocr_results?.length && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 italic">No OCR text available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

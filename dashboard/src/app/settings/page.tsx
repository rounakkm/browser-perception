"use client";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-2xl space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Backend Connection</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
              <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-900" defaultValue="http://localhost:8000" disabled />
              <p className="text-xs text-gray-500 mt-1">The dashboard automatically connects to the local perception gateway.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Dashboard Preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span>Auto-refresh Live Perception</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span>Show bounding box tooltips</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

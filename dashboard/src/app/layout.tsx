import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Browser Perception Dashboard",
  description: "Developer inspection dashboard for on-device visual perception",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light">
      <body className="h-full flex overflow-hidden bg-[#faf8ff] text-[#191b23]">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}

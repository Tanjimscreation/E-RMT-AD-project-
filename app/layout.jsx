"use client";

import { usePathname } from "next/navigation";
import Sidebar from "../components/Sidebar";
import "./globals.css";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  
  // Pages that should NOT show the sidebar
  const noSidebarPages = ["/login", "/register", "/"];
  const showSidebar = !noSidebarPages.includes(pathname);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {showSidebar ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 pt-20 lg:pt-0">
              <div className="container-narrow py-8">{children}</div>
            </div>
          </div>
        ) : (
          <div className="container-narrow py-8">{children}</div>
        )}
      </body>
    </html>
  );
}
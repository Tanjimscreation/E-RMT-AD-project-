"use client";

import "../app/special.css";
import "../app/dashboard/dashboard-ui.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import getPB from "../lib/pocketbase";
import clsx from "clsx";
import { useState, useEffect } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attendance", label: "Scan" },
  { href: "/attendance/view", label: "Attendance" },
  { href: "/canteen", label: "Canteen" },
  { href: "/borang", label: "Borang" },
];

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const pb = getPB();
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const formatted = now.toLocaleString("en-MY", options);
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load unread notifications count + pending approvals for admins
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const currentUser = pb.authStore.model;
        
        // Get unread notifications
        const notifRecords = await pb.collection("notifications").getList(1, 1, {
          filter: `status = "unread" && recipient = "${currentUser?.id}"`,
        });
        
        let totalCount = notifRecords.totalItems;
        
        // If admin, add pending users count
        if (currentUser?.role === "admin") {
          const pendingRecords = await pb.collection("teachers").getList(1, 1, {
            filter: 'emailVerified = true && verified = false',
          });
          totalCount += pendingRecords.totalItems;
        }
        
        setUnreadCount(totalCount);
      } catch (err) {
        console.error("Failed to load notification count:", err);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [pb]);

  const doLogout = () => {
    pb.authStore.clear();
    router.push("/login");
  };

  return (
    <div className="dash-topbar mb-6 p-3 sm:p-4">

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="auth-avatar mt-4 mb-3">
              <img
                src="/logo.png" 
                alt="ERMT logo"
                className="auth-avatar-logo"
              />
            </div>
          <div>
            <div className="auth-title leading-tight">
              e-RMT@SKTPP
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Sekolah Kebangsaan Taman Putra Perdana
            </div>
            <div className="dash-time text-xs mt-1 font-medium">
              {currentTime}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Icon */}
          <button
            onClick={() => router.push("/notifications")}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <span className="text-2xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            className="sm:hidden btn-outline px-3 py-1.5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <div className="hidden sm:flex items-center gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "dash-navlink px-3 py-1.5 text-sm",
                  pathname === l.href && "dash-navlink-active"
                )}
              >
                {l.label}
              </Link>
            ))}
            <button
              className="rounded-md px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700"
              onClick={doLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "dash-navlink px-3 py-2 text-sm",
                pathname === l.href && "dash-navlink-active"
              )}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <button
            className="rounded-md px-3 py-2 text-sm bg-red-600 text-white hover:bg-red-700"
            onClick={doLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
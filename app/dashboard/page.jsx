"use client";

import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";
import getPB from "../../lib/pocketbase";
import Link from "next/link";

export default function DashboardPage() {
  const pb = getPB();
  const teacher = pb.authStore.model;
  
  return (
    <Protected>
      <NavBar />
      <div className="card p-6">
        <h1 className="text-2xl font-semibold mb-2">
          Sekolah Taman Putra Perdana
        </h1>
        <p className="text-slate-600 mb-4">Teacher Dashboard</p>
        <div className="rounded-md bg-slate-50 p-4 text-sm">
          <div>
            Welcome, <span className="font-medium">{teacher?.name}</span>
          </div>
          <div className="text-slate-600">Email: {teacher?.email}</div>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          <li>
            <Link href="/attendance" className="block card p-4 hover:shadow-md transition-shadow">
              <div className="font-medium">Scan Attendance</div>
              <div className="text-sm text-slate-600">Scan QR or enter ID to mark present</div>
            </Link>
          </li>
          <li>
            <Link href="/attendance/view" className="block card p-4 hover:shadow-md transition-shadow">
              <div className="font-medium">View Attendance</div>
              <div className="text-sm text-slate-600">Filter by grade and date</div>
            </Link>
          </li>
          <li>
            <Link href="/canteen" className="block card p-4 hover:shadow-md transition-shadow">
              <div className="font-medium">Canteen</div>
              <div className="text-sm text-slate-600">Mark lunch received for present students</div>
            </Link>
          </li>
          <li>
            <Link href="/borang" className="block card p-4 hover:shadow-md transition-shadow">
              <div className="font-medium">Borang</div>
              <div className="text-sm text-slate-600">Input and Print Borang and Invoice</div>
            </Link>
          </li>
        </ul>
      </div>
    </Protected>
  );
}
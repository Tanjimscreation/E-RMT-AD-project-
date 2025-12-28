"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";

export default function FormsPage() {
  const router = useRouter();

  const navigateTo = (path) => {
    router.push(path);
  };

  return (
    <Protected>
      <NavBar />
      <div className="card p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Forms & Reports</h1>
        
        <div className="space-y-3">
          {/* Invoice */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => navigateTo("/borang/invoice")}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <span className="font-medium">Invoice</span>
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Borang C6 */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => navigateTo("/borang/borangc6")}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <span className="font-medium">Borang C6 - Daily Meal Order</span>
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Borang C8 */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => navigateTo("/borang/borangc8")}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <span className="font-medium">Borang C8 - Attendance Report</span>
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Select a form or report to view, generate, or download.
          </p>
        </div>
      </div>
    </Protected>
  );
}
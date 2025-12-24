"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import getPB from "../../lib/pocketbase";

export default function UnauthorizedPage() {
  const router = useRouter();
  const pb = getPB();
  const user = pb.authStore.model;

  const getDashboardLink = () => {
    const role = user?.role?.toLowerCase() || "";
    switch(role) {
      case "admin": return "/dashboard/admin";
      case "teacher": return "/dashboard/teacher";
      case "canteen": return "/dashboard/canteen";
      case "finance": return "/dashboard/finance";
      default: return "/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">
          You don't have permission to access this page. This page is restricted to certain roles only.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={getDashboardLink()} className="btn">
            Go to Dashboard
          </Link>
          <button 
            onClick={() => router.back()} 
            className="btn-outline"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import getPB from "../lib/pocketbase";
import { hasAnyRole } from "../lib/roles";

export default function RoleProtected({ children, allowedRoles }) {
  const router = useRouter();
  const pb = getPB();
  const user = pb.authStore.model;

  useEffect(() => {
    if (!hasAnyRole(user, allowedRoles)) {
      router.replace("/dashboard");
    }
  }, [user, allowedRoles, router]);

  if (!hasAnyRole(user, allowedRoles)) {
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-slate-600">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return children;
}
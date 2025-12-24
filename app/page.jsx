"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import getPB from "../lib/pocketbase";

export default function Home() {
  const router = useRouter();
  const pb = getPB();

  useEffect(() => {
    const rec = pb.authStore.model;
    if (pb.authStore.isValid && rec?.verified) router.replace("/dashboard");
    else router.replace("/login");
  }, [pb, router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <span className="text-slate-500">Loading...</span>
    </div>
  );
}


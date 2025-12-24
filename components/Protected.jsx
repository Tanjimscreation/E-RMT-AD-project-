"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import getPB from "../lib/pocketbase";

export default function Protected({ children }) {
  const router = useRouter();
  const pb = getPB();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        if (!pb.authStore.isValid) throw new Error("not auth");
        // Try refresh token to ensure validity
        await pb.collection("teachers").authRefresh();
        const record = pb.authStore.model;
        if (!record?.verified) throw new Error("not verified");
        setOk(true);
      } catch (e) {
        router.replace("/login");
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ok) return null;
  return children;
}


/*  "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import getPB from "../lib/pocketbase";

export default function Protected({ children }) {
  const router = useRouter();
  const pb = getPB();
  const [ok, setOk] = useState(false);

  // BYPASS PROTECTION IN DEVELOPMENT ONLY
  if (process.env.NODE_ENV === "development") {
    return <>{children}</>;
  }

  useEffect(() => {
    const check = async () => {
      try {
        if (!pb.authStore.isValid) throw new Error("not auth");
        await pb.collection("teachers").authRefresh();
        const record = pb.authStore.model;
        if (!record?.verified) throw new Error("not verified");
        setOk(true);
      } catch (e) {
        router.replace("/login");
      }
    };
    check();
  }, [pb, router]);

  if (!ok) return null;
  return <>{children}</>;
}
*/
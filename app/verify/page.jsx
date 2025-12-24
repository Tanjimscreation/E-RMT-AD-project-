"use client";

import "../special.css";
import { useState } from "react";
import getPB from "../../lib/pocketbase";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const pb = getPB();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const verify = async () => {
    try {
      const result = await pb.collection("teachers").getFirstListItem(
        `verifyCode="${code}"`
      );

      await pb.collection("teachers").update(result.id, {
        emailVerified: true,
        verifyCode: ""
      });

      router.push("/login");
    } catch {
      setError("Invalid verification code");
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card auth-card auth-glass">
        <h1 className="auth-welcome">Verification</h1>

        <input
          className="auth-input"
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button className="auth-btn auth-btn-primary" onClick={verify}>
          Verify
        </button>

        {error && <p className="verify-error">{error}</p>}
      </div>
    </div>
  );
}

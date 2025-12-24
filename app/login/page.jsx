"use client";

import "../special.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import getPB from "../../lib/pocketbase";

export default function LoginPage() {
  const router = useRouter();
  const pb = getPB();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rec = pb.authStore.model;
    if (pb.authStore.isValid && rec?.verified) router.replace("/dashboard");
  }, [pb, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await pb.collection("teachers").authWithPassword(email, password);
      const rec = pb.authStore.model;
      if (!rec.emailVerified) {
        pb.authStore.clear();
        throw new Error("Please verify your email first.");
      }

      if (!rec.verified) {
        pb.authStore.clear();
        throw new Error("Waiting for admin approval.");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="">
          <div className="mb-4 text-center">
          {/* Logo */}
          <div className="auth-avatar-wrap">
            <div className="auth-avatar">
              <img
                src="/logo.png" 
                alt="ERMT logo"
                className="auth-avatar-logo"
              />
            </div>
          </div>
          <h1 className="auth-welcome">Welcome,</h1>
        </div>
        <form onSubmit={onSubmit} className="auth-card auth-glass p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <p className="auth-link">
            <Link href="/register">Forgot Password</Link>
          </p>
          <button className="auth-btn auth-btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="auth-link mt-8">
          <Link href="/register">No account? Register</Link>
        </p>
      </div>
      <div><p className="auth-footer fixed bottom-0 left-0 w-full mb-2 text-center text-sm text-slate-600">
        e-RMT@Sekolah Kebangsaan Taman Putra Perdana</p></div>
    </div>
    </div>
  );
}

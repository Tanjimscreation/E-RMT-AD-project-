"use client";
import "../special.css";
import { useState } from "react";
import Link from "next/link";
import getPB from "../../lib/pocketbase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const pb = getPB();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const record = await pb.collection("teachers").create({
        email,
        password,
        passwordConfirm: confirm,
        name,
        role,
        emailVerified: false,
        emailVisibility: false
      });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      await pb.collection("teachers").update(record.id, {
        verifyCode: code
      });

      // Send OTP email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Verify your e-RMT account',
          html: `
            <p>Your verification code is:</p>
            <h2>${code}</h2>
            <p>Enter this code to activate your account.</p>
          `
        })
      });

      // Send admin notification
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'salehhassane@graduate.utm.my',
          subject: 'New registration pending approval',
          html: `
            <p>New user registered:</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role:</strong> ${role}</p>
          `
        })
      });

      setMessage(
        "Registration successful. Please check your email for the verification code."
      );

      setTimeout(() => router.push("/verify"), 1200);
    } catch (err) {
      console.error(err);
      setError(
        err?.data?.message ||
        err?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
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
          <h1 className="auth-welcome">Registration</h1>
        </div>
        <form onSubmit={onSubmit} className="auth-card auth-glass p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
          )}
          <div>
            <label className="auth-label">Name</label>
            <input
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="auth-label">Role</label>
            <select
              className="auth-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="teacher">Teacher</option>
              <option value="finance">Finance</option>
              <option value="canteen">Canteen Operator</option>
            </select>
          </div>
          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="auth-label-small">Minimum 8 characters.</p>
          </div>
          <div>
            <label className="auth-label">Confirm Password</label>
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className="auth-btn auth-btn-primary w-full" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="auth-link mt-8">
          <Link href="/login">Have an account? Login</Link>
        </p>
        <div><p className="auth-footer fixed bottom-0 left-0 w-full mb-2 text-center text-sm text-slate-600">
          e-RMT@Sekolah Kebangsaan Taman Putra Perdana</p></div>
      </div>
    </div>
  );
}
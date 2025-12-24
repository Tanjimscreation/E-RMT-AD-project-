"use client";

import { useState, useEffect } from "react";
import getPB from "../../../lib/pocketbase";
import { useRouter } from "next/navigation";

export default function AdminApprovePage() {
  const pb = getPB();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const user = pb.authStore.model;
      if (!user || user.role !== "admin") {
        router.push("/login");
        return;
      }
      loadPendingUsers();
    };
    checkAuth();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const records = await pb.collection("teachers").getFullList({
        filter: 'emailVerified = true && verified = false',
        sort: '-created',
      });
      setPendingUsers(records);
    } catch (err) {
      setError("Failed to load pending users");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userEmail, userName) => {
    try {
      await pb.collection("teachers").update(userId, {
        verified: true
      });

      // Send approval email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Your e-RMT account has been approved',
          html: `
            <p>Hi ${userName},</p>
            <p>Your account has been approved by the administrator.</p>
            <p>You can now log in to your account at <a href="${window.location.origin}/login">e-RMT</a>.</p>
          `
        })
      });

      loadPendingUsers();
    } catch (err) {
      alert("Failed to approve user");
    }
  };

  const handleReject = async (userId, userEmail, userName) => {
    if (!confirm("Are you sure you want to reject this registration?")) return;
    
    try {
      // Send rejection email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Your e-RMT registration was not approved',
          html: `
            <p>Hi ${userName},</p>
            <p>Unfortunately, your registration request has been rejected by the administrator.</p>
            <p>If you believe this is an error, please contact the school administration.</p>
          `
        })
      });

      await pb.collection("teachers").delete(userId);
      loadPendingUsers();
    } catch (err) {
      alert("Failed to reject user");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Pending Registrations</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">{error}</div>
        )}

        {pendingUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No pending registrations
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div key={user.id} className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-semibold">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-semibold capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registered</p>
                    <p className="font-semibold">
                      {new Date(user.created).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(user.id, user.email, user.name)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id, user.email, user.name)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
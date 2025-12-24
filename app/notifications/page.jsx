"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";
import getPB from "../../lib/pocketbase";

export default function NotificationsPage() {
  const pb = getPB();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissedPending, setDismissedPending] = useState(new Set());

  // Check if current user is admin
  useEffect(() => {
    const currentUser = pb.authStore.model;
    setIsAdmin(currentUser?.role === "admin");
    
    if (currentUser?.role === "admin") {
      loadPendingUsers();
    }
  }, []);

  // Load pending users for admin
  const loadPendingUsers = async () => {
    try {
      const records = await pb.collection("teachers").getFullList({
        filter: 'emailVerified = true && verified = false',
        sort: '-created',
      });
      setPendingUsers(records);
    } catch (err) {
      console.error("Failed to load pending users:", err);
    }
  };

  // Mark pending as "read" (dismissed)
  const markPendingAsRead = (userId) => {
    setDismissedPending(prev => new Set([...prev, userId]));
  };

  // Delete pending user
  const handleDeletePending = async (userId) => {
    if (!confirm("Delete this pending registration without notifying the user?")) return;
    
    try {
      await pb.collection("teachers").delete(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setDismissedPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete pending user");
    }
  };

  // Handle approve
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
            <p>You can now log in to your account.</p>
          `
        })
      });

      alert("User approved successfully!");
      loadPendingUsers();
      setDismissedPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to approve:", err);
      alert("Failed to approve user");
    }
  };

  // Handle reject
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
            <p>Unfortunately, your registration request has been rejected.</p>
            <p>If you believe this is an error, please contact the school administration.</p>
          `
        })
      });

      await pb.collection("teachers").delete(userId);
      alert("User rejected");
      loadPendingUsers();
      setDismissedPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to reject:", err);
      alert("Failed to reject user");
    }
  };

  // Load notifications for current user
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const currentUser = pb.authStore.model;
      
      let filterQuery = `recipient = "${currentUser?.id}"`;
      if (filter === "unread") filterQuery += ' && status = "unread"';
      if (filter === "read") filterQuery += ' && status = "read"';

      const records = await pb.collection("notifications").getFullList({
        sort: "-created",
        filter: filterQuery,
        expand: "sender",
      });
      setNotifications(records);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  // Mark as read
  const markAsRead = async (id) => {
    try {
      await pb.collection("notifications").update(id, { status: "read" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
      alert("Failed to update notification");
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => n.status === "unread");
      
      for (const notif of unreadNotifs) {
        await pb.collection("notifications").update(notif.id, { status: "read" });
      }
      
      // Also mark all pending as dismissed
      const allPendingIds = pendingUsers.map(u => u.id);
      setDismissedPending(new Set(allPendingIds));
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" }))
      );
      
      alert("All notifications marked as read!");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      alert("Failed to update notifications");
    }
  };

  // Delete notification
  const handleDelete = async (id) => {
    if (!confirm("Delete this notification?")) return;

    try {
      await pb.collection("notifications").delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete notification");
    }
  };

  // Get filtered pending users based on dismissed state
  const getFilteredPendingUsers = () => {
    if (filter === "all") return pendingUsers;
    if (filter === "unread") return pendingUsers.filter(u => !dismissedPending.has(u.id));
    if (filter === "read") return pendingUsers.filter(u => dismissedPending.has(u.id));
    return pendingUsers;
  };

  const filteredPendingUsers = getFilteredPendingUsers();
  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const unreadPendingCount = isAdmin ? pendingUsers.filter(u => !dismissedPending.has(u.id)).length : 0;

  return (
    <Protected>
      <NavBar />
      <div className="card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount + unreadPendingCount} unread notification{(unreadCount + unreadPendingCount) !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded text-sm ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded text-sm ${
                filter === "unread"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              Unread ({unreadCount + unreadPendingCount})
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`px-4 py-2 rounded text-sm ${
                filter === "read"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              Read
            </button>
            
            {(unreadCount > 0 || unreadPendingCount > 0) && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Pending Approvals as Notifications (Admin Only) */}
          {isAdmin && filteredPendingUsers.map((user) => {
            const isUnread = !dismissedPending.has(user.id);
            return (
              <div
                key={user.id}
                className={`border rounded-lg p-4 transition-all ${
                  isUnread
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">⚠️</span>
                      <h3 className="font-semibold text-lg">New Registration Pending</h3>
                      {isUnread && (
                        <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-2">
                      {user.name} has registered and is waiting for approval.
                    </p>
                    <p className="text-xs text-slate-500 mb-1">
                      Email: {user.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(user.created).toLocaleString("ms-MY", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isUnread && (
                      <button
                        onClick={() => markPendingAsRead(user.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePending(user.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleApprove(user.id, user.email, user.name)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id, user.email, user.name)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ✗ Reject
                    </button>
                    <div className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded font-medium capitalize">
                      Role: {user.role}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Regular Notifications */}
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`border rounded-lg p-4 transition-all ${
                notif.status === "unread"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {notif.type === "invoice" && (
                      <span className="text-2xl">📄</span>
                    )}
                    {notif.type === "system" && (
                      <span className="text-2xl">⚙️</span>
                    )}
                    {notif.type === "alert" && (
                      <span className="text-2xl">⚠️</span>
                    )}
                    <h3 className="font-semibold text-lg">{notif.title}</h3>
                    {notif.status === "unread" && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 mb-2">{notif.message}</p>
                  
                  {notif.expand?.sender && (
                    <p className="text-xs text-slate-500 mb-1">
                      From: {notif.expand.sender.name || notif.expand.sender.email}
                    </p>
                  )}
                  
                  <p className="text-xs text-slate-500">
                    {new Date(notif.created).toLocaleString("ms-MY", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  {notif.status === "unread" && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {notif.type === "invoice" && notif.invoiceNumber && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => router.push("/borang/invoice/view")}
                      className="px-4 py-2 text-sm bg-slate-900 text-white rounded hover:bg-slate-800"
                    >
                      View All Invoices
                    </button>
                    {notif.amount && (
                      <div className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded font-medium">
                        Amount: RM {notif.amount.toFixed(2)}
                      </div>
                    )}
                    {notif.studentCount && (
                      <div className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded font-medium">
                        Students: {notif.studentCount}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="py-8 text-center text-slate-500">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full"></div>
              <p className="mt-2">Loading...</p>
            </div>
          )}

          {!loading && notifications.length === 0 && filteredPendingUsers.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-lg font-medium">No notifications found</p>
              <p className="text-sm mt-1">
                {filter === "unread" && "You're all caught up!"}
                {filter === "read" && "No read notifications"}
                {filter === "all" && "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
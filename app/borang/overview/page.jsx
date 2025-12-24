"use client";

import { useState, useEffect } from "react";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";

export default function SystemOverviewPage() {
  const [pb, setPb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const client = getPB();
      setPb(client);
    } catch (err) {
      console.error("Failed to initialize PocketBase:", err);
      setError("Failed to initialize database connection. Please refresh the page.");
    }
  }, []);
  
  const [formData, setFormData] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.fromDate || !formData.toDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (!pb) {
      setError("PocketBase client not initialized. Please refresh the page.");
      return;
    }

    setError("");
    setLoading(true);
    setData(null);

    try {
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      toDate.setHours(23, 59, 59, 999);

      // Fetch all data in parallel
      const [students, attendance, invoices, borangC6] = await Promise.all([
        pb.collection("students").getFullList(),
        pb.collection("attendance").getFullList({
          filter: `date >= "${fromDate.toISOString()}" && date <= "${toDate.toISOString()}"`
        }),
        pb.collection("invoices").getFullList({
          filter: `created >= "${fromDate.toISOString()}" && created <= "${toDate.toISOString()}"`
        }),
        pb.collection("borang_c6").getFullList({
          filter: `created >= "${fromDate.toISOString()}" && created <= "${toDate.toISOString()}"`
        })
      ]);

      // Calculate statistics
      const totalStudents = students.length;
      const attendanceRecords = attendance.length;
      const presentCount = attendance.filter(r => r.present === true).length;
      const attendancePercentage = attendanceRecords > 0 
        ? ((presentCount / attendanceRecords) * 100).toFixed(2) 
        : "0.00";

      const invoicesGenerated = invoices.length;
      const invoiceAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
      const unpaidInvoices = invoices.filter(inv => inv.status === "unpaid" || inv.status === "pending").length;

      const borangC6Submitted = borangC6.length;

      setData({
        totalStudents,
        attendanceRecords,
        presentCount,
        attendancePercentage,
        invoicesGenerated,
        invoiceAmount,
        paidInvoices,
        unpaidInvoices,
        borangC6Submitted,
        dateRange: {
          from: fromDate.toLocaleDateString('ms-MY'),
          to: toDate.toLocaleDateString('ms-MY')
        }
      });

    } catch (err) {
      console.error(err);
      setError("Failed to generate system overview. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>System Overview Dashboard</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 20px;
          }
          .header p {
            margin: 5px 0;
            font-size: 12px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
          }
          .stat-card {
            border: 2px solid black;
            padding: 20px;
            text-align: center;
            background: #f9f9f9;
          }
          .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
          }
          .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
          }
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .section h2 {
            border-bottom: 1px solid black;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SYSTEM OVERVIEW DASHBOARD</h1>
          <p>Period: ${data.dateRange.from} - ${data.dateRange.to}</p>
          <p>Generated on: ${new Date().toLocaleDateString('ms-MY')} ${new Date().toLocaleTimeString('ms-MY')}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Students</h3>
            <p class="value">${data.totalStudents}</p>
          </div>
          <div class="stat-card">
            <h3>Attendance Records</h3>
            <p class="value">${data.attendanceRecords}</p>
          </div>
          <div class="stat-card">
            <h3>Attendance Rate</h3>
            <p class="value">${data.attendancePercentage}%</p>
          </div>
          <div class="stat-card">
            <h3>Invoices Generated</h3>
            <p class="value">${data.invoicesGenerated}</p>
          </div>
          <div class="stat-card">
            <h3>Invoice Amount</h3>
            <p class="value">RM ${data.invoiceAmount.toFixed(2)}</p>
          </div>
          <div class="stat-card">
            <h3>Borang C6</h3>
            <p class="value">${data.borangC6Submitted}</p>
          </div>
        </div>

        <div class="section">
          <h2>Attendance Details</h2>
          <div class="detail-row">
            <span>Total Records</span>
            <span>${data.attendanceRecords}</span>
          </div>
          <div class="detail-row">
            <span>Present Count</span>
            <span style="color: green;">${data.presentCount}</span>
          </div>
          <div class="detail-row">
            <span>Absent Count</span>
            <span style="color: red;">${data.attendanceRecords - data.presentCount}</span>
          </div>
          <div class="detail-row">
            <span>Attendance Percentage</span>
            <span><strong>${data.attendancePercentage}%</strong></span>
          </div>
        </div>

        <div class="section">
          <h2>Invoice Details</h2>
          <div class="detail-row">
            <span>Total Invoices</span>
            <span>${data.invoicesGenerated}</span>
          </div>
          <div class="detail-row">
            <span>Paid Invoices</span>
            <span style="color: green;">${data.paidInvoices}</span>
          </div>
          <div class="detail-row">
            <span>Unpaid Invoices</span>
            <span style="color: red;">${data.unpaidInvoices}</span>
          </div>
          <div class="detail-row">
            <span>Total Amount</span>
            <span><strong>RM ${data.invoiceAmount.toFixed(2)}</strong></span>
          </div>
        </div>

        <div class="section">
          <h2>Form Submissions</h2>
          <div class="detail-row">
            <span>Borang C6 Submitted</span>
            <span>${data.borangC6Submitted}</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Protected allowedRoles={["admin"]}>
      <NavBar />
      <div className="card p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">System Overview Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">High-level summary of system data</p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-outline print:hidden"
            disabled={!data}
          >
            Print Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Date Range */}
        <div className="rounded-lg border border-slate-200 p-4 mb-6">
          <h3 className="font-semibold mb-3">Date Range</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">From Date</label>
              <input
                type="date"
                className="input"
                value={formData.fromDate}
                onChange={(e) => handleChange('fromDate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">To Date</label>
              <input
                type="date"
                className="input"
                value={formData.toDate}
                onChange={(e) => handleChange('toDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="btn w-full mb-6"
          disabled={loading || !pb}
        >
          {loading ? "Generating Overview..." : "Generate Overview"}
        </button>

        {/* Dashboard Display */}
        {data && (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewCard 
                title="Total Students" 
                value={data.totalStudents}
                icon="👨‍🎓"
              />
              <OverviewCard 
                title="Attendance Records" 
                value={data.attendanceRecords}
                icon="📋"
              />
              <OverviewCard 
                title="Attendance Rate" 
                value={`${data.attendancePercentage}%`}
                icon="✓"
                color="green"
              />
              <OverviewCard 
                title="Invoices Generated" 
                value={data.invoicesGenerated}
                icon="🧾"
              />
              <OverviewCard 
                title="Invoice Amount" 
                value={`RM ${data.invoiceAmount.toFixed(2)}`}
                icon="💰"
                color="blue"
              />
              <OverviewCard 
                title="Borang C6 Submitted" 
                value={data.borangC6Submitted}
                icon="📄"
              />
            </div>

            {/* Detailed Sections */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Attendance Details */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold mb-3">Attendance Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Total Records</span>
                    <span className="font-medium">{data.attendanceRecords}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Present</span>
                    <span className="font-medium text-green-600">{data.presentCount}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Absent</span>
                    <span className="font-medium text-red-600">{data.attendanceRecords - data.presentCount}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold mb-3">Invoice Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Total Generated</span>
                    <span className="font-medium">{data.invoicesGenerated}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Paid</span>
                    <span className="font-medium text-green-600">{data.paidInvoices}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">Unpaid</span>
                    <span className="font-medium text-red-600">{data.unpaidInvoices}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}

function OverviewCard({ title, value, icon, color = "slate" }) {
  const colorClasses = {
    slate: "border-slate-300 bg-slate-50",
    green: "border-green-300 bg-green-50",
    blue: "border-blue-300 bg-blue-50",
    red: "border-red-300 bg-red-50"
  };

  return (
    <div className={`rounded-lg border-2 p-4 text-center ${colorClasses[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-slate-600 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
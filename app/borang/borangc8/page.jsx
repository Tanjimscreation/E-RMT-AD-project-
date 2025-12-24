"use client";

import { useState, useEffect } from "react";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";

export default function BorangC8Page() {
  const [pb, setPb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState(null);
  
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    schoolName: 'SEKOLAH TAMAN PUTRA PERDANA'
  });

  useEffect(() => {
    const client = getPB();
    setPb(client);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const handleGenerate = async () => {
    if (!pb) {
      setError("PocketBase client not initialized. Please refresh the page.");
      return;
    }

    setError("");
    setLoading(true);
    setAttendanceData(null);

    try {
      const year = formData.year;
      const month = formData.month;
      const daysInMonth = getDaysInMonth(month, year);

      // Create date range for the month
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month - 1, daysInMonth, 23, 59, 59);

      // Fetch students and attendance
      const [students, attendance] = await Promise.all([
        pb.collection("students").getFullList({ sort: "name" }),
        pb.collection("attendance").getFullList({
          filter: `date >= "${fromDate.toISOString()}" && date <= "${toDate.toISOString()}"`,
          expand: "student"
        })
      ]);

      // Create attendance matrix
      const attendanceMatrix = {};
      students.forEach(student => {
        attendanceMatrix[student.id] = {
          name: student.name,
          class: student.class || "-",
          days: Array(daysInMonth).fill(null)
        };
      });

      // Fill in attendance data - X means present
      // FIXED: Now checks for present === true instead of status field
      attendance.forEach(record => {
        const studentId = record.student;
        const date = new Date(record.date);
        const day = date.getDate() - 1; // 0-indexed
        
        if (attendanceMatrix[studentId]) {
          // Mark as X (present) if the record exists and present is true
          if (record.present === true) {
            attendanceMatrix[studentId].days[day] = "X";
          }
        }
      });

      // Calculate totals - X = present, null = absent
      // FIXED: Changed from "O" to "X" to match the marking above
      const studentsWithTotals = Object.entries(attendanceMatrix).map(([id, data]) => {
        const present = data.days.filter(d => d === "X").length; // X = present (FIXED)
        const absent = data.days.filter(d => d === null).length; // null = absent
        return {
          id,
          name: data.name,
          class: data.class,
          days: data.days,
          present,
          absent,
          total: present + absent
        };
      });

      setAttendanceData({
        students: studentsWithTotals,
        daysInMonth,
        totalStudents: students.length,
        totalPresent: studentsWithTotals.reduce((sum, s) => sum + s.present, 0),
        totalAbsent: studentsWithTotals.reduce((sum, s) => sum + s.absent, 0)
      });
    } catch (err) {
      console.error("Error generating report:", err);
      setError("Failed to generate report. " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];

  return (
    <Protected allowedRoles={["admin", "teacher"]}>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .no-print {
            display: none !important;
          }
          
          nav {
            display: none !important;
          }
          
          .print-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid black !important;
            padding: 2px 4px;
            font-size: 8pt;
          }
          
          .print-table th {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-table .summary-row {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 10px;
          }
        }
      `}</style>
      
      <NavBar />
      <div className="min-h-screen pb-16">
        <div className="max-w-full mx-auto p-4">
          {/* Form Controls - Hidden when printing */}
          <div className="no-print mb-6 bg-white rounded-lg shadow-sm border p-4">
            <h1 className="text-xl font-semibold mb-4">Generate Borang C8</h1>
            
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div>
                <label className="label">School Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Month</label>
                <select
                  className="input"
                  value={formData.month}
                  onChange={(e) => handleChange('month', parseInt(e.target.value))}
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input
                  type="number"
                  className="input"
                  value={formData.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                className="btn flex-1"
                disabled={loading || !pb}
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
              {attendanceData && (
                <button
                  onClick={handlePrint}
                  className="btn-outline"
                >
                  Print Report
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Borang C8 Document */}
          {attendanceData && (
            <div className="print-container bg-white">
              {/* Header */}
              <div className="print-header text-center mb-4">
                <div className="text-right text-xs mb-2">BORANG C8</div>
                <h1 className="text-lg font-bold mb-1">REKOD KEHADIRAN MURID RMT</h1>
                <div className="text-sm font-semibold">{formData.schoolName}</div>
                <div className="text-sm">
                  BULAN: {monthNames[formData.month - 1].toUpperCase()} {formData.year}
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-x-auto">
                <table className="print-table w-full border-collapse" style={{ fontSize: '10px' }}>
                  <thead>
                    <tr>
                      <th className="border border-black p-1 bg-gray-100" rowSpan="2" style={{ minWidth: '30px' }}>BIL</th>
                      <th className="border border-black p-1 bg-gray-100" rowSpan="2" style={{ minWidth: '150px' }}>NAMA</th>
                      <th className="border border-black p-1 bg-gray-100" rowSpan="2" style={{ minWidth: '50px' }}>KELAS</th>
                      <th className="border border-black p-1 bg-gray-100 text-center" colSpan={attendanceData.daysInMonth}>
                        BULAN: {monthNames[formData.month - 1].toUpperCase()}
                      </th>
                      <th className="border border-black p-1 bg-gray-100" rowSpan="2" style={{ minWidth: '50px' }}>JUMLAH HADIR</th>
                      <th className="border border-black p-1 bg-gray-100" colSpan="2">TIDAK HADIR</th>
                    </tr>
                    <tr>
                      {Array.from({ length: attendanceData.daysInMonth }, (_, i) => (
                        <th key={i} className="border border-black p-1 bg-gray-100 text-center" style={{ minWidth: '20px', maxWidth: '20px' }}>
                          {i + 1}
                        </th>
                      ))}
                      <th className="border border-black p-1 bg-gray-100" style={{ minWidth: '50px' }}>BULAN SEMASA</th>
                      <th className="border border-black p-1 bg-gray-100" style={{ minWidth: '50px' }}>BULAN LEPAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.students.map((student, idx) => (
                      <tr key={student.id}>
                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                        <td className="border border-black p-1">{student.name}</td>
                        <td className="border border-black p-1 text-center">{student.class}</td>
                        {student.days.map((status, dayIdx) => (
                          <td key={dayIdx} className="border border-black p-1 text-center" style={{ minWidth: '20px', maxWidth: '20px' }}>
                            {status === "X" ? "X" : ""}
                          </td>
                        ))}
                        <td className="border border-black p-1 text-center font-semibold">{student.present}</td>
                        <td className="border border-black p-1 text-center">{student.absent}</td>
                        <td className="border border-black p-1 text-center">-</td>
                      </tr>
                    ))}
                    
                    {/* Summary Rows */}
                    <tr className="summary-row font-bold bg-gray-50">
                      <td className="border border-black p-1 text-left" colSpan="3">JUMLAH MURID TIDAK HADIR</td>
                      {Array.from({ length: attendanceData.daysInMonth }, (_, i) => {
                        const dayAbsent = attendanceData.students.filter(s => s.days[i] === null).length;
                        return (
                          <td key={i} className="border border-black p-1 text-center">
                            {dayAbsent > 0 ? dayAbsent : ""}
                          </td>
                        );
                      })}
                      <td className="border border-black p-1" colSpan="3"></td>
                    </tr>
                    <tr className="summary-row font-bold bg-gray-50">
                      <td className="border border-black p-1 text-left" colSpan="3">JUMLAH MURID HADIR</td>
                      {Array.from({ length: attendanceData.daysInMonth }, (_, i) => {
                        const dayPresent = attendanceData.students.filter(s => s.days[i] === "X").length;
                        return (
                          <td key={i} className="border border-black p-1 text-center">
                            {dayPresent > 0 ? dayPresent : ""}
                          </td>
                        );
                      })}
                      <td className="border border-black p-1" colSpan="3"></td>
                    </tr>
                    <tr className="summary-row font-bold bg-gray-50">
                      <td className="border border-black p-1 text-left" colSpan="3">JUMLAH KEHADIRAN SEPATUTNYA</td>
                      {Array.from({ length: attendanceData.daysInMonth }, (_, i) => {
                        const dayTotal = attendanceData.students.length;
                        return (
                          <td key={i} className="border border-black p-1 text-center">
                            {dayTotal}
                          </td>
                        );
                      })}
                      <td className="border border-black p-1" colSpan="3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
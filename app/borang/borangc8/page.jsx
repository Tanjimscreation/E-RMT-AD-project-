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
    try {
      const client = getPB();
      if (client) {
        setPb(client);
      } else {
        setError("Failed to initialize database connection. Please refresh the page.");
      }
    } catch (err) {
      console.error("Failed to initialize PocketBase:", err);
      setError("Database connection error. Please refresh the page.");
    }
  }, []);

  const handleChange = (field, value) => {
    // Validate input before updating state
    if (field === 'month') {
      const monthVal = parseInt(value);
      if (monthVal < 1 || monthVal > 12) return;
    } else if (field === 'year') {
      const yearVal = parseInt(value);
      if (yearVal < 2020 || yearVal > 2030) return;
    } else if (field === 'schoolName' && typeof value !== 'string') {
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const handleGenerate = async () => {
    // Validate PocketBase client
    if (!pb) {
      setError("PocketBase client not initialized. Please refresh the page.");
      return;
    }

    // Validate form data
    if (!formData.schoolName || formData.schoolName.trim() === "") {
      setError("School name is required.");
      return;
    }

    setError("");
    setLoading(true);
    setAttendanceData(null);

    try {
      const year = parseInt(formData.year);
      const month = parseInt(formData.month);

      // Validate month and year
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        throw new Error("Invalid month or year selected.");
      }

      const daysInMonth = getDaysInMonth(month, year);

      // Fetch students and attendance with separate error handling
      let students = [];
      let attendance = [];

      try {
        students = await pb.collection("students").getFullList({ sort: "name" });
      } catch (err) {
        console.error("Error fetching students:", err);
        throw new Error("Failed to fetch student data. Please try again.");
      }

      if (!students || students.length === 0) {
        setError("No students found in the system.");
        setLoading(false);
        return;
      }

      try {
        attendance = await pb.collection("attendance").getFullList({
          sort: "date"
        });
      } catch (err) {
        console.error("Error fetching attendance:", err);
        // Don't fail if attendance fetch fails, just continue with empty attendance
        attendance = [];
      }

      // Create attendance matrix with validation
      const attendanceMatrix = {};
      students.forEach(student => {
        if (student && student.id) {
          attendanceMatrix[student.id] = {
            name: (student.name || "Unknown").trim(),
            class: (student.class || "-").trim(),
            days: Array(daysInMonth).fill(null)
          };
        }
      });

      // Fill in attendance data with proper validation
      if (Array.isArray(attendance)) {
        attendance.forEach(record => {
          // Validate record structure
          if (!record || typeof record !== 'object') return;

          const studentId = record.student;
          if (!studentId || !attendanceMatrix[studentId]) return;

          try {
            const recordDate = new Date(record.date);
            
            // Validate date
            if (isNaN(recordDate.getTime())) return;
            
            const recordMonth = recordDate.getMonth() + 1;
            const recordYear = recordDate.getFullYear();
            
            // Only process records from the selected month/year
            if (recordMonth === month && recordYear === year) {
              const day = recordDate.getDate() - 1; // 0-indexed
              
              // Validate day index
              if (day >= 0 && day < daysInMonth) {
                // Mark as X (present) if present is explicitly true
                if (record.present === true) {
                  attendanceMatrix[studentId].days[day] = "X";
                }
              }
            }
          } catch (err) {
            console.warn("Error processing attendance record:", record, err);
            // Skip malformed records
          }
        });
      }

      // Calculate totals with validation
      const studentsWithTotals = Object.entries(attendanceMatrix)
        .map(([id, data]) => {
          const present = data.days.filter(d => d === "X").length;
          const absent = data.days.filter(d => d === null).length;
          return {
            id,
            name: data.name,
            class: data.class,
            days: data.days,
            present,
            absent,
            total: present + absent
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)); // Ensure consistent sorting

      if (studentsWithTotals.length === 0) {
        throw new Error("No valid student data available.");
      }

      // Calculate summary
      const totalPresent = studentsWithTotals.reduce((sum, s) => sum + s.present, 0);
      const totalAbsent = studentsWithTotals.reduce((sum, s) => sum + s.absent, 0);

      setAttendanceData({
        students: studentsWithTotals,
        daysInMonth,
        totalStudents: studentsWithTotals.length,
        totalPresent,
        totalAbsent,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message || "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!attendanceData || !attendanceData.students || attendanceData.students.length === 0) {
      setError("No valid data to print. Please generate a report first.");
      return;
    }
    try {
      window.print();
    } catch (err) {
      console.error("Print error:", err);
      setError("Failed to open print dialog.");
    }
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
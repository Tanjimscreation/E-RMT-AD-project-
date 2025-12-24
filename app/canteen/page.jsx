"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";
import getPB from "../../lib/pocketbase";
import { nextDayISO, startOfDayISO } from "../../utils/dates";

export default function CanteenPage() {
  const pb = getPB();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [q, setQ] = useState("");
  
  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => startOfDayISO(today), [today]);
  const to = useMemo(() => nextDayISO(today), [today]);
  
  const load = async () => {
    setLoading(true);
    try {
      console.log("Loading attendance from:", from, "to:", to);
      
      // Load today's present students
      const attendance = await pb.collection("attendance").getFullList({
        filter: `present = true && date >= "${from}" && date < "${to}"`,
        expand: "student,student.grade",
      });
      console.log("Found attendance records:", attendance.length);
      
      const students = attendance
        .map((a) => a.expand?.student)
        .filter(Boolean);
      console.log("Present students:", students.length);
      
      // Load today's canteen records
      const canteen = await pb.collection("canteen").getFullList({
        filter: `date >= "${from}" && date < "${to}"`,
      });
      console.log("Canteen records:", canteen.length);
      
      // Map student -> canteen record
      const mapC = new Map(canteen.map((c) => [c.student, c]));
      
      let mapped = students.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        gradeId: s.expand?.grade?.id || null,
        gradeName: s.expand?.grade?.name || "-",
        gradeYear: s.expand?.grade?.Year || "-",
        canteen: mapC.get(s.id) || null,
      }));
      
      // Sort by tahun > kelas > nama (ascending)
      mapped = mapped.sort((a, b) => {
        const y = (a.gradeYear || 0) - (b.gradeYear || 0);
        if (y !== 0) return y;
        const g = a.gradeName.localeCompare(b.gradeName);
        if (g !== 0) return g;
        return a.name.localeCompare(b.name);
      });
      
      console.log("Final mapped students:", mapped.length);
      setRows(mapped);
    } catch (err) {
      console.error("Failed to load canteen data:", err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    load();
    const loadGrades = async () => {
      try {
        const list = await pb.collection("grades").getFullList({ sort: "Year,name" });
        setGrades(list);
      } catch (err) {
        console.error("Failed to load grades:", err);
      }
    };
    loadGrades();
  }, [pb, from, to]);
  
  // Toggle lunch received
  const toggleLunch = async (studentId, checked) => {
    try {
      const row = rows.find((r) => r.id === studentId);
      const existing = row?.canteen;
      let saved;
      
      if (existing) {
        saved = await pb.collection("canteen").update(existing.id, {
          lunchReceived: checked,
        });
      } else {
        saved = await pb.collection("canteen").create({
          student: studentId,
          date: new Date().toISOString(),
          lunchReceived: checked,
        });
      }
      
      // update UI instantly
      setRows((prev) =>
        prev.map((r) =>
          r.id === studentId ? { ...r, canteen: saved } : r
        )
      );
    } catch (err) {
      console.error("Toggle lunch error:", err);
      alert("Failed to update lunch status. Please try again.");
    }
  };
  
  // SELECT ALL - Fixed version
  const selectAllLunch = async () => {
    const confirmAll = window.confirm(
      "Mark ALL present students as having received lunch?"
    );
    if (!confirmAll) return;
    
    setLoading(true);
    try {
      const updates = [];
      
      // Process all students in filtered list
      for (const r of filtered) {
        const existing = r.canteen;
        
        if (existing) {
          // Update existing record
          const promise = pb.collection("canteen").update(existing.id, {
            lunchReceived: true,
          });
          updates.push({ studentId: r.id, promise });
        } else {
          // Create new record
          const promise = pb.collection("canteen").create({
            student: r.id,
            date: new Date().toISOString(),
            lunchReceived: true,
          });
          updates.push({ studentId: r.id, promise });
        }
      }
      
      // Wait for all updates to complete
      const results = await Promise.all(
        updates.map(async ({ studentId, promise }) => {
          try {
            const saved = await promise;
            return { studentId, saved, success: true };
          } catch (err) {
            console.error("Failed to update student " + studentId + ":", err);
            return { studentId, success: false };
          }
        })
      );
      
      // Update state once with all changes
      setRows((prev) => {
        const updated = [...prev];
        results.forEach(({ studentId, saved, success }) => {
          if (success) {
            const index = updated.findIndex((r) => r.id === studentId);
            if (index !== -1) {
              updated[index] = { ...updated[index], canteen: saved };
            }
          }
        });
        return updated;
      });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount > 0) {
        alert("Updated " + successCount + " students. Failed to update " + failCount + " students.");
      } else {
        alert("All " + successCount + " students marked as lunch received.");
      }
    } catch (err) {
      console.error("Select all error:", err);
      alert("Failed to update students.");
    } finally {
      setLoading(false);
    }
  };
  
  // Send to invoice
  const handleMealOrder = () => {
    const confirmed = window.confirm(
      "Are you sure you want to send meal order data to invoice?"
    );
    if (confirmed) {
      router.push("/borang/invoice");
    }
  };
  
  // Print canteen list
  const handlePrint = () => {
    const today = new Date().toLocaleDateString('ms-MY');
    const printWindow = window.open('', '_blank');
    
    const tableRows = filtered.map((r, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${r.studentId}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${r.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${r.gradeYear}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${r.gradeName}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
          ${r.canteen?.lunchReceived ? '✓' : ''}
        </td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Canteen Report - ${today}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header-left h1 {
            margin: 0 0 5px 0;
            font-size: 18px;
          }
          .header-left p {
            margin: 0;
            font-size: 12px;
          }
          .date-box {
            border: 2px solid black;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 14px;
          }
          .text-center {
            text-align: center;
            margin: 20px 0;
          }
          .text-center h2 {
            margin: 10px 0;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f3f4f6;
            border: 1px solid #ddd;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
          }
          td {
            font-size: 11px;
          }
          .summary {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
          }
          .summary-item {
            font-size: 14px;
            padding: 10px 0;
          }
          .summary-item strong {
            font-weight: 600;
          }
          .footer-note {
            text-align: center;
            font-style: italic;
            margin-top: 30px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>SENARAI KANTIN</h1>
            <p>Laporan Makanan Harian</p>
          </div>
          <div class="date-box">Tarikh: ${today}</div>
        </div>
        <div class="text-center">
          <h2>REKOD PENGAMBILAN MAKANAN MURID</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">BIL</th>
              <th style="width: 100px;">ID</th>
              <th>NAMA</th>
              <th style="width: 80px; text-align: center;">TAHUN</th>
              <th style="width: 100px;">KELAS</th>
              <th style="width: 100px; text-align: center;">DITERIMA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-item">
            <strong>Jumlah Murid Hadir:</strong> ${filtered.length}
          </div>
          <div class="summary-item">
            <strong>Jumlah Makanan Diterima:</strong> ${filtered.filter(r => r.canteen?.lunchReceived).length}
          </div>
        </div>
        <div class="footer-note">
          Dicetak pada: ${new Date().toLocaleString('ms-MY')}
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
  
  // Filters
  const filtered = rows.filter((r) => {
    const passGrade = !gradeId || r.gradeId === gradeId;
    const text = `${r.name} ${r.studentId}`.toLowerCase();
    const passQ = !q || text.includes(q.toLowerCase());
    return passGrade && passQ;
  });
  
  return (
    <Protected>
      <NavBar />
      <div className="card p-6">
        {/* TOP BAR */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Canteen - Today</h1>
          <button onClick={handleMealOrder} className="btn">
            Meal Order
          </button>
          <button onClick={handlePrint} className="btn-outline">
            Print Report
          </button>
          <select
            className="input max-w-[14rem]"
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                Tahun {g.Year} - {g.name}
              </option>
            ))}
          </select>
          {/* SELECT ALL BUTTON - FIXED */}
          <button
            className="btn-outline"
            onClick={selectAllLunch}
            disabled={loading || filtered.length === 0}
          >
            Select All
          </button>
          <input
            className="input max-w-xs"
            placeholder="Search name or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        
        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">BIL</th>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">NAMA</th>
                <th className="py-2 pr-4">TAHUN</th>
                <th className="py-2 pr-4">KELAS</th>
                <th className="py-2 pr-4 text-center">LUNCH RECEIVED</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">{i + 1}</td>
                  <td className="py-2 pr-4">{r.studentId}</td>
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4">{r.gradeYear}</td>
                  <td className="py-2 pr-4">{r.gradeName}</td>
                  {/* PRETTIER CHECKBOX */}
                  <td className="py-2 pr-4">
                    <div className="flex justify-center">
                      <label className="relative flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={r.canteen?.lunchReceived === true}
                          onChange={(e) => toggleLunch(r.id, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-7 h-7 border-2 border-slate-300 rounded-lg 
                                      peer-checked:bg-green-500 peer-checked:border-green-600
                                      group-hover:border-slate-400 peer-checked:group-hover:bg-green-600
                                      transition-all duration-200 flex items-center justify-center
                                      shadow-sm">
                          {r.canteen?.lunchReceived && (
                            <svg 
                              className="w-5 h-5 text-white" 
                              fill="none" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="3" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td className="py-4 text-center text-slate-500" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="py-4 text-center text-slate-500" colSpan={6}>
                    No present students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Protected>
  );
}
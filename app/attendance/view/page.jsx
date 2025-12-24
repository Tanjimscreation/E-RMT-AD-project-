"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";
import { nextDayISO, startOfDayISO } from "../../../utils/dates";

export default function AttendanceViewPage() {
  const pb = getPB();
  const [gradeId, setGradeId] = useState("ALL");
  const [grades, setGrades] = useState([]);
  const [date, setDate] = useState(() => new Date());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [editModal, setEditModal] = useState({
    open: false,
    id: "",
    name: "",
    grade: "",
    studentId: "",
  });

  const from = useMemo(() => startOfDayISO(date), [date]);
  const to = useMemo(() => nextDayISO(date), [date]);

  // Load grade list
  useEffect(() => {
    const loadGrades = async () => {
      const list = await pb.collection("grades").getFullList({ sort: "name" });
      setGrades(list);
    };
    loadGrades();
  }, []);

  // Load students + attendance
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let students;
        if (gradeId === "ALL") {
          students = await pb.collection("students").getFullList({
            sort: "name",
            expand: "grade"
          });
        } else {
          students = await pb.collection("students").getFullList({
            filter: `grade = "${gradeId}"`,
            sort: "name",
            expand: "grade",
          });
        }

        const attendance = await pb.collection("attendance").getFullList({
          filter: `date >= "${from}" && date < "${to}"`,
          expand: "student",
        });

        // Auto-create attendance record for missing students
        for (const s of students) {
          const exists = attendance.find((a) => a.student === s.id);
          if (!exists) {
            const newRec = await pb.collection("attendance").create({
              student: s.id,
              present: false,
              date: new Date().toISOString(),
            });
            attendance.push({
              id: newRec.id,
              student: s.id,
              present: false,
              expand: { student: s },
            });
          }
        }

        // Build table rows
        let mapped = students.map((s) => {
          const record = attendance.find((a) => a.student === s.id);
          return {
            id: s.id,
            studentId: s.studentId,
            name: s.name,
            gradeId: s.grade,
            gradeName: s.expand?.grade?.name || "-",
            gradeYear: s.expand?.grade?.Year || "-",
            present: record?.present || false,
          };
        });

        // Sort by year → grade → name
        mapped = mapped.sort((a, b) => {
          const y = (a.gradeYear || 0) - (b.gradeYear || 0);
          if (y !== 0) return y;
          const g = a.gradeName.localeCompare(b.gradeName);
          if (g !== 0) return g;
          return a.name.localeCompare(b.name);
        });

        setRows(mapped);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gradeId, from, to]);

  // Toggle present status
  const updatePresentStatus = async (row, newValue) => {
    try {
      const existing = await pb.collection("attendance").getFirstListItem(
        `student = "${row.id}" && date >= "${from}" && date < "${to}"`
      );
      if (existing) {
        await pb.collection("attendance").update(existing.id, {
          present: newValue,
        });
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, present: newValue } : r
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  // Open modal
  const openEditModal = (row) => {
    setEditModal({
      open: true,
      id: row.id,
      name: row.name,
      grade: row.gradeId,
      studentId: row.studentId,
    });
  };

  // Save updates to student
  const saveEdit = async () => {
    try {
      await pb.collection("students").update(editModal.id, {
        name: editModal.name,
        grade: editModal.grade,
        studentId: editModal.studentId,
      });

      // Update UI instantly
      const selectedGrade = grades.find((g) => g.id === editModal.grade);
      setRows((prev) =>
        prev.map((r) =>
          r.id === editModal.id
            ? {
                ...r,
                name: editModal.name,
                gradeName: selectedGrade?.name || "-",
                gradeYear: selectedGrade?.Year || "-",
                gradeId: editModal.grade,
                studentId: editModal.studentId,
              }
            : r
        )
      );
      setEditModal({ ...editModal, open: false });
    } catch (err) {
      alert("Failed to update student");
      console.error(err);
    }
  };

  // Delete student
  const deleteStudent = async (row) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      await pb.collection("students").delete(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      alert("Failed to delete student");
    }
  };

  // Mark all as present
  const markAllPresent = async () => {
    if (!confirm("Mark all students as present?")) return;
    setLoading(true);
    try {
      // Update all attendance records for current date
      for (const row of rows) {
        const existing = await pb.collection("attendance").getFirstListItem(
          `student = "${row.id}" && date >= "${from}" && date < "${to}"`
        );
        if (existing && !existing.present) {
          await pb.collection("attendance").update(existing.id, {
            present: true,
          });
        }
      }
      // Update UI
      setRows((prev) => prev.map((r) => ({ ...r, present: true })));
    } catch (err) {
      alert("Failed to mark all as present");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected>
      <NavBar />

      {/* EDIT MODAL */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
            
            <label className="label">Nama</label>
            <input
              className="input mb-3"
              value={editModal.name}
              onChange={(e) =>
                setEditModal({ ...editModal, name: e.target.value })
              }
            />

            <label className="label">Tahun & Kelas</label>
            <select
              className="input mb-3"
              value={editModal.grade}
              onChange={(e) =>
                setEditModal({ ...editModal, grade: e.target.value })
              }
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  Tahun {g.Year} - {g.name}
                </option>
              ))}
            </select>

            <label className="label">Student ID</label>
            <input
              className="input mb-3"
              value={editModal.studentId}
              onChange={(e) =>
                setEditModal({ ...editModal, studentId: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                className="btn-outline"
                onClick={() => setEditModal({ ...editModal, open: false })}
              >
                Cancel
              </button>
              <button className="btn" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Attendance</h1>
          <Link href="/attendance/addStudent" className="btn-outline">
            Add Student
          </Link>
          
          <button 
            className="btn"
            onClick={markAllPresent}
            disabled={loading || rows.length === 0}
          >
            All Present
          </button>

          <select
            className="input max-w-[14rem]"
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
          >
            <option value="ALL">Semua Kelas</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                Tahun {g.Year} - {g.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input max-w-[12.5rem]"
            value={new Date(date).toISOString().slice(0, 10)}
            onChange={(e) => setDate(new Date(e.target.value))}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">BIL</th>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">NAMA</th>
                <th className="py-2 pr-4">TAHUN</th>
                <th className="py-2 pr-4">KELAS</th>
                <th className="py-2 pr-4">PRESENT</th>
                <th className="py-2 pr-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">{index + 1}</td>
                  <td className="py-2 pr-4">{r.studentId}</td>
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4">{r.gradeYear}</td>
                  <td className="py-2 pr-4">{r.gradeName}</td>
                  <td className="py-2 pr-4">
                    <select
                      className={`input px-2 py-1 rounded border ${
                        r.present
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                      value={r.present ? "Yes" : "No"}
                      onChange={(e) =>
                        updatePresentStatus(r, e.target.value === "Yes")
                      }
                    >
                      <option value="Yes">Present</option>
                      <option value="No">Absent</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      className="px-2 py-1 hover:bg-slate-200 rounded"
                      onClick={() => openEditModal(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 hover:bg-red-200 text-red-600 rounded ml-2"
                      onClick={() => deleteStudent(r)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-500">
                    No students found.
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
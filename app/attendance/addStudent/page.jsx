"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";

export default function AddStudentPage() {
  const pb = getPB();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    year: "",
    grade: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // -----------------------------
      // 1. CHECK IF GRADE EXISTS
      // -----------------------------
      let gradeRecord;
      try {
        gradeRecord = await pb
          .collection("grades")
          .getFirstListItem(`name = "${formData.grade}" && Year = ${formData.year}`);
      } catch {
        // -----------------------------
        // 2. CREATE GRADE IF DOESN'T EXIST
        // -----------------------------
        gradeRecord = await pb.collection("grades").create({
          name: formData.grade,
          Year: parseInt(formData.year),
        });
      }

      // -----------------------------
      // 3. COUNT EXISTING STUDENTS IN THIS GRADE
      // -----------------------------
      const existingStudents = await pb.collection("students").getFullList({
        filter: `grade = "${gradeRecord.id}"`,
      });

      const nextNum = existingStudents.length + 1; // Next student number

      // -----------------------------
      // 4. AUTO GENERATE STUDENT ID
      // Format => GRADE + 3-digit number
      // Example: DENIM001
      // -----------------------------
      const gradeName = formData.grade.toUpperCase().replace(/\s+/g, "");
      const studentId = `${gradeName}${String(nextNum).padStart(3, "0")}`;

      // -----------------------------
      // 5. SAVE STUDENT RECORD
      // -----------------------------
      await pb.collection("students").create({
        name: formData.name,
        grade: gradeRecord.id,
        studentId: studentId,
      });

      setSuccess(`✅ Student added successfully! Generated ID: ${studentId}`);

      setTimeout(() => {
        router.push("/attendance/view");
      }, 600);
    } catch (err) {
      setError(err.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected>
      <NavBar />
      <div className="max-w-2xl mx-auto p-4">
        <div className="card p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Add New Student</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manually add a student to the database
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NAME */}
            <div>
              <label className="label">Student Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            {/* TAHUN */}
            <div>
              <label className="label">Tahun *</label>
              <input
                type="text"
                className="input"
                value={formData.year}
                onChange={(e) => handleChange("year", e.target.value)}
                placeholder="e.g., 1, 2, 3, 4, 5, 6"
                required
              />
            </div>

            {/* GRADE */}
            <div>
              <label className="label">Kelas *</label>
              <input
                type="text"
                className="input"
                value={formData.grade}
                onChange={(e) => handleChange("grade", e.target.value)}
                placeholder="e.g., AMBER, DENIM, 5 Bestari"
                required
              />
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-outline flex-1"
              >
                Cancel
              </button>

              <button type="submit" className="btn flex-1" disabled={loading}>
                {loading ? "Adding..." : "Add Student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Protected>
  );
}
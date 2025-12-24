"use client";

import { useEffect, useRef, useState } from "react";
import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";
import getPB from "../../lib/pocketbase";
import { nextDayISO, startOfDayISO } from "../../utils/dates";

export default function AttendanceScanPage() {
  const pb = getPB();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualStudent, setManualStudent] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [camId, setCamId] = useState("");
  const html5qrcodeRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const cams = await Html5Qrcode.getCameras();
        if (!mounted) return;
        setCameras(cams || []);
        if (cams?.length && !camId) setCamId(cams[0].id);
        setReady(true);
      } catch (e) {
        setError(
          "Camera init failed. If on mobile, use HTTPS or localhost. " +
            (e?.message || e)
        );
      }
    };
    setup();
    return () => {
      mounted = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowNextRef = useRef(true);
  const onScanFailure = () => {
    // A frame without QR was detected; allow next processing
    allowNextRef.current = true;
  };

  const startScanner = async () => {
    try {
      setError("");
      setStatus("");
      allowNextRef.current = true;
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!html5qrcodeRef.current) {
        html5qrcodeRef.current = new Html5Qrcode("qr-reader");
      }
      const constraints = camId
        ? { deviceId: { exact: camId } }
        : { facingMode: "environment" };
      const config = { fps: 10, qrbox: 250 };
      await html5qrcodeRef.current.start(
        constraints,
        config,
        onScanSuccess,
        onScanFailure
      );
      setScanning(true);
    } catch (e) {
      setError("Unable to start camera: " + (e?.message || e));
    }
  };

  const stopScanner = async () => {
    try {
      if (html5qrcodeRef.current?.isScanning) {
        await html5qrcodeRef.current.stop();
      }
      await html5qrcodeRef.current?.clear();
    } catch (_) {
    } finally {
      setScanning(false);
    }
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      const { Html5Qrcode } = await import("html5-qrcode");
      const result = await Html5Qrcode.scanFile(file, true);
      await onScanSuccess(result);
    } catch (err) {
      setError("Failed to scan image: " + (err?.message || err));
    }
  };

  const markPresentByStudentId = async (studentId, fromScanner = false) => {
    // Only check allowNextRef for scanner operations
    if (fromScanner && !allowNextRef.current) return;
    if (fromScanner) allowNextRef.current = false;
    
    setError("");
    const id = String(studentId).trim();
    if (!id) return;
    try {
      setStatus(`Processing ID: ${id} ...`);
      const student = await pb
        .collection("students")
        .getFirstListItem(`studentId = "${id}"`, { expand: "grade" });
      const from = startOfDayISO();
      const to = nextDayISO();
      let existing;
      try {
        existing = await pb
          .collection("attendance")
          .getFirstListItem(
            `student = "${student.id}" && date >= "${from}" && date < "${to}"`
          );
      } catch (_) {}

      if (existing) {
        if (existing.present === true) {
          setStatus(`${student.name} is already marked present today.`);
          return;
        }
        await pb.collection("attendance").update(existing.id, {
          present: true,
        });
        setStatus(`Updated to present: ${student.name} (${student.studentId})`);
        setManualId("");
        setManualStudent(null);
        return;
      }

      await pb.collection("attendance").create({
        student: student.id,
        present: true,
        date: new Date().toISOString(),
      });
      setStatus(`Marked present: ${student.name} (${student.studentId})`);
      setManualId("");
      setManualStudent(null);
    } catch (e) {
      setError(e?.message || "Student not found / error");
    }
  };

  const onScanSuccess = async (decodedText) => {
    await markPresentByStudentId(decodedText, true);
  };

  const onManualSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");
    setManualStudent(null);
    const id = manualId.trim();
    if (!id) return;
    try {
      const s = await pb
        .collection("students")
        .getFirstListItem(`studentId = "${id}"`, { expand: "grade" });
      setManualStudent(s);
    } catch (e) {
      setError("Student not found for ID: " + id);
    }
  };

  return (
    <Protected>
      <NavBar />
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-4">Scan Attendance</h1>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                className="input max-w-xs"
                value={camId}
                onChange={(e) => setCamId(e.target.value)}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.id}
                  </option>
                ))}
              </select>
              {!scanning ? (
                <button className="btn" type="button" onClick={startScanner}>
                  Start Camera
                </button>
              ) : (
                <button className="btn-outline" type="button" onClick={stopScanner}>
                  Stop
                </button>
              )}
              <label className="btn-outline cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
                Scan Image
              </label>
            </div>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden min-h-[320px] bg-slate-100" />
            {!ready && (
              <div className="mt-2 text-sm text-slate-600">Loading camera devices...</div>
            )}
            <p className="mt-2 text-xs text-slate-600">Tip: Some browsers require HTTPS to access the camera (localhost is allowed).</p>
          </div>
          <div className="space-y-4">
            {status && (
              <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
                {status}
              </div>
            )}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            <div className="card p-4">
              <div className="font-medium mb-2">Manual Override</div>
              <form onSubmit={onManualSubmit} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Enter Student ID"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <button className="btn" type="submit">
                  Lookup
                </button>
              </form>
              {manualStudent && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    Found:{" "}
                    <span className="font-medium">{manualStudent.name}</span> (
                    <span className="tabular-nums">
                      {manualStudent.studentId}
                    </span>
                    )
                    {manualStudent.expand?.grade?.name && (
                      <span className="text-slate-600">
                        {" "}
                        — {manualStudent.expand.grade.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn"
                      onClick={() =>
                        markPresentByStudentId(manualStudent.studentId)
                      }
                      type="button"
                    >
                      Confirm Present
                    </button>
                    <button
                      className="btn-outline"
                      type="button"
                      onClick={() => {
                        setManualStudent(null);
                        setStatus("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-600">
                Tip: Enter the exact Student ID printed on the card.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
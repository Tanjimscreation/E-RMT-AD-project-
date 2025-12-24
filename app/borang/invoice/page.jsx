"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";
import { startOfDayISO, nextDayISO } from "../../../utils/dates";

export default function InvoicePage() {
  const pb = getPB();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [pricePerMeal, setPricePerMeal] = useState(5.00);

  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => startOfDayISO(today), [today]);
  const to = useMemo(() => nextDayISO(today), [today]);

  // Load students who received lunch today
  const loadStudents = async () => {
    setLoading(true);
    try {
      const canteenRecords = await pb.collection("canteen").getFullList({
        filter: `lunchReceived = true && date >= "${from}" && date < "${to}"`,
        expand: "student,student.grade",
      });

      const studentsData = canteenRecords
        .map((c) => {
          const student = c.expand?.student;
          if (!student) return null;
          return {
            id: student.id,
            studentId: student.studentId,
            name: student.name,
            gradeName: student.expand?.grade?.name || "-",
            gradeYear: student.expand?.grade?.Year || "-",
            quantity: 1,
            unitPrice: pricePerMeal,
            total: pricePerMeal,
          };
        })
        .filter(Boolean);

      setStudents(studentsData);
      
      // Generate invoice number
      try {
        const count = await pb.collection("invoices").getList(1, 1, { sort: "-created" });
        const nextNum = count.items.length > 0 ? parseInt(count.items[0].invoiceNumber.split('-')[1] || '0') + 1 : 1;
        setInvoiceNumber(`INV-${String(nextNum).padStart(4, '0')}`);
      } catch {
        // If invoices collection doesn't exist yet, start with INV-0001
        setInvoiceNumber('INV-0001');
      }
    } catch (err) {
      console.error("Failed to load students:", err);
      // Silently fail - no alerts, just log to console
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const subtotal = students.reduce((sum, s) => sum + s.total, 0);
  const totalStudents = students.length;

  // Save invoice
  const handleSaveInvoice = async () => {
    if (!invoiceNumber || students.length === 0) {
      alert("Please ensure you have an invoice number and students");
      return;
    }

    try {
      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate).toISOString(),
        clientName: "Sekolah Taman Putra Perdana",
        items: students.map(s => ({
          description: `${s.name} (${s.studentId}) - Tahun ${s.gradeYear} ${s.gradeName}`,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          total: s.total,
        })),
        total: subtotal,
        status: "pending",
        createdBy: pb.authStore.model?.id,
      };

      await pb.collection("invoices").create(invoiceData);
      alert("Invoice created successfully!");
      router.push("/borang/invoice/view");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("Failed to create invoice");
    }
  };

  // Send notification to finance
  const handleSendToFinance = async () => {
    if (!invoiceNumber || students.length === 0) {
      alert("Please create the invoice first by clicking 'Save Invoice'");
      return;
    }

    const confirmed = window.confirm(
      `Send invoice ${invoiceNumber} (RM ${subtotal.toFixed(2)}) to Finance Department?`
    );
    
    if (!confirmed) return;

    try {
      // Get the current logged-in user (could be any teacher)
      const currentUser = pb.authStore.model;
      
      // Get all teachers to send notification to
      const allTeachers = await pb.collection("teachers").getFullList();
      
      // Send notification to each teacher (or just the first one for demo)
      const recipient = allTeachers[0]; // Send to first teacher for now
      
      await pb.collection("notifications").create({
        type: "invoice",
        title: `New Invoice: ${invoiceNumber}`,
        message: `Meal order invoice for ${totalStudents} students. Total: RM ${subtotal.toFixed(2)}. Date: ${new Date(invoiceDate).toLocaleDateString("ms-MY")}`,
        invoiceNumber: invoiceNumber,
        amount: subtotal,
        studentCount: totalStudents,
        status: "unread",
        recipient: recipient.id,
        sender: currentUser?.id,
      });

      alert("✅ Notification sent to Finance Department successfully!");
      router.push("/notifications");
    } catch (err) {
      console.error("Failed to send notification:", err);
      alert("❌ Failed to send notification. Please check your database setup.");
    }
  };

  // Print invoice
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const itemRows = students
      .map((s, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${s.name} (${s.studentId}) - Tahun ${s.gradeYear} ${s.gradeName}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">RM ${s.unitPrice.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">RM ${s.total.toFixed(2)}</td>
      </tr>
    `)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>Sekolah Taman Putra Perdana</h2>
        </div>
        <div class="info">
          <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoiceDate).toLocaleDateString("ms-MY")}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>BIL</th>
              <th>DESCRIPTION</th>
              <th>QTY</th>
              <th>UNIT PRICE</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <h2 style="text-align: right; margin-top: 30px;">Total: RM ${subtotal.toFixed(2)}</h2>
        <p style="text-align: right;">Total Students: ${totalStudents}</p>
        <script>
          window.onload = () => { window.print(); window.onafterprint = () => window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Protected>
      <NavBar />
      <div className="card p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-4">Create Invoice - Meal Order</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Number</label>
              <input
                type="text"
                className="input w-full"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                className="input w-full"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Per Meal (RM)</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                value={pricePerMeal}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value) || 0;
                  setPricePerMeal(newPrice);
                  setStudents(prev => prev.map(s => ({
                    ...s,
                    unitPrice: newPrice,
                    total: s.quantity * newPrice
                  })));
                }}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Students who received lunch today:</strong> {totalStudents} students
            </p>
            <p className="text-sm text-blue-800">
              <strong>Total Amount:</strong> RM {subtotal.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-slate-100">
                <th className="py-2 px-4">BIL</th>
                <th className="py-2 px-4">STUDENT ID</th>
                <th className="py-2 px-4">NAME</th>
                <th className="py-2 px-4">CLASS</th>
                <th className="py-2 px-4 text-center">QTY</th>
                <th className="py-2 px-4 text-right">UNIT PRICE</th>
                <th className="py-2 px-4 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 px-4">{i + 1}</td>
                  <td className="py-2 px-4">{s.studentId}</td>
                  <td className="py-2 px-4">{s.name}</td>
                  <td className="py-2 px-4">Tahun {s.gradeYear} {s.gradeName}</td>
                  <td className="py-2 px-4 text-center">{s.quantity}</td>
                  <td className="py-2 px-4 text-right">RM {s.unitPrice.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">RM {s.total.toFixed(2)}</td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500">
                    No students received lunch today. Please check the canteen page first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.push("/canteen")} className="btn-outline">
            Back to Canteen
          </button>
          <button onClick={handlePrint} className="btn-outline">
            Print Preview
          </button>
          <button onClick={handleSaveInvoice} className="btn" disabled={students.length === 0}>
            Save Invoice
          </button>
          <button 
            onClick={handleSendToFinance} 
            className="btn bg-green-600 hover:bg-green-700 text-white" 
            disabled={students.length === 0}
          >
            Send for Verification
          </button>
        </div>
      </div>
    </Protected>
  );
}
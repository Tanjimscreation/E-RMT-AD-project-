"use client";

import { useState } from "react";
import Protected from "../../../components/Protected";
import NavBar from "../../../components/NavBar";
import getPB from "../../../lib/pocketbase";

export default function BorangC6Page() {
  const pb = getPB();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // Step 1 or 2
  
  const [formData, setFormData] = useState({
    orderNo: '',
    orderDate: new Date().toISOString().slice(0, 10),
    numberOfMeals: '',
    executionDate: '',
    executionDateReceived: '',
    orderedByName: '',
    orderedByPosition: '',
    approvedByName: '',
    approvedByPosition: '',
    receivedByName: '',
    receivedByPosition: '',
    receivedDate: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    
    try {
      await pb.collection("borang_c6").create({
        ...formData,
        createdBy: pb.authStore.model?.id,
      });
      
      setMessage("Borang C6 saved successfully!");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          orderNo: '',
          orderDate: new Date().toISOString().slice(0, 10),
          numberOfMeals: '',
          executionDate: '',
          executionDateReceived: '',
          orderedByName: '',
          orderedByPosition: '',
          approvedByName: '',
          approvedByPosition: '',
          receivedByName: '',
          receivedByPosition: '',
          receivedDate: ''
        });
        setMessage("");
        setStep(1);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to save form");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Open print view in new window/tab
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Borang C6 - ${formData.orderNo}</title>
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
          .header-left h2 {
            margin: 0 0 10px 0;
            font-size: 16px;
          }
          .header-left p {
            margin: 0;
            font-size: 12px;
          }
          .borang-box {
            border: 2px solid black;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 14px;
          }
          .no-section {
            text-align: right;
            margin-bottom: 20px;
          }
          .form-row {
            display: flex;
            align-items: baseline;
            margin-bottom: 10px;
          }
          .form-row label {
            min-width: 200px;
            font-weight: 600;
          }
          .form-row .value {
            border-bottom: 1px dotted black;
            flex: 1;
            min-height: 20px;
            padding: 0 5px;
          }
          .section-title {
            font-weight: bold;
            margin: 25px 0 15px 0;
            font-size: 14px;
          }
          .signature-section {
            margin: 20px 0;
            padding-left: 20px;
          }
          .signature-row {
            display: flex;
            margin-bottom: 10px;
          }
          .signature-row label {
            min-width: 100px;
            font-weight: 600;
          }
          .signature-row .value {
            border-bottom: 1px dotted black;
            flex: 1;
            padding: 0 5px;
            min-height: 20px;
          }
          .signature-note {
            margin-left: 20px;
            font-size: 12px;
            color: #666;
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
            <h1>PERJANJIAN RMT</h1>
          </div>
          <div class="borang-box">Borang C6</div>
        </div>

        <div class="text-center">
            <h2>BORANG PESANAN HARIAN</h2>
            <p>BEKALAN MAKANAN RANCANGAN MAKANAN TAMBAHAN SEKOLAH</p>
        </div>

        <div class="no-section">
          NO: <span style="border-bottom: 1px dotted black; display: inline-block; min-width: 100px; padding: 0 5px;">${formData.orderNo}</span>
        </div>


        <div class="form-row">
          <label>Tarikh pesanan dibuat</label>
          <span>:</span>
          <div class="value">${new Date(formData.orderDate).toLocaleDateString('ms-MY')}</div>
        </div>

        <div class="form-row">
          <label>Bil. murid yang makan</label>
          <span>:</span>
          <div class="value">${formData.numberOfMeals}</div>
        </div>

        <div class="form-row">
          <label>Hari pelaksanaan</label>
          <span>:</span>
          <div class="value" style="flex: 0.5;">${new Date(formData.executionDate).toLocaleDateString('ms-MY')}</div>
          <label style="margin-left: 40px; min-width: 150px;">Tarikh pelaksanaan</label>
          <span>:</span>
          <div class="value" style="flex: 0.4;">${new Date(formData.executionDateReceived).toLocaleDateString('ms-MY')}</div>
        </div>

        <div class="section-title">Pesanan dibuat oleh</div>
        <div class="signature-section">
          <div class="signature-row">
            <label>Nama</label>
            <span>:</span>
            <div class="value">${formData.orderedByName}</div>
          </div>
          <div class="signature-row">
            <label>Jawatan</label>
            <span>:</span>
            <div class="value">${formData.orderedByPosition}</div>
            <span class="signature-note">( T / tangan & Cop )</span>
          </div>
        </div>

        <div class="section-title">Disahkan oleh</div>
        <div class="signature-section">
          <div class="signature-row">
            <label>Nama</label>
            <span>:</span>
            <div class="value">${formData.approvedByName}</div>
          </div>
          <div class="signature-row">
            <label>Jawatan</label>
            <span>:</span>
            <div class="value">${formData.approvedByPosition}</div>
            <span class="signature-note">( T / tangan & Cop )</span>
          </div>
        </div>

        <div class="section-title">Borang pesanan diterima oleh pembekal makanan</div>
        <div class="signature-section">
          <div class="signature-row">
            <label>Nama</label>
            <span>:</span>
            <div class="value">${formData.receivedByName}</div>
          </div>
          <div class="signature-row">
            <label>Jawatan</label>
            <span>:</span>
            <div class="value">${formData.receivedByPosition}</div>
            <span class="signature-note">( T / tangan & Cop )</span>
          </div>
          <div class="signature-row">
            <label>Tarikh</label>
            <span>:</span>
            <div class="value">${new Date(formData.receivedDate).toLocaleDateString('ms-MY')}</div>
          </div>
        </div>

        <div class="footer-note">
          ( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )
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
    <Protected allowedRoles={["admin", "canteen"]}>
      <NavBar />
      <div className="card p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Borang C6 - Daily Meal Order</h1>
            <p className="text-sm text-slate-600 mt-1">Step {step} of 2</p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-outline print:hidden"
          >
            Print Form
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* STEP 1 - Order Details */}
        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-6">
            {/* Header Info */}
            <div className="rounded-lg bg-slate-50 p-4">
              <h2 className="font-semibold mb-3">PERJANJIAN RMT</h2>
              <p className="text-sm text-slate-600">BORANG PESANAN HARIAN</p>
              <p className="text-sm text-slate-600">BEKALAN MAKANAN RANCANGAN MAKANAN TAMBAHAN SEKOLAH</p>
            </div>

            {/* Order Number */}
            <div>
              <label className="label">Order No.</label>
              <input
                type="text"
                className="input"
                value={formData.orderNo}
                onChange={(e) => handleChange('orderNo', e.target.value)}
                required
              />
            </div>

            {/* Order Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Tarikh Pesanan Dibuat</label>
                <input
                  type="date"
                  className="input"
                  value={formData.orderDate}
                  onChange={(e) => handleChange('orderDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Bil. Murid yang Makan</label>
                <input
                  type="number"
                  className="input"
                  value={formData.numberOfMeals}
                  onChange={(e) => handleChange('numberOfMeals', e.target.value)}
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="label">Hari Pelaksanaan</label>
                <input
                  type="date"
                  className="input"
                  value={formData.executionDate}
                  onChange={(e) => handleChange('executionDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Tarikh Pelaksanaan</label>
                <input
                  type="date"
                  className="input"
                  value={formData.executionDateReceived}
                  onChange={(e) => handleChange('executionDateReceived', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Pesanan dibuat oleh */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Pesanan dibuat oleh</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.orderedByName}
                    onChange={(e) => handleChange('orderedByName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Jawatan (T / tangan & Cop)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.orderedByPosition}
                    onChange={(e) => handleChange('orderedByPosition', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button type="submit" className="btn w-full">
              Next →
            </button>
          </form>
        )}

        {/* STEP 2 - Approval & Receipt */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Disahkan oleh */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Disahkan oleh</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.approvedByName}
                    onChange={(e) => handleChange('approvedByName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Jawatan (T / tangan & Cop)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.approvedByPosition}
                    onChange={(e) => handleChange('approvedByPosition', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Borang pesanan diterima oleh pembekal makanan */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Borang pesanan diterima oleh pembekal makanan</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.receivedByName}
                    onChange={(e) => handleChange('receivedByName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Jawatan (T / tangan & Cop)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.receivedByPosition}
                    onChange={(e) => handleChange('receivedByPosition', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Tarikh</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.receivedDate}
                    onChange={(e) => handleChange('receivedDate', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-sm italic text-slate-600 bg-slate-50 p-3 rounded">
              ( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={handleBack} 
                className="btn-outline flex-1"
              >
                ← Back
              </button>
              <button 
                type="submit" 
                className="btn flex-1" 
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Borang C6"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Protected>
  );
}
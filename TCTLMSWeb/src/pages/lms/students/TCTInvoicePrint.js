import React, { useState, useEffect } from "react";
import { viewStudentInvoice } from "../../../apiservices/ScheduleService";
import { useLocation } from "react-router-dom";
import LogoDark from "../../../images/TCTLoginPageLogo.png";
import moment from "moment";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";

// ─────────────────────────────────────────────────────────────────────────────
//  TCTInvoicePrint
//  1. Generates clean PDF (no browser headers/footers)
//  2. Downloads the PDF without resending an already-issued invoice
//  3. Closes window after done
//  npm install jspdf html2canvas qrcode
// ─────────────────────────────────────────────────────────────────────────────

const TCTInvoicePrint = () => {
  const location    = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invNumber   = queryParams.get("invNumber");

  const [status,  setStatus]  = useState("Loading invoice...");
  const [step,    setStep]    = useState(1);  // 1=loading 2=done 3=error
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!invNumber) return;
    generateAndEmail();
  }, [invNumber]);

  const generateAndEmail = async () => {
    try {
      // ── Step 1: Fetch invoice ──────────────────────────────────────────────
      setStatus("Fetching invoice data...");
      const response    = await viewStudentInvoice(invNumber);
      const invoiceResult = response.data;
      const invoiceList = Array.isArray(invoiceResult?.data)
        ? invoiceResult.data
        : Array.isArray(invoiceResult) ? invoiceResult : [];

      if (!invoiceList.length) {
        setError(invoiceResult?.message || "No invoice data found.");
        setStep(3);
        return;
      }

      const first      = invoiceList[0];
      const paymentUrl = first.paymentUrl || first.PaymentUrl || null;

      // Amount actually due now: prepaid subjects contribute only their uncovered shortfall
      // (₹0 while the paid balance still covers the month); non-prepaid contribute their full value.
      // A prepaid monthly statement is informational (the full fee was invoiced upfront).
      // Its "due" is the overrun shortfall (stmtPendingAmount), not a fresh charge.
      const isStatement = ((first.invoiceType || first.InvoiceType) || "") === "Statement";
      const isSavedPackageInvoice = ["Upfront", "Reconciliation", "TopUp"].includes(first.invoiceType || first.InvoiceType);
      const isSingle = invoiceList.length === 1;
      const amountDueNow = invoiceList.reduce((sum, it) => {
        if (isStatement) return sum + Number(it.stmtPendingAmount || 0);
        if (it.isPrepaid && !isSavedPackageInvoice) return sum + Number(it.planAmountDueThisMonth || 0);
        const v = (it.subjectAmount != null) ? it.subjectAmount : (isSingle ? it.totalInvoiceAmount : 0);
        return sum + Number(v || 0);
      }, 0);
      const anyPrepaid = invoiceList.some((it) => it.isPrepaid);
      const allCovered = anyPrepaid && !isSavedPackageInvoice && amountDueNow <= 0;

      // Never download a partial regular invoice if the API omitted a saved line.
      if (!isStatement && (!anyPrepaid || isSavedPackageInvoice) && invoiceList.every((it) => it.subjectAmount != null) &&
          Math.abs(amountDueNow - Number(first.totalInvoiceAmount || 0)) > 0.01) {
        setError("Invoice lines do not match the stored invoice total. Please contact support.");
        setStep(3);
        return;
      }

      const totalAmount = Number(amountDueNow).toLocaleString('en-IN', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });

      // ── Step 2: Generate QR ───────────────────────────────────────────────
      let qrDataUrl = null;
      if (paymentUrl) {
        setStatus("Generating QR code...");
        qrDataUrl = await QRCode.toDataURL(paymentUrl, {
          width: 120, margin: 1,
          color: { dark: "#1a1a2e", light: "#ffffff" },
          errorCorrectionLevel: "H"
        });
      }

      // ── Step 3: Build HTML ────────────────────────────────────────────────
      setStatus("Building invoice layout...");

      const inr = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const isSingleSubject = invoiceList.length === 1;
      const previousPeriod = moment({ year: Number(first.year), month: Number(first.month) - 1, day: 1 })
        .subtract(1, 'month').format('MMMM YYYY');

      const tableRows = invoiceList.map((item, index) => {
        // Per-subject billed value (this month). Falls back to the invoice total only for
        // single-subject legacy invoices where subjectAmount wasn't captured.
        const subjectValue = (item.subjectAmount != null)
          ? item.subjectAmount
          : (isSingleSubject ? item.totalInvoiceAmount : 0);
        // What actually goes in the Amount column = what's owed now. Prepaid-covered months
        // owe ₹0; the value is still shown in the description and the plan summary.
        const rowAmount = item.isPrepaid && !isSavedPackageInvoice ? Number(item.planAmountDueThisMonth || 0) : subjectValue;
        const statusBadge = !item.isPrepaid || isSavedPackageInvoice ? "" : (item.planMonthCovered
          ? `<span style="background:#c6f6d5;color:#22543d;font-weight:700;font-size:9px;padding:2px 7px;border-radius:9px;margin-left:6px;">PAID</span>`
          : `<span style="background:#feebc8;color:#7b341e;font-weight:700;font-size:9px;padding:2px 7px;border-radius:9px;margin-left:6px;">DUE</span>`);
        const coveredNote = (item.isPrepaid && !isSavedPackageInvoice && item.planMonthCovered)
          ? `<div style="margin-top:4px;color:#22543d;font-weight:600;">Covered by prepaid plan (value ₹${inr(subjectValue)})</div>`
          : "";
        return `
        <tr>
          <td style="padding:12px 10px;vertical-align:top;border-bottom:1px solid #eee;">
            <div style="font-size:10px;color:#999;">${index + 1}.</div>
            <div style="font-weight:700;color:#333;">${(item.subject || "Subject").toUpperCase()} FEES DETAILS ${statusBadge}</div>
            <div style="color:#666;font-size:10px;margin-top:3px;">
              Date: ${item.startDate ? moment(item.startDate).format("DD-MMM-YYYY") : "N/A"}<br/>
              Tutor: ${item.tutorName || "N/A"}<br/>
              No. of Classes: ${item.numberOfClasses || "N/A"}
              <div style="margin-top:4px;border-top:1px dashed #ddd;padding-top:4px;">
                ${previousPeriod} billed classes: ${Number(item.previousMonthTotalClasses || 0)}<br/>
                ${previousPeriod} completed classes: ${Math.max(0, Number(item.previousMonthTotalClasses || 0) - Number(item.previousMonthPendingClasses || 0))}<br/>
                ${first.monthName || "Current month"} scheduled classes: ${Number(item.numberOfClasses || 0)}<br/>
                Previous-month adjustment: ${Number(item.previousMonthPendingClasses || 0) === 0 ? `-₹${inr(0)}` : "included in saved invoice amount"}
              </div>
              ${coveredNote}
            </div>
          </td>
          <td style="padding:12px 10px;text-align:center;vertical-align:top;border-bottom:1px solid #eee;">${item.numberOfClasses || 1}</td>
          <td style="padding:12px 10px;text-align:right;vertical-align:top;border-bottom:1px solid #eee;">₹${inr(item.parentPayment)}</td>
          <td style="padding:12px 10px;text-align:right;vertical-align:top;border-bottom:1px solid #eee;"><strong>₹${inr(rowAmount)}</strong></td>
        </tr>
      `;
      }).join('');

      // ── Prepaid plan summary (Scenario 1) ──────────────────────────────────
      // Rendered only when at least one subject on the invoice is on a prepaid plan.
      const prepaidSubjects = invoiceList.filter((x) => x.isPrepaid);
      const planSummaryBlock = prepaidSubjects.length === 0 ? "" : `
        <div style="margin-bottom:20px;">
          <div style="color:#7CB342;font-weight:700;font-size:12px;margin-bottom:8px;">Prepaid Plan Summary</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e9ecef;font-size:10px;">
            <thead>
              <tr style="background:#f1f8e9;color:#33691e;">
                <th style="padding:8px 10px;text-align:left;">Subject</th>
                <th style="padding:8px 10px;text-align:center;">Total Classes</th>
                <th style="padding:8px 10px;text-align:center;">Scheduled So Far</th>
                <th style="padding:8px 10px;text-align:center;">Remaining Classes</th>
                <th style="padding:8px 10px;text-align:right;">Total Fee</th>
                <th style="padding:8px 10px;text-align:right;">Amount Paid</th>
                <th style="padding:8px 10px;text-align:right;">Remaining</th>
                <th style="padding:8px 10px;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${prepaidSubjects.map((s) => {
                const total = s.planTotalClasses || 0;
                const soFar = s.planClassesScheduledSoFar || 0;
                const remClasses = Math.max(0, total - soFar);
                const fee = Number(s.planTotalFee || 0);
                const paid = Number(s.planAmountPaid || 0);
                const remAmount = Math.max(0, fee - paid);
                const status = remAmount <= 0
                  ? `<span style="color:#22543d;font-weight:700;">FULLY PAID</span>`
                  : `<span style="color:#b7791f;font-weight:700;">PART PAID</span>`;
                return `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:7px 10px;font-weight:600;">${(s.subject || "N/A").toUpperCase()}</td>
                    <td style="padding:7px 10px;text-align:center;">${total}</td>
                    <td style="padding:7px 10px;text-align:center;">${soFar}</td>
                    <td style="padding:7px 10px;text-align:center;">${remClasses}</td>
                    <td style="padding:7px 10px;text-align:right;">₹${inr(fee)}</td>
                    <td style="padding:7px 10px;text-align:right;color:#22543d;">₹${inr(paid)}</td>
                    <td style="padding:7px 10px;text-align:right;color:#b7791f;">₹${inr(remAmount)}</td>
                    <td style="padding:7px 10px;text-align:center;">${status}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div style="font-size:9px;color:#888;margin-top:5px;font-style:italic;">
            This student is on a prepaid plan — this month's classes are already covered by the plan payment.
          </div>
        </div>`;

      // ── Prepaid monthly statement (Phase 3) ────────────────────────────────
      // Shown instead of the charge table for InvoiceType == "Statement".
      const statementBlock = !isStatement ? "" : `
        <div style="margin-bottom:20px;">
          <div style="color:#2b6cb0;font-weight:700;font-size:12px;margin-bottom:8px;">Monthly Consumption Statement — ${first.monthName || ""} ${first.year || ""}</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e9ecef;font-size:10px;">
            <thead>
              <tr style="background:#ebf8ff;color:#2c5282;">
                <th style="padding:8px 10px;text-align:left;">Subject</th>
                <th style="padding:8px 10px;text-align:center;">This Month Scheduled</th>
                <th style="padding:8px 10px;text-align:center;">Prev. Month Cancelled</th>
                <th style="padding:8px 10px;text-align:center;">Total Completed</th>
                <th style="padding:8px 10px;text-align:center;">Total Pending</th>
                <th style="padding:8px 10px;text-align:right;">Amount Paid</th>
                <th style="padding:8px 10px;text-align:right;">Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceList.map((s) => {
                const pend = Number(s.stmtPendingAmount || 0);
                const pendColor = pend > 0 ? "#c53030" : "#22543d";
                return `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:7px 10px;font-weight:600;">${(s.subject || "N/A").toUpperCase()}</td>
                    <td style="padding:7px 10px;text-align:center;">${s.stmtThisMonthScheduled ?? 0}</td>
                    <td style="padding:7px 10px;text-align:center;">${s.stmtPrevMonthCancelled ?? 0}</td>
                    <td style="padding:7px 10px;text-align:center;">${s.stmtTotalCompleted ?? 0}</td>
                    <td style="padding:7px 10px;text-align:center;">${s.stmtTotalPending ?? 0}</td>
                    <td style="padding:7px 10px;text-align:right;color:#22543d;">₹${inr(s.stmtAmountPaid)}</td>
                    <td style="padding:7px 10px;text-align:right;color:${pendColor};font-weight:700;">₹${inr(pend)}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div style="font-size:9px;color:#888;margin-top:5px;font-style:italic;">
            Informational statement — the full plan fee was invoiced upfront. A "Pending Amount" greater than ₹0 means the prepaid credit has been exhausted and a top-up may be required.
          </div>
        </div>`;

      const container = document.createElement('div');
      container.style.cssText = `
        position:fixed;top:-10000px;left:-10000px;
        width:794px;background:#fff;
        font-family:'Segoe UI',sans-serif;font-size:11px;color:#333;padding:20px;
      `;
      container.innerHTML = `
        <div style="width:100%;max-width:754px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;">
            <div style="display:flex;align-items:center;gap:15px;">
              <img src="${LogoDark}" style="width:65px;height:65px;object-fit:contain;" crossorigin="anonymous"/>
              <div>
                <h1 style="color:#7CB342;font-size:28px;font-weight:300;margin:0;letter-spacing:1px;">${isStatement ? "STATEMENT" : "INVOICE"}</h1>
                <p style="color:#7CB342;font-size:12px;margin:0;font-weight:600;">THE CHENNAI TUITION</p>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:4px;width:240px;">
                <span style="color:#777;text-transform:uppercase;font-size:9px;">Invoice #</span>
                <span style="font-weight:700;color:#222;font-size:10px;">${invNumber}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:4px;width:240px;">
                <span style="color:#777;text-transform:uppercase;font-size:9px;">Period</span>
                <span style="font-weight:700;color:#222;font-size:10px;">${first.monthName || ""} ${first.year || ""}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:20px;width:240px;">
                <span style="color:#777;text-transform:uppercase;font-size:9px;">Due Date</span>
                <span style="font-weight:700;color:#222;font-size:10px;">${moment().add(5, 'days').format("DD-MMM-YYYY")}</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:16px;margin-bottom:24px;">
            <div style="flex:1;background:#f9f9f9;padding:14px;border-radius:6px;border:1px solid #eee;">
              <div style="color:#7CB342;font-weight:700;margin-bottom:7px;font-size:11px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;">Billed By</div>
              <div style="line-height:1.6;font-size:10px;">
                <strong>THE CHENNAI TUITION</strong><br/>
                Plot No. 14 Door No. 9/147, Madha Nagar Main Road,<br/>
                Moulivakkam, Chennai, Tamil Nadu - 600125<br/>
                <strong>GSTIN:</strong> 33FDDPM2936J1ZG | <strong>PAN:</strong> FDDPM2936J<br/>
                <strong>Email:</strong> accounts@thechennaituition.com<br/>
                <strong>Phone:</strong> +91 90421 71782
              </div>
            </div>
            <div style="flex:1;background:#f9f9f9;padding:14px;border-radius:6px;border:1px solid #eee;">
              <div style="color:#7CB342;font-weight:700;margin-bottom:7px;font-size:11px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;">Billed To</div>
              <div style="line-height:1.6;font-size:10px;">
                <strong>${first.studentName || "N/A"}</strong><br/>
                Grade: ${first.grade || "N/A"} | Board: ${first.board || "N/A"}<br/>
                Parent: ${first.parentName || "N/A"}<br/>
                <em>Student Invoice Reference</em>
              </div>
            </div>
          </div>

          ${isStatement ? statementBlock : `
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr>
                <th style="background:#84bd41;color:white;padding:11px 10px;font-weight:600;text-align:left;border-radius:4px 0 0 0;">Item Description</th>
                <th style="background:#84bd41;color:white;padding:11px 10px;font-weight:600;text-align:center;width:10%;">Qty</th>
                <th style="background:#84bd41;color:white;padding:11px 10px;font-weight:600;text-align:right;width:20%;">Rate</th>
                <th style="background:#84bd41;color:white;padding:11px 10px;font-weight:600;text-align:right;width:20%;border-radius:0 4px 0 0;">Amount</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          ${planSummaryBlock}`}

          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:10px;">
            <div style="flex:1;background:#f9f9f9;padding:14px;border-radius:6px;max-width:55%;">
              <div style="color:#7CB342;font-weight:700;margin-bottom:7px;font-size:11px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;">Payment Details</div>
              <div style="line-height:1.6;font-size:10px;">
                <strong>Account Name:</strong> Cambridge Enterprises<br/>
                <strong>Account Number:</strong> 50200103194651<br/>
                <strong>IFSC Code:</strong> HDFC0000206<br/>
                <strong>Bank:</strong> HDFC - MS | <strong>Type:</strong> Current
              </div>
              <div style="margin-top:16px;border-top:1px solid #eee;padding-top:14px;">
                <div style="font-weight:700;color:#7CB342;font-size:11px;">Terms &amp; Conditions</div>
                <ol style="font-size:9.5px;color:#777;padding-left:18px;margin-top:8px;">
                  <li style="margin-bottom:4px;">Please pay within Due Date to avoid overdue interest @ 18%.</li>
                  <li style="margin-bottom:4px;">Mention the invoice number and student name in payment remarks.</li>
                  <li style="margin-bottom:4px;">For International Transactions, please use SWIFT Payment.</li>
                  <li style="margin-bottom:4px;">Classes must be cancelled at least 4 hours in advance to avoid billing.</li>
                </ol>
              </div>
            </div>
            <div style="flex:0 0 200px;text-align:center;">
              <div style="background:${isStatement && amountDueNow > 0 ? '#c53030' : '#7CB342'};color:white;padding:14px;border-radius:4px;font-size:17px;font-weight:700;margin-bottom:${allCovered ? '6px' : '16px'};">
                ${isStatement ? (amountDueNow > 0 ? "Top-up Due" : "Balance") : "Total Due"}: ₹${totalAmount}
              </div>
              ${allCovered ? `<div style="color:#22543d;font-weight:700;font-size:11px;margin-bottom:16px;">${isStatement ? "Within prepaid credit" : "Fully covered by prepaid plan"}</div>` : ""}
              <div style="width:85px;height:85px;border:2px solid #7CB342;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;color:#7CB342;font-size:9px;font-weight:800;text-align:center;line-height:1.2;transform:rotate(-5deg);">
                TCT<br/>CHENNAI<br/>TUITION
              </div>
              <div style="font-size:11px;font-weight:700;color:#444;margin-top:8px;">Authorised Signatory</div>
            </div>
          </div>

          ${(qrDataUrl && !allCovered) ? `
            <div style="display:flex;justify-content:center;margin-top:24px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 20px;background:#f9f9f9;border:1px solid #eee;border-radius:8px;">
                <div style="font-size:11px;font-weight:700;color:#7CB342;letter-spacing:0.06em;text-transform:uppercase;">Scan to Pay via Stripe</div>
                <div style="border:2px solid #7CB342;border-radius:6px;padding:5px;background:#fff;display:inline-block;">
                  <img src="${qrDataUrl}" style="width:100px;height:100px;display:block;"/>
                </div>
                <div style="font-size:9px;color:#aaa;font-style:italic;">Powered by Stripe &nbsp;·&nbsp; Scan with any UPI or banking app</div>
              </div>
            </div>
          ` : ""}

          <div style="text-align:center;margin-top:20px;color:#888;font-style:italic;font-size:12px;">
            Happy to work with you!
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // ── Step 4: Render to PDF ─────────────────────────────────────────────
      setStatus("Generating PDF...");
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      document.body.removeChild(container);

      const imgData   = canvas.toDataURL("image/jpeg", 0.98);
      const pdf       = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Multi-page support
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        let position = 0;
        while (remainingHeight > 0) {
          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
          remainingHeight -= pdfHeight;
          position        -= pdfHeight;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      // ── Step 5: Download PDF ──────────────────────────────────────────────
      setStatus("Downloading PDF...");
      const fileName = `TCT-Invoice-${invNumber}.pdf`;
      pdf.save(fileName);

      setStatus("PDF downloaded successfully!");

      setStep(2); // done

      // ── Step 6: Auto-close window after 3 seconds ─────────────────────────
      setTimeout(() => {
        window.close();
      }, 3000);

    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Could not generate the PDF. Please try again.");
      setStep(3);
    }
  };

  if (!invNumber) return <div className="p-10 text-center">No Invoice Number Found.</div>;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', flexDirection: 'column', backgroundColor: '#f4f7f6', gap: '12px'
    }}>
      <img src={LogoDark} style={{ width: '140px', marginBottom: '8px' }} alt="Logo" />

      {/* Loading */}
      {step === 1 && (
        <>
          <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }} role="status"/>
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#7CB342', margin: 0 }}>{status}</p>
          <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>Please wait...</p>
        </>
      )}

      {/* Done */}
      {step === 2 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px',
          padding: '28px 36px', textAlign: 'center', maxWidth: '400px'
        }}>
          {/* Green tick */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#7CB342', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '28px', color: '#fff'
          }}>✓</div>
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#2d2d2d', margin: 0 }}>
            Invoice Ready!
          </p>
          <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>{status}</p>
          <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
            This window will close automatically...
          </p>
        </div>
      )}

      {/* Error */}
      {step === 3 && (
        <div style={{
          background: '#fff5f5', border: '1px solid #fca5a5',
          borderRadius: '12px', padding: '24px 32px', textAlign: 'center', maxWidth: '400px'
        }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', margin: '0 0 8px' }}>
            Something went wrong
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{error}</p>
          <button
            onClick={generateAndEmail}
            style={{
              marginTop: '16px', padding: '8px 20px',
              background: '#7CB342', color: '#fff', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default TCTInvoicePrint;

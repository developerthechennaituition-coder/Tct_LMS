import React, { useState, useEffect } from "react";
import { gettutorinvoicebyid } from "../../../apiservices/ScheduleService";
import { useLocation } from "react-router-dom";
import LogoDark from "../../../images/TCTLoginPageLogo.png";

const TCTInvoicePrint = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invNumber = queryParams.get("invNumber");

  useEffect(() => {
    if (!invNumber) {
      console.error("No invoice number provided");
      return;
    }

    const printInvoice = async () => {
      try {
        const response = await gettutorinvoicebyid(invNumber);

        if (response.data && response.data.length > 0) {
          // Create an invisible iframe
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.width = '1px';
          iframe.style.height = '1px';
          iframe.style.opacity = '0.01';
          document.body.appendChild(iframe);

          // Write content to iframe
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(`
            <html>
    <head>
      <style>
        /* A4 Print Optimization */
        @page {
          size: A4;
          margin: 12mm;
          /* Hide browser headers and footers */
          @top-left { content: ""; }
          @top-center { content: ""; }
          @top-right { content: ""; }
          @bottom-left { content: ""; }
          @bottom-center { content: ""; }
          @bottom-right { content: ""; }
        }
        
        @media print {
          body { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Additional header/footer removal */
          @page :first {
            margin-top: 0;
            margin-bottom: 0;
          }
          
          /* Hide any browser-generated content */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0; 
          padding: 15px;
          font-size: 11px;
          line-height: 1.4;
          color: #333;
          background: #fff;
        }
        
        .invoice-container { 
          width: 100%; 
          max-width: 210mm; 
          margin: 0 auto; 
          background: white;
          position: relative;
        }
        
        /* Header Section */
        .header-section {
          display: flex;
          align-items: flex-start;
          margin-top: 35px;
          margin-bottom: 25px;
          padding-top: 15px;
          padding-bottom: 15px;
        }
        
        .logo-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo-section img {
          width: 80px;
          height: 80px;
          object-fit: contain;
        }
        
        .company-info h1 {
          color: #7CB342;
          font-size: 28px;
          font-weight: 300;
          letter-spacing: 2px;
          margin: 0 0 5px 0;
        }
        
        .company-info p {
          color: #7CB342;
          font-size: 12px;
          margin: 0;
          letter-spacing: 1px;
        }
        
        .invoice-details {
          flex: 1;
          text-align: right;
          font-size: 11px;
        }
        
        .invoice-details .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          min-width: 280px;
        }
        
        .invoice-details .label {
          color: #666;
          font-weight: normal;
        }
        
        .invoice-details .value {
          color: #333;
          font-weight: 600;
        }
        
        /* Billing Section */
        .billing-section {
          display: flex;
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .billing-box {
          flex: 1;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
        
        .billing-title {
          color: #7CB342;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 10px;
        }
        
        .billing-content {
          color: #333;
          line-height: 1.5;
          font-size: 10px;
        }
        
        .billing-content strong {
          color: #333;
          font-weight: 600;
        }
        
        /* Items Table */
        .items-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
        
        .items-table thead {
          background: #7CB342;
          color: white;
        }
        
        .items-table th {
  padding: 12px 10px;
  font-weight: 600;
  font-size: 11px;
  background-color: #84bd41;
  color: white;
  border: none;
}
        

        .items-table th:first-child {
  width: 45%;
  text-align: left;
  border-top-left-radius: 4px;
}

.items-table th:nth-child(2) {
  width: 15%;
  text-align: center;
}

.items-table th:nth-child(3) {
  width: 20%;
  text-align: right;
}

.items-table th:nth-child(4) {
  width: 20%;
  text-align: right;
  border-top-right-radius: 4px;
}
        
        .items-table th:last-child {
  border-top-right-radius: 4px;
}

        .items-table tbody tr {
          border-bottom: 1px solid #e9ecef;
        }
        
        .items-table tbody tr:hover {
          background: #f8f9fa;
        }
        
        .items-table td {
          padding: 12px 10px;
          vertical-align: top;
          font-size: 10px;
        }
        
        .item-number {
          color: #666;
          font-weight: 600;
        }
        
        .item-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }
        
        .item-details {
          color: #666;
          line-height: 1.4;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        /* Total Section */
        .total-section {
          margin: 10px 0;
          text-align: left;
        }
        
        .total-words {
  background: #f8f9fa;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 10px;
  color: #666;
  border: 1px solid #ccc;        /* Adds a light border */
  text-align: center;            /* Centers the text */
}

        
        .total-amount-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .total-left {
          flex: 1;
        }
        
        .total-amount {
          background: #7CB342;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          text-align: center;
          min-width: 200px;
        }
        
        .total-label {
          font-size: 12px;
          margin-bottom: 5px;
        }
        
        .total-value {
          font-size: 18px;
          font-weight: 600;
        }
        
        /* Bank Details */
        .bank-section {
          display: flex;
          gap: 20px;
          margin: 25px 0;
        }
        
        .bank-details {
          flex: 1;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
        
        .bank-title {
          color: #7CB342;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 10px;
        }
        
        .bank-info {
          font-size: 10px;
          line-height: 1.6;
        }
        
        .bank-info .bank-row {
          display: flex;
          margin-bottom: 4px;
        }
        
        .bank-label {
          font-weight: 600;
          color: #333;
          min-width: 110px;
        }
        
        .bank-value {
          color: #666;
        }
        
        .signature-section {
          flex: 0 0 150px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .signature-stamp {
          width: 80px;
          height: 80px;
          border: 2px solid #7CB342;
          border-radius: 50%;
          margin: 10px auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7CB342;
          font-size: 8px;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
        }
        
        .signature-text {
          font-size: 10px;
          color: #666;
          font-weight: 600;
        }
        
        /* Terms Section */
        .terms-section {
          margin: 25px 0;
        }
        
        .terms-title {
          color: #7CB342;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 10px;
        }
        
        .terms-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .terms-list li {
          margin-bottom: 6px;
          font-size: 10px;
          line-height: 1.4;
          color: #666;
          padding-left: 20px;
          position: relative;
        }
        
        .terms-list li:before {
          content: counter(term-counter) ".";
          counter-increment: term-counter;
          position: absolute;
          left: 0;
          font-weight: 600;
          color: #333;
        }
        
        .terms-list {
          counter-reset: term-counter;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #e9ecef;
        }
        
        .footer-note {
  margin-top: 5px;
  font-style: italic;
  font-size: 13px;
}
        
        .additional-notes-title {
          color: #7CB342;
          font-weight: 600;
          font-size: 12px;
          margin: 20px 0 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header Section -->
        <div class="header-section">
          <div class="logo-section">
            <img src="${LogoDark}" alt="TCT Logo" />
            <div class="company-info">
              <h1>INVOICE</h1>
              <p>THE CHENNAI TUITION</p>
            </div>
          </div>
          <div class="invoice-details">
            <div class="detail-row">
              <span class="label">INVOICE #</span>
              <span class="value">${invNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">START DATE</span>
              <span class="value">Mar 03, 2025</span>
            </div>
            <div class="detail-row">
              <span class="label">DUE DATE</span>
              <span class="value">Mar 07, 2025</span>
            </div>
            <div class="detail-row">
              <span class="label">Department</span>
              <span class="value">TCT - ACCOUNTS</span>
            </div>
          </div>
        </div>

        <!-- Billing Section -->
        <div class="billing-section">
          <div class="billing-box">
            <div class="billing-title">Billed By</div>
            <div class="billing-content">
              <strong>THE CHENNAI TUITION</strong><br/>
              Plot No. 14 Door No. 9/147, Madha Nagar Main Road,<br/>
              Moulivakkam, Chennai,<br/>
              Chennai,<br/>
              Tamil Nadu, India - 600125<br/>
              <strong>GSTIN:</strong> 33FDDPM2936J1ZG<br/>
              <strong>PAN:</strong> FDDPM2936J<br/>
              <strong>Email:</strong> accounts@thechennaituition.com<br/>
              <strong>Phone:</strong> +91 90421 71782
            </div>
          </div>
          <div class="billing-box">
            <div class="billing-title">Billed To</div>
            <div class="billing-content">
              <strong>Ameen Saddath</strong><br/>
              Saudi Arabia
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="item-number">1.</div>
                <div class="item-title">MARCH MONTH FEES DETAILS</div>
                <div class="item-details">
                  FEBRUARY Month billed classes= 35classes<br/>
                  FEBRUARY month classes completed= 24 classes<br/>
                  MARCH Month as per schedule= 26 classes<br/>
                  Difference Billing Amount in MARCH = 15 classes
                </div>
              </td>
              <td class="text-center">15</td>
              <td class="text-right">₹810.00</td>
              <td class="text-right"><strong>₹12,150.00</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Total Section -->
        <div class="total-section">
          <div class="total-words">
            <strong>Total (in words) : TWELVE THOUSAND ONE HUNDRED FIFTY RUPEES ONLY</strong>
          </div>          
        </div>

        <!-- Bank Details & Signature -->
        <div class="bank-section">
          <div class="bank-details">
            <div class="bank-title">Bank Details</div>
            <div class="bank-info">
              <div class="bank-row">
                <span class="bank-label">Account Name</span>
                <span class="bank-value">Cambridge Enterprises</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">Account Number</span>
                <span class="bank-value">50200103194651</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">IFSC</span>
                <span class="bank-value">HDFC0000206</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">Account Type</span>
                <span class="bank-value">Current</span>
              </div>
              <div class="bank-row">
                <span class="bank-label">Bank</span>
                <span class="bank-value">HDFC - MS</span>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="total-amount-box">
              <div class="total-left"></div>
              <div class="total-amount">
                <div class="total-value">Total (INR) ₹12,150.00</div>
              </div>
            </div>
            <div class="signature-stamp">
              TCT<br/>
              CHENNAI<br/>
              TUITION
            </div>
            <div class="signature-text">Authorised Signatory</div>
          </div>
        </div>

        <!-- Terms and Conditions -->
        <div class="terms-section">
          <div class="terms-title">Terms and Conditions</div>
          <ol class="terms-list">
            <li>Please pay within Due Date from the date of invoice, overdue interest @ 18% will be charged on delayed payments</li>
            <li>While making a payment, mention the invoice number and the student's name in the remark section</li>
            <li>For International Transaction use SWIFT Payment</li>
            <li>Please ensure to cancel your class at least 4 hours before it begins to avoid a fee</li>
            <li>For any concerns about the classes or to request a tutor change, please reach out to us</li>
          </ol>
        </div>

        <!-- Additional Notes -->
        <div class="additional-notes-title">Additional Notes</div>
        <div class="footer-note">Happy to work with you.</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }, 500);
        }
      </script>
    </body>
  </html>
          `);
          iframeDoc.close();

          // Trigger print
          iframe.contentWindow.focus();

          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching or printing invoice:", error);
      }
    };

    printInvoice();
  }, [invNumber]);

  if (!invNumber) return <div>No Invoice Number Provided</div>;

return (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
    <img src={LogoDark} style={{ width: '150px', marginBottom: '20px' }} alt="Logo" />
    <div className="spinner-border text-primary" role="status"></div>
    <p style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold' }}>Preparing Invoice for Printing...</p>
    <p style={{ color: '#666' }}>Please do not close this window.</p>
  </div>
);
};

export default TCTInvoicePrint;
import React, { useState, useEffect } from "react";
import axios from "axios";

const TCTBankDetails = ({ tutor }) => {
  const [form, setForm] = useState({
    name: "",
    amount: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    upiId: "",
    swiftCode: "",
    bankAddress: "",
    paymentType: tutor.country === "India" ? "INDIA" : "FOREIGN",
    tutorId: tutor.id
  });

  const isIndia = form.paymentType === "INDIA";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post("/api/TutorPayment", form);
    alert("Payment info saved!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Name: <input name="name" value={form.name} onChange={handleChange} required /></label><br />
      <label>Amount: <input name="amount" value={form.amount} onChange={handleChange} type="number" required /></label><br />
      {isIndia ? (
        <>
          <label>Account Number: <input name="accountNumber" value={form.accountNumber} onChange={handleChange} required /></label><br />
          <label>IFSC Code: <input name="ifscCode" value={form.ifscCode} onChange={handleChange} required /></label><br />
          <label>Bank Name: <input name="bankName" value={form.bankName} onChange={handleChange} required /></label><br />
          <label>Branch Name: <input name="branchName" value={form.branchName} onChange={handleChange} required /></label><br />
          <label>UPI ID: <input name="upiId" value={form.upiId} onChange={handleChange} /></label><br />
        </>
      ) : (
        <>
          <label>SWIFT Code: <input name="swiftCode" value={form.swiftCode} onChange={handleChange} /></label><br />
          <label>Bank Address: <input name="bankAddress" value={form.bankAddress} onChange={handleChange} /></label><br />
        </>
      )}
      <button type="submit">Save</button>
    </form>
  );
};

export default TCTBankDetails;

import React, { useEffect, useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Row, Col, Table, Spinner } from "reactstrap";
import { Button, Icon } from "../../../components/Component";
import { toast } from "react-toastify";
import {
  addOrUpdatePaymentPlan,
  recordPayment,
  getPaymentPlanBySalesDetails,
  createPrepaidUpfrontInvoice,
  createPrepaidStatement,
  checkPrepaidOverrun,
} from "../../../apiservices/ScheduleService";

// Manage the prepaid plan (Scenario 1) for one subject enrollment: create/update the plan and
// record payments against it. A subject with no plan here is billed month-by-month (Scenario 2).
const PaymentPlanModal = ({ isOpen, onClose, course }) => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const userId = localStorage.getItem("userId") || defaultGuid;
  const now = new Date();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [plan, setPlan] = useState(null); // PaymentPlanSummaryDto or null

  const emptyPlanForm = {
    planMonths: course?.scheduledPackageMonths || 3,
    startMonth: course?.packageStartMonth || course?.month || now.getMonth() + 1,
    startYear: course?.packageStartYear || course?.year || now.getFullYear(),
    totalClasses: "",
    totalFee: "",
    installmentCount: 1,
  };
  const [planForm, setPlanForm] = useState(emptyPlanForm);

  const emptyPayment = {
    amount: "",
    paidDate: now.toISOString().slice(0, 10),
    paymentMode: "UPI",
    referenceNo: "",
    installmentNo: "",
    notes: "",
  };
  const [paymentForm, setPaymentForm] = useState(emptyPayment);

  const [stmtMonth, setStmtMonth] = useState(now.getMonth() + 1);
  const [stmtYear, setStmtYear] = useState(now.getFullYear());

  const salesDetailsId = course?.salesDetailsId;

  useEffect(() => {
    if (isOpen && salesDetailsId && salesDetailsId !== defaultGuid) {
      loadPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, salesDetailsId]);

  const loadPlan = async () => {
    setLoading(true);
    setLoadError("");
    setPlan(null);
    try {
      const res = await getPaymentPlanBySalesDetails(salesDetailsId);
      // This GET returns the summary directly, while older deployments may wrap it in data.
      const data = res?.data ?? res ?? null;
      setPlan(data);
      if (data) {
        setPlanForm({
          planMonths: data.planMonths,
          startMonth: data.startMonth,
          startYear: data.startYear,
          totalClasses: data.totalClasses ?? "",
          totalFee: data.totalFee,
          installmentCount: data.installmentCount,
        });
      } else {
        setPlanForm(emptyPlanForm);
      }
    } catch (e) {
      setLoadError("Could not load this enrollment's payment plan. Retry before making changes.");
      toast.error(e?.response?.data?.message || e?.response?.data || "Could not load the payment plan. Verify that the payment-plan database script is deployed.");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (saving || loading || loadError || plan?.isLocked || plan?.upfrontInvoiceNumber) return;
    if (!salesDetailsId || salesDetailsId === defaultGuid) {
      toast.error("Missing enrollment reference for this subject.");
      return;
    }
    if (!planForm.totalFee || Number(planForm.totalFee) <= 0) {
      toast.error("Total fee must be greater than zero.");
      return;
    }
    if (course?.scheduledPackageMonths > 1 && (!Number.isInteger(Number(planForm.totalClasses)) || Number(planForm.totalClasses) <= 0)) {
      toast.error("Enter the agreed included classes for the entire package, not just the first month's classes.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        salesDetailsId,
        studentId: course?.studentId || defaultGuid,
        planMonths: Number(planForm.planMonths),
        startMonth: Number(planForm.startMonth),
        startYear: Number(planForm.startYear),
        totalClasses: planForm.totalClasses === "" ? null : Number(planForm.totalClasses),
        totalFee: Number(planForm.totalFee),
        installmentCount: Number(planForm.installmentCount),
        userId,
      };
      const res = await addOrUpdatePaymentPlan(payload);
      const result = res;
      if (result?.succeeded === false) {
        toast.error(result.message || "Could not save the plan.");
      } else {
        toast.success(plan ? "Plan updated." : "Plan created.");
        await loadPlan();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Could not save the plan.");
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!plan?.id) {
      toast.error("Create the plan before recording a payment.");
      return;
    }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Payment amount must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        studentPaymentPlanId: plan.id,
        installmentNo: paymentForm.installmentNo === "" ? null : Number(paymentForm.installmentNo),
        amount: Number(paymentForm.amount),
        paidDate: paymentForm.paidDate,
        paymentMode: paymentForm.paymentMode,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
        userId,
      };
      const res = await recordPayment(payload);
      const result = res;
      if (result?.succeeded === false) {
        toast.error(result.message || "Could not record the payment.");
      } else {
        toast.success("Payment recorded.");
        setPaymentForm(emptyPayment);
        await loadPlan();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data || "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  };

  // Prepaid v2: raise the single upfront full-period invoice covering the whole plan window
  // (all of this student's subjects as line items). Idempotent — returns the same invoice.
  const generateUpfrontInvoice = async () => {
    const studentId = course?.studentId;
    if (!studentId || studentId === defaultGuid) {
      toast.error("Missing student reference.");
      return;
    }
    setSaving(true);
    try {
      const res = await createPrepaidUpfrontInvoice(studentId, userId);
      const result = res;
      if (result?.success === false) {
        toast.error(result.message || "Could not generate the upfront invoice.");
      } else {
        toast.success(`Upfront invoice generated: ${result?.invoiceNumber || ""}`);
        await loadPlan();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not generate the upfront invoice.");
    } finally {
      setSaving(false);
    }
  };

  // Prepaid v2: raise the informational monthly statement (consumption picture) for the student.
  const generateStatement = async () => {
    const studentId = course?.studentId;
    if (!studentId || studentId === defaultGuid) {
      toast.error("Missing student reference.");
      return;
    }
    setSaving(true);
    try {
      const res = await createPrepaidStatement(studentId, Number(stmtMonth), Number(stmtYear), userId);
      const result = res;
      if (result?.success === false) {
        toast.error(result.message || "Could not generate the statement.");
      } else {
        toast.success(`Monthly invoice: ${result?.invoiceNumber || ""}`);
        await loadPlan();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not generate the statement.");
    } finally {
      setSaving(false);
    }
  };

  // Prepaid v2: detect credit exhaustion -> top-up invoice + block + notify roles.
  const runOverrunCheck = async () => {
    const studentId = course?.studentId;
    if (!studentId || studentId === defaultGuid) {
      toast.error("Missing student reference.");
      return;
    }
    setSaving(true);
    try {
      const res = await checkPrepaidOverrun(studentId, userId);
      const result = res;
      if (result?.succeeded === false) {
        toast.error(result.message || "Could not run the credit check.");
      } else {
        toast.info("Package usage checked. See the remaining classes and any block below. No future classes were invoiced.");
        await loadPlan();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not run the credit check.");
    } finally {
      setSaving(false);
    }
  };

  const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg">
      <ModalHeader toggle={onClose}>
        Payment Plan — {course?.subject || "Subject"}
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center p-4"><Spinner /></div>
        ) : (
          <>
            {/* Plan form */}
            <h6 className="mb-2">{plan ? "Plan Details" : "Create Plan"}</h6>
            {course?.scheduledPackageMonths > 1 && !plan && <div role="status" className="alert alert-info">Coordinator selected {course.scheduledPackageMonths} months. Confirm the agreed full-package fee and included classes below. The monthly schedule total is not the full-package fee.</div>}
            {loadError && <div role="alert" className="alert alert-danger">{loadError} <button type="button" onClick={loadPlan}>Retry</button></div>}
            {(plan?.isLocked || plan?.upfrontInvoiceNumber) && <div role="status" className="alert alert-info">Plan locked after invoice {plan.upfrontInvoiceNumber}. Payments can still be recorded below.</div>}
            <fieldset disabled={saving || Boolean(loadError) || plan?.isLocked || Boolean(plan?.upfrontInvoiceNumber)}>
            <Row className="g-2">
              <Col md="4">
                <label className="form-label">Duration (months)</label>
                <select aria-label="Package duration" className="form-control" value={planForm.planMonths} disabled={!plan && course?.scheduledPackageMonths > 1}
                  onChange={(e) => setPlanForm({ ...planForm, planMonths: e.target.value })}>
                  {[...new Set([1,2,3,4,5,6,7,8,9,10,12,Number(planForm.planMonths)])].sort((a,b) => a-b).map(months => <option key={months} value={months}>{months} months</option>)}
                </select>
              </Col>
              <Col md="4">
                <label className="form-label">Start Month (1-12)</label>
                <input type="number" min="1" max="12" className="form-control" value={planForm.startMonth} disabled={!plan && course?.scheduledPackageMonths > 1}
                  onChange={(e) => setPlanForm({ ...planForm, startMonth: e.target.value })} />
              </Col>
              <Col md="4">
                <label className="form-label">Start Year</label>
                <input type="number" className="form-control" value={planForm.startYear} disabled={!plan && course?.scheduledPackageMonths > 1}
                  onChange={(e) => setPlanForm({ ...planForm, startYear: e.target.value })} />
              </Col>
              <Col md="4">
                <label className="form-label">Included package classes</label>
                <input aria-label="Included package classes" type="number" className="form-control" value={planForm.totalClasses}
                  placeholder="Blank = scheduled count at invoicing"
                  onChange={(e) => setPlanForm({ ...planForm, totalClasses: e.target.value })} />
              </Col>
              <Col md="4">
                <label className="form-label">Total Fee (₹)</label>
                <input aria-label="Total package fee" type="number" className="form-control" value={planForm.totalFee}
                  onChange={(e) => setPlanForm({ ...planForm, totalFee: e.target.value })} />
              </Col>
              <Col md="4">
                <label className="form-label">Installments</label>
                <select className="form-control" value={planForm.installmentCount}
                  onChange={(e) => setPlanForm({ ...planForm, installmentCount: e.target.value })}>
                  <option value={1}>Single payment</option>
                  <option value={2}>2 installments</option>
                  <option value={3}>3 installments</option>
                  <option value={4}>4 installments</option>
                </select>
              </Col>
            </Row>
            <div className="mt-2">
              <Button color="primary" size="sm" disabled={saving} onClick={savePlan}>
                {plan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
            </fieldset>

            {/* Running totals + payments */}
            {plan && (
              <>
                <hr />
                {plan.isBlocked && (
                  <div className="alert alert-danger py-2 px-3 mb-2" style={{ fontSize: "12px" }}>
                    <Icon name="alert-circle" /> <strong>Package classes blocked.</strong>{" "}
                    {plan.remainingClasses === 0 ? "All included classes are used. A new approved package is required; paying past extras does not add classes." : "Contact Accounts to check unpaid charges or the included class count."}
                    {plan.balanceInvoiceNumber && <> Extra-class invoice: <strong>{plan.balanceInvoiceNumber}</strong>.</>}
                    {plan.blockedDate ? ` (blocked ${new Date(plan.blockedDate).toLocaleDateString("en-IN")})` : ""}
                  </div>
                )}

                <Row className="g-2 mb-2">
                  <Col md="12">Included: {plan.totalClasses ?? "Not confirmed"} · Completed: {plan.completedClasses ?? 0} · Remaining: {plan.remainingClasses ?? "—"} · Extra charges: {inr(plan.extraClassCharges)}</Col>
                  <Col md="4"><strong>Total Fee:</strong> {inr(plan.totalFee)}</Col>
                  <Col md="4"><strong>Paid:</strong> <span className="text-success">{inr(plan.amountPaid)}</span></Col>
                  <Col md="4"><strong>Remaining:</strong> <span className="text-warning">{inr(plan.remainingAmount)}</span></Col>
                </Row>

                <div className="mb-2">
                  <Button color="info" size="sm" outline disabled={saving} onClick={generateUpfrontInvoice}>
                    <Icon name="file-text" /> Generate Upfront Invoice
                  </Button>
                  <span className="text-muted ms-2" style={{ fontSize: "12px" }}>
                    One invoice for the full plan term, all subjects as line items.
                  </span>
                </div>

                <div className="mb-2 d-flex align-items-end flex-wrap" style={{ gap: "8px" }}>
                  <div>
                    <label className="form-label mb-0" style={{ fontSize: "12px" }}>Statement Month</label>
                    <select className="form-control form-control-sm" style={{ width: "130px" }}
                      value={stmtMonth} onChange={(e) => setStmtMonth(e.target.value)}>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"]
                        .map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label mb-0" style={{ fontSize: "12px" }}>Year</label>
                    <input type="number" className="form-control form-control-sm" style={{ width: "90px" }}
                      value={stmtYear} onChange={(e) => setStmtYear(e.target.value)} />
                  </div>
                  <Button color="secondary" size="sm" outline disabled={saving} onClick={generateStatement}>
                    <Icon name="reports" /> Monthly Check / Invoice
                  </Button>
                  <Button color="danger" size="sm" outline disabled={saving} onClick={runOverrunCheck}>
                    <Icon name="alert-circle" /> Check Package Usage
                  </Button>
                  <span className="text-muted" style={{ fontSize: "12px" }}>
                    Monthly invoice = ₹0 while within the package count. Only completed extra classes are charged. No separate monthly class limit.
                  </span>
                </div>

                <h6 className="mt-3 mb-2">Record Payment</h6>
                <Row className="g-2">
                  <Col md="3">
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" className="form-control" value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  </Col>
                  <Col md="3">
                    <label className="form-label">Paid Date</label>
                    <input type="date" className="form-control" value={paymentForm.paidDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })} />
                  </Col>
                  <Col md="2">
                    <label className="form-label">Mode</label>
                    <select className="form-control" value={paymentForm.paymentMode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}>
                      <option>UPI</option><option>Cash</option><option>Bank</option><option>Stripe</option>
                    </select>
                  </Col>
                  <Col md="2">
                    <label className="form-label">Instalment #</label>
                    <input type="number" className="form-control" value={paymentForm.installmentNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, installmentNo: e.target.value })} />
                  </Col>
                  <Col md="2">
                    <label className="form-label">Reference</label>
                    <input type="text" className="form-control" value={paymentForm.referenceNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })} />
                  </Col>
                </Row>
                <div className="mt-2">
                  <Button color="success" size="sm" disabled={saving} onClick={submitPayment}>
                    <Icon name="plus" /> Add Payment
                  </Button>
                </div>

                <h6 className="mt-3 mb-2">Payments</h6>
                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <th>Date</th><th>Amount</th><th>Mode</th><th>Instalment</th><th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.payments || []).length > 0 ? (
                      plan.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-IN") : "-"}</td>
                          <td>{inr(p.amount)}</td>
                          <td>{p.paymentMode || "-"}</td>
                          <td>{p.installmentNo ?? "-"}</td>
                          <td>{p.referenceNo || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="text-center">No payments recorded yet</td></tr>
                    )}
                  </tbody>
                </Table>
              </>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
};

export default PaymentPlanModal;

import React, { useEffect, useRef, useState } from "react";
import "./Sales.css";

// =========================================================
// PAYMENT DATA
// =========================================================

const paymentData = [
  {
    id: "4947",
    account: "Enterprize Year Subscription",
    issueDate: "10-05-2021",
    dueDate: "10-13-2021",
    amount: "$599.00",
    status: "Due",
  },
  {
    id: "4748",
    account: "Tiered Subscription",
    issueDate: "02-08-2020",
    dueDate: "05-22-2020",
    amount: "$300.00",
    status: "Paid",
  },
  {
    id: "4698",
    account: "Silver Subscription",
    issueDate: "08-08-2020",
    dueDate: "10-14-2020",
    amount: "$299.00",
    status: "Canceled",
  },
  {
    id: "5696",
    account: "Flexible Subscription Plan",
    issueDate: "25-04-2020",
    dueDate: "13-05-2020",
    amount: "$120.00",
    status: "Paid",
  },
];

// =========================================================
// RECENT SALES DATA
// =========================================================

const recentSalesData = [
  {
    id: "P-15",
    name: "iPhone 11",
    stock: 80,
    description: "4 GB RAM, 12 MP.",
    unit: "Each",
    price: "$1099.00",
    discount: "$9.00",
    category: "Mobile",
    status: "Available",
  },
  {
    id: "P-94",
    name: "iPhone 11s",
    stock: 0,
    description: "2 GB RAM, 12 MP.",
    unit: "Each",
    price: "$999.00",
    discount: "$9.00",
    category: "Mobile",
    status: "Out of Stock",
  },
  {
    id: "P-98",
    name: "Oppo F17",
    stock: 39,
    description: "Octa Core, 6 GB RAM, 24 MP Camera.",
    unit: "Each",
    price: "$399.00",
    discount: "$9.00",
    category: "Mobile",
    status: "Low Stock",
  },
  {
    id: "P-64",
    name: "iPhone 11 pro",
    stock: 120,
    description: "A13 Bionic, 12 GB RAM, 12 MP Dual Camera.",
    unit: "Each",
    price: "$1299.00",
    discount: "$9.00",
    category: "Mobile",
    status: "Available",
  },
];

// =========================================================
// ESTIMATES DATA
// =========================================================

const estimateData = [
  {
    id: "EST-136",
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    date: "10 Jan 2020",
    email: "info@softnio.com",
    expiresDate: "14 Feb 2021",
    company: "Softnio",
    verified: "Email",
    amount: "$535.00",
    status: "Accepted",
  },
  {
    id: "EST-012",
    initials: "BW",
    name: "Barry Wayne",
    date: "19 March 2020",
    email: "barry@softnio.com",
    expiresDate: "22 April 2020",
    company: "Unilever",
    verified: "Pending",
    amount: "$535.00",
    status: "Declined",
  },
  {
    id: "EST-865",
    initials: "T",
    name: "Tasnim",
    date: "13 Feb 2020",
    email: "tasnim@softnio.com",
    expiresDate: "28 March 2020",
    company: "Softnio",
    verified: "Not Verified",
    amount: "$535.00",
    status: "Expired",
  },
  {
    id: "EST-005",
    initials: "FR",
    name: "Fuad Rahman",
    date: "15 March 2020",
    email: "fuad@softnio.com",
    expiresDate: "11 April 2020",
    company: "Reakitt",
    verified: "Email",
    amount: "$535.00",
    status: "New",
  },
];

// =========================================================
// EXPENSE DATA
// =========================================================

const expenseData = [
  {
    id: "EX-99",
    initials: "AB",
    user: "Abu Bin Ishtiyak",
    date: "10 Feb 2020",
    description: "Lorem ipsum dolor sit amet.",
    project: "IT Solution",
    client: "Softnio",
    invoiceId: "INV-134",
    amount: "$535.00",
    status: "Paid",
  },
  {
    id: "EX-86",
    initials: "BW",
    user: "Barry Wayne",
    date: "13 March 2020",
    description: "Demonstrate the visual form.",
    project: "Redesign Website",
    client: "Reckitt",
    invoiceId: "-",
    amount: "$278.00",
    status: "Billable",
  },
  {
    id: "EX-36",
    initials: "FH",
    user: "Fuad Hossain",
    date: "15 March 2020",
    description: "In publishing and graphic.",
    project: "Keyword Research for SEO",
    client: "Unilever",
    invoiceId: "INV-123",
    amount: "$612.00",
    status: "Due",
  },
  {
    id: "EX-38",
    initials: "AT",
    user: "Athan Travis",
    date: "11 Feb 2020",
    description: "Lorem ipsum used as placeholder.",
    project: "Database Management",
    client: "Asia paints",
    invoiceId: "INV-132",
    amount: "$430.00",
    status: "Paid",
  },
];

// =========================================================
// MAIN SALES PAGE
// =========================================================

const Sales = () => {
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedEstimates, setSelectedEstimates] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  // Estimate + dropdown
  const [showEstimateMenu, setShowEstimateMenu] = useState(false);

  // Estimate modal
  const [showEstimateModal, setShowEstimateModal] = useState(false);

  const estimateMenuRef = useRef(null);

  // =======================================================
  // CLOSE ESTIMATE DROPDOWN WHEN CLICKING OUTSIDE
  // =======================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        estimateMenuRef.current &&
        !estimateMenuRef.current.contains(event.target)
      ) {
        setShowEstimateMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // =======================================================
  // PAYMENT SELECT ALL
  // =======================================================

  const toggleAllPayments = () => {
    if (selectedPayments.length === paymentData.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(paymentData.map((item) => item.id));
    }
  };

  // =======================================================
  // PAYMENT SELECT
  // =======================================================

  const togglePayment = (id) => {
    setSelectedPayments((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =======================================================
  // PRODUCT SELECT
  // =======================================================

  const toggleProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =======================================================
  // ESTIMATE SELECT
  // =======================================================

  const toggleEstimate = (id) => {
    setSelectedEstimates((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =======================================================
  // EXPENSE SELECT
  // =======================================================

  const toggleExpense = (id) => {
    setSelectedExpenses((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =======================================================
  // ADD ESTIMATE
  // =======================================================

  const handleAddEstimate = () => {
    setShowEstimateMenu(false);
    setShowEstimateModal(true);
  };

  // =======================================================
  // IMPORT ESTIMATE
  // =======================================================

  const handleImportEstimate = () => {
    setShowEstimateMenu(false);

    // Add your import functionality here
    alert("Import Estimates clicked");
  };

  return (
    <div className="customer-sales-page">

      {/* =====================================================
          1. PAYMENT
      ===================================================== */}

      <SalesSectionHeader
        title="Payment"
        subtitle="You have total 937 Payment."
        importButton
        addButton
      />

      <div className="sales-card">

        <SalesCardHeader title="All Payment" />

        <SalesTableToolbar />

        <div className="sales-table-wrapper">

          <table className="sales-table payment-table">

            <thead>
              <tr>

                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={
                      selectedPayments.length === paymentData.length &&
                      paymentData.length > 0
                    }
                    onChange={toggleAllPayments}
                  />
                </th>

                <th>ID</th>
                <th>ACCOUNT</th>
                <th>ISSUE DATE</th>
                <th>DUE DATE</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th></th>

              </tr>
            </thead>

            <tbody>

              {paymentData.map((payment) => (

                <tr key={payment.id}>

                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => togglePayment(payment.id)}
                    />
                  </td>

                  <td>
                    <span className="purple-link">
                      {payment.id}
                    </span>
                  </td>

                  <td>
                    {payment.account}
                  </td>

                  <td>
                    {payment.issueDate}
                  </td>

                  <td>
                    {payment.dueDate}
                  </td>

                  <td className="amount-text">
                    {payment.amount}
                  </td>

                  <td>
                    <StatusBadge status={payment.status} />
                  </td>

                  <td>
                    <ActionButton />
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <Pagination />

      </div>


      {/* =====================================================
          2. RECENT SALES
      ===================================================== */}

      <SalesSectionHeader
        title="Recent Sales"
        subtitle="You have total 937 products."
        importButton
        addButton
      />

      <div className="sales-card">

        <SalesCardHeader title="Recent Sales" />

        <div className="sales-table-wrapper">

          <table className="sales-table product-table">

            <thead>

              <tr>

                <th className="checkbox-cell">
                  <input type="checkbox" />
                </th>

                <th>ID</th>
                <th>NAME</th>
                <th>STOCK</th>
                <th>DESCRIPTION</th>
                <th>UNIT</th>
                <th>PRICE</th>
                <th>DISCOUNT</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
                <th></th>

              </tr>

            </thead>

            <tbody>

              {recentSalesData.map((product) => (

                <tr key={product.id}>

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />

                  </td>

                  <td>

                    <span className="purple-link">
                      {product.id}
                    </span>

                  </td>

                  <td>
                    {product.name}
                  </td>

                  <td>
                    {product.stock}
                  </td>

                  <td>
                    {product.description}
                  </td>

                  <td>
                    {product.unit}
                  </td>

                  <td className="amount-text">
                    {product.price}
                  </td>

                  <td className="amount-text">
                    {product.discount}
                  </td>

                  <td>
                    {product.category}
                  </td>

                  <td>
                    <ProductStatus
                      status={product.status}
                    />
                  </td>

                  <td>
                    <ActionButton />
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <Pagination />

      </div>


      {/* =====================================================
          3. ESTIMATES LIST
      ===================================================== */}

      <div className="sales-section-header">

        <div>

          <h2>
            Estimates List
          </h2>

          <p>
            You have total 95 estimates.
          </p>

        </div>

        <div
          className="sales-estimate-header-actions"
          ref={estimateMenuRef}
        >

          {/* EXPORT BUTTON */}

          <button
            type="button"
            className="sales-secondary-button"
          >

            <span>
              ⇩
            </span>

            Export

          </button>


          {/* PLUS BUTTON + DROPDOWN */}

          <div className="estimate-add-wrapper">

            <button
              type="button"
              className="sales-add-small-button"
              onClick={() =>
                setShowEstimateMenu((prev) => !prev)
              }
            >
              +
            </button>


            {/* DROPDOWN */}

            {showEstimateMenu && (

              <div className="estimate-add-dropdown">

                <button
                  type="button"
                  onClick={handleAddEstimate}
                >
                  Add Estimates
                </button>

                <button
                  type="button"
                  onClick={handleImportEstimate}
                >
                  Import Estimates
                </button>

              </div>

            )}

          </div>

        </div>

      </div>


      <div className="sales-card estimate-card">

        <SalesTableToolbar />

        <div className="sales-table-wrapper">

          <table className="sales-table estimates-table">

            <thead>

              <tr>

                <th className="checkbox-cell">

                  <input
                    type="checkbox"
                    checked={
                      selectedEstimates.length ===
                      estimateData.length
                    }
                    onChange={() => {

                      if (
                        selectedEstimates.length ===
                        estimateData.length
                      ) {
                        setSelectedEstimates([]);
                      } else {
                        setSelectedEstimates(
                          estimateData.map(
                            (item) => item.id
                          )
                        );
                      }

                    }}
                  />

                </th>

                <th>ID</th>
                <th>CREATED BY</th>
                <th>DATE</th>
                <th>EMAIL</th>
                <th>EXPIRES DATE</th>
                <th>COMPANY</th>
                <th>VERIFIED</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th></th>

              </tr>

            </thead>

            <tbody>

              {estimateData.map((estimate) => (

                <tr key={estimate.id}>

                  {/* CHECKBOX */}

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedEstimates.includes(
                        estimate.id
                      )}
                      onChange={() =>
                        toggleEstimate(
                          estimate.id
                        )
                      }
                    />

                  </td>


                  {/* ID */}

                  <td>

                    <span className="purple-link">
                      {estimate.id}
                    </span>

                  </td>


                  {/* CREATED BY */}

                  <td>

                    <div className="sales-user">

                      <div className="sales-avatar">
                        {estimate.initials}
                      </div>

                      <span>
                        {estimate.name}
                      </span>

                    </div>

                  </td>


                  {/* DATE */}

                  <td>
                    {estimate.date}
                  </td>


                  {/* EMAIL */}

                  <td>
                    {estimate.email}
                  </td>


                  {/* EXPIRES */}

                  <td>
                    {estimate.expiresDate}
                  </td>


                  {/* COMPANY */}

                  <td>
                    {estimate.company}
                  </td>


                  {/* VERIFIED */}

                  <td>

                    <VerifiedText
                      value={estimate.verified}
                    />

                  </td>


                  {/* AMOUNT */}

                  <td className="amount-text">

                    {estimate.amount}

                  </td>


                  {/* STATUS */}

                  <td>

                    <EstimateStatus
                      status={estimate.status}
                    />

                  </td>


                  {/* ACTION */}

                  <td>

                    <ActionButton />

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <Pagination />

      </div>


      {/* =====================================================
          4. EXPENSES
      ===================================================== */}

      <SalesSectionHeader
        title="Expenses List"
        subtitle="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore."
        exportButton
        addButton
      />

      <div className="sales-card">

        <SalesTableToolbar />

        <div className="sales-table-wrapper">

          <table className="sales-table expenses-table">

            <thead>

              <tr>

                <th className="checkbox-cell">

                  <input type="checkbox" />

                </th>

                <th>ID</th>
                <th>USER</th>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>PROJECT</th>
                <th>CLIENT</th>
                <th>INVOICE ID</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th></th>

              </tr>

            </thead>

            <tbody>

              {expenseData.map((expense) => (

                <tr key={expense.id}>

                  <td>

                    <input
                      type="checkbox"
                      checked={selectedExpenses.includes(
                        expense.id
                      )}
                      onChange={() =>
                        toggleExpense(
                          expense.id
                        )
                      }
                    />

                  </td>


                  <td>

                    <span className="purple-link">
                      {expense.id}
                    </span>

                  </td>


                  <td>

                    <div className="sales-user">

                      <div className="sales-avatar">
                        {expense.initials}
                      </div>

                      <span>
                        {expense.user}
                      </span>

                    </div>

                  </td>


                  <td>
                    {expense.date}
                  </td>


                  <td>
                    {expense.description}
                  </td>


                  <td>
                    {expense.project}
                  </td>


                  <td>
                    {expense.client}
                  </td>


                  <td>

                    <span className="purple-link">
                      {expense.invoiceId}
                    </span>

                  </td>


                  <td className="amount-text">
                    {expense.amount}
                  </td>


                  <td>

                    <ExpenseStatus
                      status={expense.status}
                    />

                  </td>


                  <td>

                    <ActionButton />

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <Pagination />

      </div>


      {/* =====================================================
          ADD ESTIMATE MODAL
      ===================================================== */}

      {showEstimateModal && (

        <div
          className="sales-modal-overlay"
          onClick={() =>
            setShowEstimateModal(false)
          }
        >

          <div
            className="sales-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="sales-modal-header">

              <h3>
                Add Estimates
              </h3>

              <button
                type="button"
                className="sales-modal-close"
                onClick={() =>
                  setShowEstimateModal(false)
                }
              >
                ×
              </button>

            </div>


            {/* FORM */}

            <div className="sales-modal-body">

              <div className="sales-form-grid">

                {/* ID */}

                <div className="sales-form-group">

                  <label>
                    ID
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. EST-136"
                  />

                </div>


                {/* CREATED BY */}

                <div className="sales-form-group">

                  <label>
                    Created By
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Abu Bin Ishtiyak"
                  />

                </div>


                {/* DATE */}

                <div className="sales-form-group">

                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                  />

                </div>


                {/* EMAIL */}

                <div className="sales-form-group">

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="e.g. info@example.com"
                  />

                </div>


                {/* EXPIRES DATE */}

                <div className="sales-form-group">

                  <label>
                    Expires Date
                  </label>

                  <input
                    type="date"
                  />

                </div>


                {/* COMPANY */}

                <div className="sales-form-group">

                  <label>
                    Company
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Softnio"
                  />

                </div>


                {/* VERIFIED */}

                <div className="sales-form-group">

                  <label>
                    Verified
                  </label>

                  <select>

                    <option>
                      Select Verified
                    </option>

                    <option>
                      Email
                    </option>

                    <option>
                      Pending
                    </option>

                    <option>
                      Not Verified
                    </option>

                  </select>

                </div>


                {/* AMOUNT */}

                <div className="sales-form-group">

                  <label>
                    Amount
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. $535.00"
                  />

                </div>


                {/* STATUS */}

                <div className="sales-form-group">

                  <label>
                    Status
                  </label>

                  <select>

                    <option>
                      Select Status
                    </option>

                    <option>
                      Accepted
                    </option>

                    <option>
                      Declined
                    </option>

                    <option>
                      Expired
                    </option>

                    <option>
                      New
                    </option>

                  </select>

                </div>

              </div>

            </div>


            {/* MODAL FOOTER */}

            <div className="sales-modal-footer">

              <button
                type="button"
                className="sales-modal-cancel"
                onClick={() =>
                  setShowEstimateModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="sales-modal-submit"
                onClick={() =>
                  setShowEstimateModal(false)
                }
              >
                Add Estimates
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};


// =========================================================
// SECTION HEADER
// =========================================================

const SalesSectionHeader = ({
  title,
  subtitle,
  importButton,
  exportButton,
  addButton,
}) => {

  return (

    <div className="sales-section-header">

      <div>

        <h2>
          {title}
        </h2>

        <p>
          {subtitle}
        </p>

      </div>


      <div className="sales-header-buttons">

        {(importButton || exportButton) && (

          <button
            type="button"
            className="sales-secondary-button"
          >

            <span>
              {importButton ? "⇧" : "⇩"}
            </span>

            {importButton
              ? "Import"
              : "Export"}

          </button>

        )}


        {addButton && (

          <button
            type="button"
            className="sales-add-button"
          >

            <span>
              +
            </span>

            Add New

          </button>

        )}

      </div>

    </div>

  );
};


// =========================================================
// CARD HEADER
// =========================================================

const SalesCardHeader = ({ title }) => {

  return (

    <div className="sales-card-header">

      <h3>
        {title}
      </h3>

      <div className="sales-card-tools">

        <button type="button">
          ⌕
        </button>

        <button type="button">
          ⚙
        </button>

      </div>

    </div>

  );

};


// =========================================================
// TOOLBAR
// =========================================================

const SalesTableToolbar = () => {

  return (

    <div className="sales-toolbar">

      <div className="sales-bulk-actions">

        <button
          type="button"
          className="bulk-action-button"
        >

          Bulk Action

          <span>
            ⌄
          </span>

        </button>

        <button
          type="button"
          className="apply-button"
        >
          Apply
        </button>

      </div>


      <div className="sales-toolbar-icons">

        <button type="button">
          ⌕
        </button>

        <button type="button">
          ☷
        </button>

        <button type="button">
          ⚙
        </button>

      </div>

    </div>

  );

};


// =========================================================
// PAYMENT STATUS
// =========================================================

const StatusBadge = ({ status }) => {

  const className = status
    .toLowerCase()
    .replaceAll(" ", "-");

  return (

    <span
      className={`sales-status ${className}`}
    >

      <span>
        ●
      </span>

      {status}

    </span>

  );

};


// =========================================================
// PRODUCT STATUS
// =========================================================

const ProductStatus = ({ status }) => {

  let className = "available";

  if (status === "Out of Stock") {
    className = "out-of-stock";
  }

  if (status === "Low Stock") {
    className = "low-stock";
  }

  return (

    <span
      className={`sales-status ${className}`}
    >

      <span>
        ●
      </span>

      {status}

    </span>

  );

};


// =========================================================
// ESTIMATE STATUS
// =========================================================

const EstimateStatus = ({ status }) => {

  const className = status
    .toLowerCase()
    .replaceAll(" ", "-");

  return (

    <span
      className={`sales-status estimate-${className}`}
    >

      <span>
        ●
      </span>

      {status}

    </span>

  );

};


// =========================================================
// EXPENSE STATUS
// =========================================================

const ExpenseStatus = ({ status }) => {

  const className = status
    .toLowerCase()
    .replaceAll(" ", "-");

  return (

    <span
      className={`sales-status expense-${className}`}
    >

      <span>
        ●
      </span>

      {status}

    </span>

  );

};


// =========================================================
// VERIFIED
// =========================================================

const VerifiedText = ({ value }) => {

  let className = "verified-email";

  if (value === "Pending") {
    className = "verified-pending";
  }

  if (value === "Not Verified") {
    className = "verified-not";
  }

  return (

    <span
      className={`verified-text ${className}`}
    >

      <span>
        ●
      </span>

      {value}

    </span>

  );

};


// =========================================================
// ACTION BUTTON
// =========================================================

const ActionButton = () => {

  return (

    <button
      type="button"
      className="sales-action-button"
    >
      •••
    </button>

  );

};


// =========================================================
// PAGINATION
// =========================================================

const Pagination = () => {

  return (

    <div className="sales-pagination">

      <button type="button">
        Prev
      </button>

      <button
        type="button"
        className="pagination-active"
      >
        1
      </button>

      <button type="button">
        2
      </button>

      <button type="button">
        ...
      </button>

      <button type="button">
        6
      </button>

      <button type="button">
        7
      </button>

      <button type="button">
        Next
      </button>

    </div>

  );

};


export default Sales;
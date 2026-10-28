import React, { useState } from "react";
import {
  CircleCheck,
  LoaderCircle,
  MoreHorizontal,
} from "lucide-react";

import "./InstructorPayment.css";

const completedPayments = [
  {
    id: 1,
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    email: "info@softnio.com",
    account: "9834/paypal",
    amount: "$7000",
    date: "10-01-21",
    avatar: "purple",
  },
  {
    id: 2,
    initials: "",
    name: "Alan Butler",
    email: "butler@example.com",
    account: "7623/paypal",
    amount: "$2000",
    date: "10-01-21",
    avatar: "image",
    image: "/images/avatar/a-sm.jpg",
  },
  {
    id: 3,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    account: "98754/paypal",
    amount: "$2500",
    date: "10-01-21",
    avatar: "yellow",
  },
  {
    id: 4,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    account: "7634/paypal",
    amount: "$5000",
    date: "12-01-21",
    avatar: "green",
  },
  {
    id: 5,
    initials: "",
    name: "Jane Harris",
    email: "harris@example.com",
    account: "1245/paypal",
    amount: "$3000",
    date: "11-01-21",
    avatar: "image",
    image: "/images/avatar/a-sm.jpg",
  },
  {
    id: 6,
    initials: "EW",
    name: "Emma Walker",
    email: "walker@example.com",
    account: "6675/paypal",
    amount: "$2100",
    date: "16-01-21",
    avatar: "purple",
  },
  {
    id: 7,
    initials: "",
    name: "Alan Butler",
    email: "alan@example.com",
    account: "5623/paypal",
    amount: "$1500",
    date: "10-05-21",
    avatar: "image",
    image: "/images/avatar/a-sm.jpg",
  },
  {
    id: 8,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    account: "78754/paypal",
    amount: "$1978",
    date: "14-04-21",
    avatar: "yellow",
  },
  {
    id: 9,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    account: "7634/paypal",
    amount: "$5000",
    date: "12-01-21",
    avatar: "green",
  },
];

const pendingPayments = [
  {
    id: 1,
    initials: "JL",
    name: "Joe Larson",
    email: "larson@example.com",
    account: "7632/paypal",
    amount: "$8000",
    avatar: "blue",
  },
  {
    id: 2,
    initials: "JD",
    name: "John Doe",
    email: "jhon@example.com",
    account: "8769/payoneer",
    amount: "$7900",
    avatar: "green",
  },
  {
    id: 3,
    initials: "AM",
    name: "Alex Marchol",
    email: "alex@example.com",
    account: "8632/paypal",
    amount: "$9050",
    avatar: "purple",
  },
  {
    id: 4,
    initials: "JL",
    name: "Joe Larson",
    email: "larson@example.com",
    account: "7632/paypal",
    amount: "$8000",
    avatar: "yellow",
  },
  {
    id: 5,
    initials: "JS",
    name: "Jane Smith",
    email: "smith@example.com",
    account: "7458/paypal",
    amount: "$9860",
    avatar: "blue",
  },
  {
    id: 6,
    initials: "JD",
    name: "John Doe",
    email: "jhon@example.com",
    account: "8769/payoneer",
    amount: "$7900",
    avatar: "green",
  },
  {
    id: 7,
    initials: "LW",
    name: "Jara Watson",
    email: "watson@example.com",
    account: "7458/paypal",
    amount: "$9860",
    avatar: "red",
  },
  {
    id: 8,
    initials: "JL",
    name: "Joe Larson",
    email: "larson@example.com",
    account: "7632/paypal",
    amount: "$8000",
    avatar: "blue",
  },
  {
    id: 9,
    initials: "MM",
    name: "Max Marchol",
    email: "marchol@example.com",
    account: "8902/paypal",
    amount: "$5050",
    avatar: "purple",
  },
];

const InstructorPayment = () => {
  const [activeTab, setActiveTab] = useState("completed");

  const payments =
    activeTab === "completed"
      ? completedPayments
      : pendingPayments;

  return (
    <div className="instructor-payment-page">

      {/* =====================================================
          PAGE TITLE
          ===================================================== */}

      <div className="instructor-payment-page-header">
        <h2>Instructor Payment</h2>
      </div>


      {/* =====================================================
          PAYMENT CARD
          ===================================================== */}

      <div className="instructor-payment-card">

        {/* ===================================================
            TABS
            =================================================== */}

        <div className="instructor-payment-tabs">

          <button
            type="button"
            className={
              activeTab === "completed"
                ? "payment-tab active"
                : "payment-tab"
            }
            onClick={() => setActiveTab("completed")}
          >
            <CircleCheck size={18} />

            <span>
              Completed payment
            </span>
          </button>


          <button
            type="button"
            className={
              activeTab === "pending"
                ? "payment-tab active"
                : "payment-tab"
            }
            onClick={() => setActiveTab("pending")}
          >
            <LoaderCircle size={19} />

            <span>
              Pending payment
            </span>
          </button>

        </div>


        {/* ===================================================
            TABLE
            =================================================== */}

        <div className="instructor-payment-table">

          {/* TABLE HEADER */}

          <div className="payment-row payment-table-header">

            <div className="payment-checkbox">
              <input
                type="checkbox"
                aria-label="Select all payments"
              />
            </div>

            <div className="payment-instructor">
              Instructor
            </div>

            <div className="payment-account">
              Account Number
            </div>

            <div className="payment-amount">
              {activeTab === "pending"
                ? "pending Amount"
                : "Amount"}
            </div>

            {activeTab === "completed" && (
              <div className="payment-date">
                Payment date
              </div>
            )}

            <div className="payment-menu">
              <MoreHorizontal size={18} />
            </div>

          </div>


          {/* PAYMENT ROWS */}

          {payments.map((payment) => (

            <div
              className="payment-row payment-data-row"
              key={payment.id}
            >

              {/* Checkbox */}

              <div className="payment-checkbox">

                <input
                  type="checkbox"
                  aria-label={`Select ${payment.name}`}
                />

              </div>


              {/* Instructor */}

              <div className="payment-instructor">

                <div className="payment-instructor-info">

                  <div
                    className={`payment-avatar ${payment.avatar}`}
                  >
                    {payment.image ? (
                      <img
                        src={payment.image}
                        alt={payment.name}
                      />
                    ) : (
                      payment.initials
                    )}
                  </div>

                  <div className="payment-instructor-details">

                    <span className="payment-instructor-name">
                      {payment.name}
                    </span>

                    <span className="payment-instructor-email">
                      {payment.email}
                    </span>

                  </div>

                </div>

              </div>


              {/* Account */}

              <div className="payment-account">
                {payment.account}
              </div>


              {/* Amount */}

              <div className="payment-amount">
                {payment.amount}
              </div>


              {/* Date */}

              {activeTab === "completed" && (
                <div className="payment-date">
                  {payment.date}
                </div>
              )}


              {/* Menu */}

              <div className="payment-menu">

                <button
                  type="button"
                  className="payment-menu-button"
                  title="More options"
                >
                  <MoreHorizontal size={18} />
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
};

export default InstructorPayment;
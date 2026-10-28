import React, { useState } from "react";
import "./EnrollStudents.css";

const EnrollStudents = () => {
  const [formData, setFormData] = useState({
    user: "",
    course: "",
    country: "",
    state: "",
    paymentMethod: "",
    phone: "",
    email: "",
    address: "",
    studentId: "",
  });

  const users = [
    "Abu Bin Ishtiyak",
    "John Smith",
    "Emma Wilson",
    "Michael Brown",
    "Sophia Davis",
  ];

  const courses = [
    "UI/UX Design with Adobe XD",
    "Web Development",
    "React JS",
    "Python Programming",
    "Mobile Application Development",
  ];

  const countries = [
    "United State",
    "India",
    "United Kingdom",
    "Canada",
    "Australia",
  ];

  const states = [
    "United State",
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Maharashtra",
  ];

  const paymentMethods = [
    "Card",
    "Cash",
    "UPI",
    "Bank Transfer",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Enrollment Data:", formData);

    alert("Student enrolled successfully.");
  };

  return (
    <div className="enroll-student-page">
      <div className="enroll-student-title">
        <h2>Enroll a student</h2>
      </div>

      <div className="enroll-student-card">
        <form onSubmit={handleSubmit}>
          <div className="enroll-form-grid">

            {/* Select User */}
            <div className="form-group">
              <label htmlFor="user">Select an user</label>

              <select
                id="user"
                name="user"
                value={formData.user}
                onChange={handleChange}
              >
                <option value="">Select User</option>

                {users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className="form-group">
              <label htmlFor="course">Course to enrol</label>

              <select
                id="course"
                name="course"
                value={formData.course}
                onChange={handleChange}
              >
                <option value="">Select Course</option>

                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="form-group">
              <label htmlFor="country">Country</label>

              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              >
                <option value="">Select Country</option>

                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* State */}
            <div className="form-group">
              <label htmlFor="state">State</label>

              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
              >
                <option value="">Select State</option>

                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label htmlFor="paymentMethod">
                Payment Method
              </label>

              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="">Select Payment Method</option>

                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Phone</label>

              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone no"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>

              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label htmlFor="address">Current address</label>

              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Current address"
              />
            </div>

            {/* Student ID */}
            <div className="form-group student-id-field">
              <label htmlFor="studentId">Student Id</label>

              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Student Id"
              />
            </div>

          </div>

          <div className="enroll-button-wrapper">
            <button
              type="submit"
              className="enroll-submit-btn"
            >
              Enroll Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollStudents;
import React from "react";
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>🚫 Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <Link to={`${process.env.PUBLIC_URL}/`}>Go to Dashboard</Link>
    </div>
  );
};

export default Unauthorized;
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

const HeaderSearch = () => {
  const [query, setQuery] = useState("");
  const history = useHistory();
  const { can } = usePermissions();
  const accounts = ["Accounts", "AccountsAdmin", "Payroll", "PayrollAdmin"].includes(localStorage.getItem("userRole"));
  const canSearch = can("Student List", "view") || (accounts && can("Accounts Student List", "view"));
  if (!canSearch) return null;
  return (
    <form role="search" aria-label="Student search" className="d-flex" onSubmit={(event) => {
      event.preventDefault();
      history.push(`${process.env.PUBLIC_URL}/lms/${accounts ? "accounts-studentlist" : "studentlist"}?search=${encodeURIComponent(query.trim())}`);
    }}>
      <input aria-label="Search students" className="form-control" style={{ maxWidth: 220 }}
        placeholder="Search students" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="submit" className="btn btn-outline-primary ml-1">Search</button>
    </form>
  );
};

export default HeaderSearch;

import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="nk-footer">
      <div className="container-fluid">
        <div className="nk-footer-wrap">
          <div className="nk-footer-copyright">
            {" "}
            &copy; 2026 The Chennai Tution(Learning Management System).
          </div>
          <div className="nk-footer-links">
            <ul className="nav nav-sm">
              <li className="nav-item">
              <a href={`https://thechennaituition.com/terms-and-conditions/`} target="_blank" rel="noopener noreferrer" className="nav-link">
              Terms &amp; Condition
              </a>
              </li>
              <li className="nav-item">
              <a href={`https://thechennaituition.com/privacy-policy`} target="_blank" rel="noopener noreferrer" className="nav-link">
                Privacy Policy
              </a>
              </li>
              <li className="nav-item">
                {/* <Link to={`${process.env.PUBLIC_URL}/pages/terms-policy`} className="nav-link">
                  Help
                </Link> */}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Footer;

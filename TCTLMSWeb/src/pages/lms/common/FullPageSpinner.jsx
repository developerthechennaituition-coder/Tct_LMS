import React from "react";
import { Spinner } from "reactstrap";

const FullPageSpinner = () => {
  return (
    <div className="full-page-spinner">
      <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
    </div>
  );
};

export default FullPageSpinner;
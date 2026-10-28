import React, { useState } from "react";
import Head from "../../layout/head/Head"; 
import Dashboard from "./dashboard/Dashboard";

 
const Index = () => {
  const [sm, updateSm] = useState(false);
  return (
    <React.Fragment>
      <Head title="Homepage"></Head>
      <Dashboard></Dashboard>
    </React.Fragment>
  );
};
export default Index;

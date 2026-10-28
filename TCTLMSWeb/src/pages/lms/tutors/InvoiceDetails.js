import React, { useState, useEffect } from "react";
import {
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  BlockDes,
  BlockHeadContent,
  Block,
  BlockBetween,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import LogoDark from "../../../images/TCTLoginPageLogo.png";
import { Link, useLocation } from "react-router-dom";
import { gettutorinvoicebyid } from "../../../apiservices/ScheduleService";
import { config } from "../../../library/config";

const InvoiceDetails = ({ match }) => {
  const [data, setData] = useState();
  const [user, setUser] = useState();
  const [tutorName, setTutorName] = useState("");
  const [longDate, setLongDate] = useState("");
  const [shortDate, setShortDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const from = queryParams.get("from");
  const invNumber = queryParams.get("invNumber");

  
  const redirectUrl =
    from === "payroll"
      ? `${process.env.PUBLIC_URL}/tct-tutor-payroll-list`
      : from === "opr-list"
      ? `${process.env.PUBLIC_URL}/tct-tutor-opr-list`
      : `${process.env.PUBLIC_URL}/tct-tutor-invoice-list`;
 
  useEffect(() => {
    gettutorinvoicebyid(invNumber)
      .then((response) => {
        setData(response.data);
        setTutorName(response.data[0]?.tutorName || "N/A");
        setLongDate(formatDate(response.data[0].createdDate));
        setShortDate(formatShortDate(response.data[0].createdDate));
        setTotalAmount(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(response.data[0].totalTutorPayment));
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      });
  }, []);

  const formatDate = (date) => {
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  const formatShortDate = (date) => {
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  const formatTime = (date) => {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Ensures 12-hour format with AM/PM
    };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  return (
    <React.Fragment>
      <Head title="Invoice Detail"></Head>
        <Content>
          <BlockHead>
            <BlockBetween className="g-3">
              <BlockHeadContent>
                <BlockTitle>
                  Payslip <strong className="text-primary small">#{invNumber}</strong>
                </BlockTitle>
                <BlockDes className="text-soft">
                  <ul className="list-inline">
                    <li>
                    Created At: <span className="text-base">{longDate}</span>
                    </li>
                  </ul>
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                {/* Back button with dynamic redirect URL */}
                <Link to={redirectUrl}>
                  <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                    <Icon name="arrow-left"></Icon>
                    <span>Back</span>
                  </Button>
                </Link>
                <Link to={redirectUrl}>
                  <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                    <Icon name="arrow-left"></Icon>
                  </Button>
                </Link>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="invoice">
              <div className="invoice-action">
                <a href={`${config.API_URL}/Scheduler/GetTutorPaySlipPdf?invoiceNumber=${invNumber}`} target="_blank" rel="noreferrer">
                  <Button size="lg" color="primary" outline className="btn-icon btn-white btn-dim">
                    <Icon name="printer-fill"></Icon>
                  </Button>
                </a>
              </div>
              <div className="invoice-wrap">
                <div className="invoice-brand text-center">
                  <img src={LogoDark} alt="" />
                </div>
                <div className="invoice-head">
                  <div className="invoice-contact">
                    <span className="overline-title">Invoice To</span>
                    <div className="invoice-contact-info">
                      <h4 className="title">{tutorName}</h4>
                    </div>
                  </div>
                  <div className="invoice-desc">
                    <h3 className="title">Invoice</h3>
                    <ul className="list-plain">
                      <li className="invoice-id">
                        <span>Invoice ID</span>:<span>{invNumber}</span>
                      </li>
                      <li className="invoice-date">
                        <span>Date</span>:<span>{shortDate}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="invoice-bills">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th className="w-300px">Student</th>
                          <th className="w-200px">Grade - Board</th>
                          <th className="w-150px">Subject</th>
                          <th className="w-220px">Schedule Date</th>
                          <th className="w-250px">Schedule Time</th>
                          <th className="w-80px">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data && data.length > 0 ? (
                          data.map((item, index) => (
                            <tr key={index}>
                              <td>{item.studentName} ({item.studentCode})</td>
                              <td>{item.grade} - {item.board}</td>
                              <td>{item.subject}</td>
                              <td>{formatShortDate(item.scheduleDate)}</td>
                              <td>
                                {formatTime(item.scheduleStartTime)} - {formatTime(item.scheduleEndTime)}
                              </td>
                              <td>
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.tutorSubjectPayment)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3"></td>
                          <td colSpan="2">Grand Total</td>
                          <td>{totalAmount}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="nk-notes ff-italic fs-12px text-soft">
                      Invoice was created on a computer and is valid without the signature and seal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Block>
        </Content>
    </React.Fragment>
  );
};
export default InvoiceDetails;

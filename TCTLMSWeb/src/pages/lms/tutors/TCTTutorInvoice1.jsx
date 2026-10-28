import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  ReactDataTable,
  Icon,
  TooltipComponent,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { gettutorpayrolllist} from "../../../apiservices/ScheduleService";
import moment from "moment";
import { Link } from "react-router-dom";
import { Button } from "reactstrap";

const TCTTutorInvoice = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  
  const [userDataSource, setUserDataSource] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [tutorName, setTutorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null); 

  useEffect(() => {
    const tutorId = localStorage.getItem("userId");
    gettutorpayrolllist(tutorId)
      .then((response) => {
        console.log("Response: ", response);
        setUserDataSource(response.data);
        setTutorName(response.data[0]?.tutorName || "N/A");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, [id]);

  
  
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentData = userDataSource.slice(indexOfFirstItem, indexOfLastItem);

  const dtUserColumns = [
    {
      name: "Invoice",
      width:"200px",
      selector: (row) => row.invoiceNumber,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">{row.invoiceNumber}</span>
        </div>
      ),
    },     
    {
      name: "Month",
      width:"180px",
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">{row.scheduleMonthName} - {row.scheduleYear}</span>
        </div>
      ),
    },
    {
      name: "Total Payment",
      width:"150px",
      selector: (row) => row.totalTutorPayment,
      sortable: true,
      grow: 2,
      cell: (row) => (
          <div className="user-info">
              <span className="tb-lead">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(row.totalTutorPayment)}
              </span>
          </div>
      ),
    },
    {
        name: "Status",
        width:"120px",
        selector: (row) => row.totalNoOfClasses,
        grow: 2,
        cell: (row) => (
            <div className="badge">
                    {row.isInvoiceGenerated === false ? (
                    row.approved === row.noOfDaysPresent ? (
                        <p style={{ color: "#1ee0ac" }}>Approved</p>
                    ) : row.approved === 0 ? (
                        <p style={{ color: "#e85347" }}>Pending</p>
                    ) : (
                        <p style={{ color: "#f4bd0e" }}>Partial</p>
                    )
                  ): (
                    <p style={{ color: "#1ee0ac" }}>Payroll Completed</p>
                  )}
            </div>
        ),
      },
    {
      name: "Action",
      width: "120px",
      cell: (row) => (
        <Link to={`${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details?invNumber=${row.invoiceNumber}&from=payroll`}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"edit" + row.invoiceNumber}
            icon="card-view"
            direction="top"
            text="View Invoice"
          />
        </Link>
      ),
    }
      
      ,
  ];

  const RenderGrid = ({ dataSource }) => (
    dataSource.length > 0 ? (
      <ReactDataTable
        data={dataSource}
        columns={dtUserColumns}
        pagination
        className="nk-tb-list"
      />
    ) : (
      <p>No records found for this month</p>
    )
  );

  const handleGenerateInvoice = (tutorId) => {
    setProcessingAction(tutorId); 
    gettutorpayrolllist(tutorId)
        .then((response) => {
            console.log("Invoice generated for tutor:", response.data);
            toast.success("Invoice generated successfully!");
            // Add additional logic, such as displaying or downloading the invoice
        })
        .catch((err) => {
            console.error("Error generating invoice:", err);
            toast.error("Failed to generate invoice. Please try again.");
        })
        .finally(() => {
            setProcessingAction(null); // Reset the processing state
        });
};


  return (
    <React.Fragment>
      <Head title="Tutor"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Tutor Invoice List
              </BlockTitle>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        
        {loading ? (
          <div className="spinner-grow text-success" role="status"></div>
        ) : (
          <Block>
            <RenderGrid dataSource={currentData} />
          </Block>
        )}
      </Content>
      <ToastContainer />
    </React.Fragment>
  );
};

export default TCTTutorInvoice;
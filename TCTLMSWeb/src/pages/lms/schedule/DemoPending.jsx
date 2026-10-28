import React, { useContext, useEffect, useState, useRef } from "react";
import moment from "moment";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  DropdownItem,
  ModalHeader,
  Spinner,
  Row,
  Form,
  Breadcrumb,
  BreadcrumbItem,
} from "reactstrap";
import DatePicker from "react-datepicker";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  PreviewCard,
  Button,
  TooltipComponent,
  RSelect,
  CustomReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getDemoPending } from "../../../apiservices/ScheduleService";

const DemoPendingList = () => {
  const [loading, setLoading] = useState(false);
  const [salesDataSource, setSalesDataSource] = useState([]);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);

  const dtSalesColumns = [
    {
      name: "Sales",
      selector: (row) => row.salesDate,
      cell: (row) => (
        <div className="d-flex flex-column" style={{ lineHeight: '1.4' }}>
          <div className="mb-1">
            <small className="text-muted">Date:</small>{' '}
            <span className="fw-medium">{moment(row.salesDate).format("DD-MMM-YYYY")}</span>
          </div>
          <div className="mb-1">
            <small className="text-muted">Subject:</small>{' '}
            <span className="badge badge-outline-primary">{row.subject}</span>
          </div>          
          <div>
            <small className="text-muted">Created By:</small>{' '}
            <span className="text-soft">{row.salesCreatedBy}</span>
          </div>
        </div>
      ),
      sortable: true,
      minWidth: "200px",
    },
    {
      name: "Student",
      selector: (row) => row.student,
      cell: (row) => (
        <div className="user-info">
          <div className="tb-lead mb-1">{row.student}</div>
          <div className="text-soft small">{row.grade} - {row.board}</div>
        </div>
      ),
      sortable: true,
      minWidth: "180px",
      grow: 1,
    },
    {
      name: "Tutor",
      selector: (row) => row.tutor,
      cell: (row) => (
        <div className="d-flex align-items-center">
          <span className={`badge ${row.tutor === "Not Assigned" ? "badge-warning" : "badge-success"}`}>
            {row.tutor || "Not Assigned"}
          </span>
        </div>
      ),
      sortable: true,
      minWidth: "140px",
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        <div className="d-flex align-items-center">
            <span className={getStatusClass(row.status)}>{row.status}</span>
        </div>
      ),
      sortable: true,
      minWidth: "120px",
    },
    {
      name: "Ownership",
      selector: (row) => row.coordinator,
      cell: (row) => (
        <div className="d-flex flex-column" style={{ lineHeight: '1.4' }}>
          <div className="mb-1">
            <small className="text-muted">Coordinator:</small>{' '}
            <span className="fw-medium">{row.coordinator}</span>
          </div>
          <div>
            <small className="text-muted">Operation:</small>{' '}
            <span className="fw-medium">{row.operation}</span>
          </div>
        </div>
      ),
      sortable: true,
      minWidth: "200px",
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex align-items-center">
          <UncontrolledDropdown>
            <DropdownToggle 
              color="transparent" 
              className="dropdown-toggle btn btn-icon btn-trigger btn-sm"
              style={{ minWidth: 'auto' }}
            >
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu right>
              <ul className="link-list-opt no-bdr">
                <li>
                  <Link
                    onClick={() => {
                      onViewHandler(row.salesId);
                    }}
                  >
                    <Icon name="eye"></Icon>
                    <span>View Details</span>
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={() => {
                      onEditHandler(row.salesId);
                    }}
                  >
                    <Icon name="edit"></Icon>
                    <span>Edit</span>
                  </Link>
                </li>
                {row.tutor === "Not Assigned" && (
                  <li>
                    <Link
                      onClick={() => {
                        onAssignTutorHandler(row.salesId);
                      }}
                    >
                      <Icon name="user-add"></Icon>
                      <span>Assign Tutor</span>
                    </Link>
                  </li>
                )}
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      ),
      minWidth: "80px",
      maxWidth: "80px",
    },
  ];

  const formRef = useRef(null);

  useEffect(() => {
    loadSalesData();
  }, []); // Remove pagination dependencies since we're handling it in CustomReactDataTable

  // Simplified loadSalesData function
  const loadSalesData = () => {
    setLoading(true);
    getDemoPending()
      .then((data) => {
        // Always set the data, even if it's empty or null
        setSalesDataSource(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading demo pending data:", error);
        toast.error("Failed to load data.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
        setSalesDataSource([]); // Set empty array on error
        setLoading(false);
      });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-warning";
      case "completed":
        return "text-success";
      case "cancelled":
        return "text-danger";
      case "in progress":
        return "text-info";
      default:
        return "text-secondary";
    }
  };

  const onViewHandler = (salesId) => {
    // Navigate to sales details view
    console.log("View sales details for ID:", salesId);
  };

  const onEditHandler = (salesId) => {
    // Navigate to edit sales
    console.log("Edit sales for ID:", salesId);
  };

  const onAssignTutorHandler = (salesId) => {
    // Open tutor assignment modal
    console.log("Assign tutor for sales ID:", salesId);
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const RenderGrid = (props) => {
    const searchableFields = ['subject', 'student', 'tutor', 'coordinator', 'operation'];
    return (
      <>
        {loading ? (
          <div className="d-flex justify-content-center p-4">
            <Spinner color="primary" />
          </div>
        ) : (
          <CustomReactDataTable
            data={props.dataSource}
            columns={dtSalesColumns}
            pagination={true} 
            canShowFilter={true} // Enable built-in filtering
            selectableRows={false}
            expandableRows={false}
            actions={true} // Enable export functionality
            searchableFields={searchableFields}
          />
        )}
      </>
    );
  };

  const toggle = () => setonSearch(!onSearch);

  const exportToExcel = () => {
    // TODO: Implement export functionality for sales data
    console.log("Export to Excel clicked");
    toast.info("Export functionality will be implemented soon.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });
  };

  const { errors, register, handleSubmit } = useForm();

  return (
    <>
      <React.Fragment>
        <Head title="Need to schedule List"></Head>
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h5">Need To Schedule List</BlockTitle>
                <BlockDes className="text-soft">
                  <p>Manage and track demo sessions pending assignments.</p>
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>
          <Block>
            {/* REMOVED THE CONDITIONAL RENDERING - Always render the grid */}
            <RenderGrid dataSource={salesDataSource} />
          </Block>
          <ToastContainer />
        </Content>
      </React.Fragment>
    </>
  );
};

export default DemoPendingList;
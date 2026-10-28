import React, { useEffect, useState } from "react";
import moment from "moment";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, Spinner, Modal, ModalBody, ModalHeader } from "reactstrap";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  CustomReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { getScheduleByStatus } from "../../../apiservices/ScheduleService";
import { getScheduleStatusPageBySlug } from "./scheduleStatusPages.config";
import { getLookups } from "../../../apiservices/LookupsService";
import ScheduleActionsPopup from "../common/ScheduleActionsPopup";
import TutorAssignmentPopup from "../common/TutorAssignmentPopup";

const ScheduleStatusList = () => {
  const { slug } = useParams();
  const pageConfig = getScheduleStatusPageBySlug(slug);

  const [loading, setLoading] = useState(false);
  const [salesDataSource, setSalesDataSource] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignTutorModalOpen, setAssignTutorModalOpen] = useState(false);
  const [statusList, setStatusList] = useState([]);

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
                  <Link to="#" onClick={(event) => onViewHandler(event, row)}>
                    <Icon name="eye"></Icon>
                    <span>View Details</span>
                  </Link>
                </li>
                <li>
                  <Link to="#" onClick={(event) => onEditHandler(event, row)}>
                    <Icon name="edit"></Icon>
                    <span>Edit</span>
                  </Link>
                </li>
                {row.tutor === "Not Assigned" && (
                  <li>
                    <Link to="#" onClick={(event) => onAssignTutorHandler(event, row)}>
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

  useEffect(() => {
    if (pageConfig) {
      loadSalesData();
    }
    getLookups("200").then((response) => {
      setStatusList((response || []).filter((item) => item.isActive).map((item) => ({
        value: item.id,
        id: item.id,
        label: item.typeCodeName,
        code: item.typeCodeValue,
      })));
    }).catch(() => setStatusList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadSalesData = () => {
    setLoading(true);
    getScheduleByStatus(pageConfig.statusCodes)
      .then((data) => {
        setSalesDataSource(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error(`Error loading ${pageConfig.title} data:`, error);
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
        setSalesDataSource([]);
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
      case "scheduled":
        return "text-primary";
      default:
        return "text-secondary";
    }
  };

  const actionItem = (row) => ({
    ...row,
    saleDetailsId: row.salesDetailsId,
    stdUserId: row.studentUserId,
    studentName: row.student,
    statusName: row.status,
  });

  const onViewHandler = (event, row) => {
    event.preventDefault();
    setSelectedItem(actionItem(row));
    setViewModalOpen(true);
  };

  const onEditHandler = (event, row) => {
    event.preventDefault();
    setSelectedItem(actionItem(row));
    setEditModalOpen(true);
  };

  const onAssignTutorHandler = (event, row) => {
    event.preventDefault();
    setSelectedItem(actionItem(row));
    setAssignTutorModalOpen(true);
  };

  const closeActionModal = (setter) => {
    setter(false);
    setSelectedItem(null);
    loadSalesData();
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
            canShowFilter={true}
            selectableRows={false}
            expandableRows={false}
            actions={true}
            searchableFields={searchableFields}
          />
        )}
      </>
    );
  };

  if (!pageConfig) {
    return (
      <React.Fragment>
        <Head title="Schedule Status Not Found"></Head>
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h5">Schedule Status Not Found</BlockTitle>
                <BlockDes className="text-soft">
                  <p>No schedule status page is configured for "{slug}".</p>
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>
        </Content>
      </React.Fragment>
    );
  }

  return (
    <>
      <React.Fragment>
        <Head title={pageConfig.title}></Head>
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h5">{pageConfig.title}</BlockTitle>
                <BlockDes className="text-soft">
                  <p>{pageConfig.description}</p>
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>
          <Block>
            <RenderGrid dataSource={salesDataSource} />
          </Block>
          <Modal isOpen={viewModalOpen} toggle={() => closeActionModal(setViewModalOpen)} centered size="lg">
            <ModalHeader toggle={() => closeActionModal(setViewModalOpen)}>Demo Schedule Details</ModalHeader>
            <ModalBody>
              {selectedItem && (
                <div className="row gy-3">
                  <div className="col-md-6"><strong>Student</strong><div>{selectedItem.student || "—"}</div></div>
                  <div className="col-md-6"><strong>Tutor</strong><div>{selectedItem.tutor || "Not Assigned"}</div></div>
                  <div className="col-md-6"><strong>Subject</strong><div>{selectedItem.subject || "—"}</div></div>
                  <div className="col-md-6"><strong>Board / Grade</strong><div>{selectedItem.board || "—"} / {selectedItem.grade || "—"}</div></div>
                  <div className="col-md-6"><strong>Status</strong><div>{selectedItem.status || "—"}</div></div>
                  <div className="col-md-6"><strong>Sales Date</strong><div>{moment(selectedItem.salesDate).format("DD-MMM-YYYY")}</div></div>
                  <div className="col-md-6"><strong>Coordinator</strong><div>{selectedItem.coordinator || "—"}</div></div>
                  <div className="col-md-6"><strong>Operation</strong><div>{selectedItem.operation || "—"}</div></div>
                  <div className="col-md-6"><strong>Created By</strong><div>{selectedItem.salesCreatedBy || "—"}</div></div>
                </div>
              )}
            </ModalBody>
          </Modal>
          {editModalOpen && selectedItem && (
            <ScheduleActionsPopup
              dataItem={selectedItem}
              salesDetails={selectedItem}
              modalOpen={editModalOpen}
              modalStateChange={() => closeActionModal(setEditModalOpen)}
            />
          )}
          {assignTutorModalOpen && selectedItem && (
            <TutorAssignmentPopup
              dataItem={selectedItem}
              salesDetails={selectedItem}
              statusList={statusList}
              modalOpen={assignTutorModalOpen}
              modalStateChange={() => closeActionModal(setAssignTutorModalOpen)}
            />
          )}
          <ToastContainer />
        </Content>
      </React.Fragment>
    </>
  );
};

export default ScheduleStatusList;

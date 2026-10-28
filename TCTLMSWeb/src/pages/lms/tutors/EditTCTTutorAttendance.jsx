import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { Spinner } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  ReactDataTable,
  Icon,
  Button,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { getScheduleByTutorId, approveSchedules, rejectSchedules} from "../../../apiservices/ScheduleService";
import moment from "moment";

const EditTCTTutorAttendance = () => {  
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));

  const [userDataSource, setUserDataSource] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [tutorName, setTutorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    getScheduleByTutorId(id)
      .then((response) => {
        setUserDataSource(response.data);
        setTutorName(response.data[0].tutorName || "N/A");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, [id]);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;

  const getWeekRange = (currentDate) => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const [weekRange, setWeekRange] = useState(getWeekRange(new Date()));

  const goToPreviousWeek = () => {
    setWeekRange((prev) => ({
      start: new Date(prev.start.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(prev.end.getTime() - 7 * 24 * 60 * 60 * 1000),
    }));
  };

  const goToNextWeek = () => {
    setWeekRange((prev) => ({
      start: new Date(prev.start.getTime() + 7 * 24 * 60 * 60 * 1000),
      end: new Date(prev.end.getTime() + 7 * 24 * 60 * 60 * 1000),
    }));
  };

  const filteredData = userDataSource.filter((row) => {
    const rowDate = new Date(row.date);
    return rowDate >= weekRange.start && rowDate <= weekRange.end;
  });

  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    setIsAllSelected(isChecked);
    setSelectedRows(isChecked ? filteredData.map((row) => row.scheduleDetailsId) : []);
  };

  const handleCheckboxChange = (e, row) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedRows((prev) => [...prev, row.scheduleDetailsId]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== row.scheduleDetailsId));
    }
    setIsAllSelected(
      filteredData.length === selectedRows.length + (checked ? 1 : -1)
    );
  };
  const userId = localStorage.getItem('userId');
  const handleApprove = async () => {
    if (!selectedRows.length) {
      toast.error("Please select at least one record to approve.");
      return;
    }
    try {
      setProcessingAction("approve");
      const response = await approveSchedules(selectedRows, userId);
      console.log("Response:", response.succeeded);
      if (response.succeeded) {
        toast.success(response.message);
        setUserDataSource((prev) => prev.filter((row) => !selectedRows.includes(row.scheduleDetailsId)));
        setSelectedRows([]);
        setIsAllSelected(false);
      } else {
        toast.error("Failed to approve schedules");
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Error approving schedules");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRows.length) {
      toast.error("Please select at least one record to reject.");
      return;
    }
    try {
      setProcessingAction("reject");
      const response = await rejectSchedules(selectedRows, userId);
      if (response.succeeded) {
        toast.success(response.message);
        setUserDataSource((prev) => prev.filter((row) => !selectedRows.includes(row.scheduleDetailsId)));
        setSelectedRows([]);
        setIsAllSelected(false);
      } else {
        toast.error("Failed to reject schedules");
      }
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error("Error rejecting schedules");
    } finally {
      setProcessingAction(null);
    }
  };

  const renderActionButtons = () => (
    <Block>
      <Button
        type="button"
        color="success"
        onClick={handleApprove}
        disabled={processingAction === "approve"}
      >
        {processingAction === "approve" ? (
          <>
            <Spinner size="sm" className="mr-1" /> Approving...
          </>
        ) : (
          "Approve"
        )}
      </Button>
      &nbsp;
      <Button
        color="danger"
        onClick={handleReject}
        disabled={processingAction === "reject"}
      >
        {processingAction === "reject" ? (
          <>
            <Spinner size="sm" className="mr-1" /> Rejecting...
          </>
        ) : (
          "Reject"
        )}
      </Button>
    </Block>
  );

  const dtUserColumns = [
    {
      name: (
        <div style={{ paddingLeft: "45px" }}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
          />
        </div>
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedRows.includes(row.scheduleDetailsId)}
          onChange={(e) => handleCheckboxChange(e, row)}
        />
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
    {
      name: "Student Name",
      selector: (row) => row.studentName,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">{row.studentName}</span>
          <span className="tb-lead">{row.grade}</span>
          <span className="tb-lead">{row.board}</span>
          <span className="tb-lead">{row.subject}</span>
        </div>
      ),
    },
    {
      name: "Date & Time",
      selector: (row) => row.date,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">
            {moment(row.date).format('DD-MMM-yyyy')}
            <p>{moment(row.startTime).format("hh:mm A")} - {moment(row.endTime).format("hh:mm A")}</p>
          </span>
        </div>
      ),
    },
    {
      name: "Tutor Schedule Status",
      selector: (row) => row.tutorScheduleStatusName,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">{row.tutorScheduleStatusName}</span>
        </div>
      ),
    },
    {
      name: "Student Schedule Status",
      selector: (row) => row.studentScheduleStatusName,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="user-info">
          <span className="tb-lead">{row.studentScheduleStatusName}</span>
        </div>
      ),
    }
  ];

  const RenderGrid = ({ dataSource }) => (
    <ReactDataTable
      data={dataSource}
      columns={dtUserColumns}
      pagination
      className="nk-tb-list"
    />
  );

  return (
    <React.Fragment>
      <Head title="Tutor"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Tutor Attendance Details
              </BlockTitle>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              width: "100%",
              textAlign: "center",
              padding: "10px",
              backgroundColor: "#E0F7FA",
            }}
          >
            <Icon
              name="back-alt-fill"
              onClick={goToPreviousWeek}
              style={{ cursor: "pointer" }}
            />
            <span>
              {weekRange.start.toDateString()} - {weekRange.end.toDateString()}
            </span>
            <Icon
              name="forward-alt-fill"
              onClick={goToNextWeek}
              style={{ cursor: "pointer" }}
            />
          </div>
        </Block>
        <Block>
          <h6 className="overline-title">Tutor Name:</h6>
          <p id="preview-event-start">{tutorName}</p>
        </Block>

        {/* {currentData.length > 0 && (
          <Block>
            <Button 
              type="submit" 
              color="success"
              onClick={handleApprove}
            >
              Approve
            </Button>
            &nbsp;
            <Button 
              color="danger"
              onClick={handleReject}
            >
              Reject
            </Button>
          </Block>
        )} */}
        {currentData.length > 0 && renderActionButtons()}

        {loading ? (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
            }}
          >
            <div className="spinner-grow text-success" role="status"></div>
          </div>
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

export default EditTCTTutorAttendance;  
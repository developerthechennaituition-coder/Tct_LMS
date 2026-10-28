import React, { useContext, useEffect, useState, forwardRef, useRef } from "react";

import { Modal, ModalBody, ModalHeader } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Col,
  Icon,
  PreviewAltCard,
  BlockDes,
  Row,
  ReactDataTable,
  TooltipComponent,
  Rating,
  RSelect,
} from "../../../components/Component";
import UserAvailableSlotsProgressBar from "../common/UserAvailableSlotsProgressBar";
import TutorAvailabilityModal from "../common/TutorAvailabilityModal";
import { getUserAvailability } from "../../../apiservices/UserService";
import { getTutorSubjects, GetTutorDashboardInfo } from "../../../apiservices/TutorService";
import { CheckCircle, Clock, Star, StarHalf, StarOff, TrendingUp, TrendingDown } from "lucide-react";

const DAY_ORDER = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

// Tutor Info popup sizing/spacing. Every selector is under .tct-tutor-info (this popup's dialog only),
// so other modals and the tab-content version of TutorInfo are unaffected.
const tutorInfoModalStyle = `
  /* Fit the viewport: centred, responsive width, never taller than the window. */
  .tct-tutor-info.modal-dialog { max-width: min(1100px, calc(100vw - 32px)); margin: 16px auto; }
  .tct-tutor-info.modal-dialog-centered { min-height: calc(100% - 32px); }
  .tct-tutor-info .modal-content {
    display: flex; flex-direction: column; max-height: calc(100vh - 32px);
    border: 0; border-radius: 12px; box-shadow: 0 24px 48px rgba(31, 43, 58, 0.18); overflow: hidden;
  }
  /* Header stays put; only the body scrolls. */
  .tct-tutor-info .modal-header { flex-shrink: 0; align-items: center; padding: 14px 20px; border-bottom: 1px solid #e5e9f2; }
  .tct-tutor-info .modal-title { font-size: 1.15rem; font-weight: 700; color: #1c2b46; }
  .tct-tutor-info .modal-header .close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; margin: 0 0 0 auto; padding: 0; border-radius: 8px; opacity: 1; color: #8094ae;
  }
  .tct-tutor-info .modal-header .close:hover { background: #f5f1ff; color: #854fff; }
  .tct-tutor-info .modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 16px 20px 20px; }

  /* Section rows: drop the extra row padding and use one consistent gap between sections. */
  .tct-tutor-info .modal-body > .row { margin: 0 0 14px; padding: 0; }
  .tct-tutor-info .modal-body > .row:last-child { margin-bottom: 0; }
  .tct-tutor-info .modal-body > .row > [class*="col-"] { padding-left: 0; padding-right: 0; }

  /* Summary cards: compact 4 / 2 / 1 column grid. */
  .tct-tutor-info .modal-body > .row:has(> .col-md-3) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .tct-tutor-info .modal-body > .row:has(> .col-md-3) > .col-md-3 { max-width: none; flex: none; width: auto; }
  .tct-tutor-info .modal-body > .row > .col-md-3 > div {
    max-width: none !important; height: 100%; padding: 12px !important;
    border: 1px solid #e5e9f2 !important; border-radius: 10px !important; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.06) !important;
  }
  .tct-tutor-info .modal-body > .row > .col-md-3 > div > div:first-child { margin-bottom: 8px !important; }
  .tct-tutor-info .modal-body > .row > .col-md-3 h6 { margin: 0; }
  .tct-tutor-info .modal-body > .row > .col-md-3 .form-label { margin-bottom: 0; }

  /* Availability + rating side by side (stacked below 768px by the existing col-md-6). */
  .tct-tutor-info .modal-body > .row:has(> .col-md-6) { display: flex; flex-wrap: wrap; gap: 14px; }
  .tct-tutor-info .modal-body > .row:has(> .col-md-6) > .col-md-6 { flex: 1 1 320px; max-width: none; }

  /* Table stays inside the body; horizontal scrolling (if any) stays in the table. */
  .tct-tutor-info .modal-body .dataTables_wrapper { max-width: 100%; overflow-x: auto; }

  @media (max-width: 991.98px) {
    .tct-tutor-info .modal-body > .row:has(> .col-md-3) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 575.98px) {
    .tct-tutor-info.modal-dialog { margin: 8px auto; max-width: calc(100vw - 16px); }
    .tct-tutor-info.modal-dialog-centered { min-height: calc(100% - 16px); }
    .tct-tutor-info .modal-content { max-height: calc(100vh - 16px); }
    .tct-tutor-info .modal-header { padding: 12px 14px; }
    .tct-tutor-info .modal-body { padding: 12px 14px 16px; }
    .tct-tutor-info .modal-body > .row:has(> .col-md-3) { grid-template-columns: minmax(0, 1fr); }
  }
`;

const TutorInfo = (props) => {
  const loggedInUserId = localStorage.getItem("userId");
  const isCoordinatorAdmin = localStorage.getItem("userRole") === "CoordinatorAdmin";
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [tutorAvailableSlots, setTutorAvailableSlots] = useState([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [subjectsDatasource, setSubjectsDatasource] = useState([]);
  const [tutorInfoData, setTutorInfoData] = useState(null);

  useEffect(() => {
    tutorAvailablity(props.tutorUserId);
    GetTutorSubjects(props.tutorId);
    getTutorInfo();
  }, []);

  const getTutorInfo = async () => {
    if (!props.tutorUserId) return;
    try {
      const response = await GetTutorDashboardInfo(props.tutorUserId);
      const dashboard = response?.data ?? response;
      setTutorInfoData(dashboard && typeof dashboard === "object" ? dashboard : {});
    } catch (error) {
      setTutorInfoData({});
    }
  };

  const tutorAvailablity = async (userId) => {
    if (!userId) { setAvailabilityChecked(true); return; }
    try {
      const response = await getUserAvailability(userId);
      if (!Array.isArray(response) || response.length === 0) {
        setTutorAvailableSlots([]);
        setAvailabilityChecked(true);
        props.onAvailabilityLoaded?.(false);
        return;
      }
      const grouped = {};
      response.forEach((item) => {
        const day = item.dayOfWeek;
        if (!day) return;
        if (!grouped[day]) grouped[day] = { day, dayInNo: DAY_ORDER[day] ?? 0, timeSlots: [] };
        const startTime = item.startTime ? item.startTime.slice(11, 19) : "00:00:00";
        const endTime = item.endTime ? item.endTime.slice(11, 19) : "00:00:00";
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        if (sh * 60 + sm < eh * 60 + em) grouped[day].timeSlots.push({ startTime, endTime, isAllocated: false });
      });
      const validDays = Object.values(grouped).filter((d) => d.timeSlots.length > 0);
      setTutorAvailableSlots(validDays.sort((a, b) => a.dayInNo - b.dayInNo));
      props.onAvailabilityLoaded?.(validDays.length > 0);
    } catch (e) {
      setTutorAvailableSlots([]);
      props.onAvailabilityLoaded?.(false);
    } finally {
      setAvailabilityChecked(true);
    }
  };

  const GetTutorSubjects = async (tutorId) => {
    if (!tutorId) {
      setSubjectsDatasource([]);
      return;
    }
    try {
      const response = await getTutorSubjects(tutorId);
      const subjects = response?.data ?? response;
      setSubjectsDatasource(Array.isArray(subjects) ? subjects : []);
    } catch (error) {
      setSubjectsDatasource([]);
    }
  };

  const dtColumns = [
    {
      name: "Board",
      minWidth: "150px",
      maxWidth: "150px",
      selector: (row) => row.boardName,
      sortable: true,
      cell: (row) => <span>{row.boardName}</span>,
    },
    {
      name: "Grade",
      selector: (row) => row.gradeName,
      minWidth: "50px",
      maxWidth: "100px",
      cell: (row) => <span className="tb-amount">{row.gradeName}</span>,
      sortable: true,
    },
    {
      name: "Subject",
      selector: (row) => row.subjectName,
      sortable: true,
      hide: "sm",
      cell: (row) => <span>{row.subjectName}</span>,
    },
    {
      name: "Payment",
      selector: (row) => row.tutorPayment,
      sortable: true,
      hide: "sm",
      cell: (row) => <span>{row.tutorPayment}</span>,
    },
    {
      name: "Students",
      selector: (row) => row.studentCount,
      sortable: true,
      hide: "sm",
      cell: (row) => <span>{row.studentCount}</span>,
    },
  ];

  const getDropoutColor = (count, maxCount) => {
    if (count >= maxCount) {
      return {
        text: "#c2410c",
        border: "#fb923c",
        icon: <TrendingUp style={{ color: "#ea580c", width: 20, height: 20 }} />,
        total: "#ea580c",
        occupied: "#9a3412",
        button: {
          backgroundColor: "#ffedd5",
          hover: "#fed7aa",
          textColor: "#9a3412",
          borderColor: "#fb923c",
        },
      };
    } else {
      return {
        text: "#15803d",
        border: "#86efac",
        icon: <TrendingDown style={{ color: "#16a34a", width: 20, height: 20 }} />,
        total: "#16a34a",
        occupied: "#166534",
        button: {
          backgroundColor: "#dcfce7",
          hover: "#bbf7d0",
          textColor: "#166534",
          borderColor: "#86efac",
        },
      };
    }
  };

  const getEngagementColor = (percentage) => {
    if (percentage >= 75)
      return {
        text: "#c2410c",
        border: "#fb923c",
        icon: <TrendingUp style={{ color: "#ea580c", width: 20, height: 20 }} />,
        total: "#ea580c",
        occupied: "#9a3412",
        button: {
          backgroundColor: "#ffedd5",
          hover: "#fed7aa",
          textColor: "#9a3412",
          borderColor: "#fb923c",
        },
      };
    if (percentage >= 40)
      return {
        text: "#b45309",
        border: "#fbbf24",
        icon: <Clock style={{ color: "#f59e0b", width: 20, height: 20 }} />,
        total: "#f59e0b",
        occupied: "#78350f",
        button: {
          backgroundColor: "#fef3c7",
          hover: "#fde68a",
          textColor: "#78350f",
          borderColor: "#fbbf24",
        },
      };
    return {
      text: "#15803d",
      border: "#86efac",
      icon: <TrendingDown style={{ color: "#16a34a", width: 20, height: 20 }} />,
      total: "#16a34a",
      occupied: "#166534",
      button: {
        backgroundColor: "#dcfce7",
        hover: "#bbf7d0",
        textColor: "#166534",
        borderColor: "#86efac",
      },
    };
  };

  const RatingSummaryCard = ({ totalRatings = 5, averageRating = 4.33 }) => {
    const numericAverageRating = Math.min(5, Math.max(0, Number(averageRating) || 0));
    const renderStars = () => {
      const stars = [];
      const fullStars = Math.floor(numericAverageRating);
      const halfStar = numericAverageRating % 1 >= 0.25 && numericAverageRating % 1 < 0.75;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

      for (let i = 0; i < fullStars; i++) {
        stars.push(
          <li key={`full-${i}`} style={{ color: "#f59e0b" }}>
            <Star fill="#f59e0b" size={18} />
          </li>,
        );
      }

      if (halfStar) {
        stars.push(
          <li key="half" style={{ color: "#f59e0b" }}>
            <StarHalf fill="#f59e0b" size={18} />
          </li>,
        );
      }

      for (let i = 0; i < emptyStars; i++) {
        stars.push(
          <li key={`empty-${i}`} style={{ color: "#e5e7eb" }}>
            <StarOff size={18} />
          </li>,
        );
      }

      return stars;
    };

    return (
      <>
        <PreviewAltCard>
          <div className="d-flex align-center gy-3">
            <div className="progress-amount mr-4">
              <h5 className="title">{numericAverageRating.toFixed(1)}</h5>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "4px", marginBottom: "8px" }}>
                {renderStars()}
              </ul>
              <span className="sub-text mt-1">
                <Icon name="users-fill"></Icon> {totalRatings} Total
              </span>
            </div>
          </div>
        </PreviewAltCard>
      </>
    );
  };

  const StudentDropoutCard = ({ dropoutByTutor, overAllDropouts }) => {
    // const percentage = totalHours > 0 ? Math.round((occupiedHours / totalHours) * 100) : 0;
    const colorStyle = getDropoutColor(dropoutByTutor, 10);
    const overallColor = getDropoutColor(overAllDropouts, 10);

    return (
      <div
        style={{
          maxWidth: "360px",
          borderRadius: "5px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          padding: "10px",
          border: "2px solid #e5e7eb",
          transition: "transform 0.3s",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h6
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              Dropout Ratio
            </h6>
            {colorStyle.icon}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Dropout by Tutor:</label>
            <label className="form-label" style={{ color: colorStyle.total }}>
              {dropoutByTutor}
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Overall Dropouts:</label>
            <label className="form-label" style={{ color: overallColor.occupied }}>
              {overAllDropouts}
            </label>
          </div>

          <div
            style={{
              marginTop: "12px",
              border: `1px solid ${colorStyle.border}`,
              borderRadius: "4px",
              padding: "6px 16px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "14px",
              color: colorStyle.text,
              backgroundColor: "#ffffff",
            }}
          >
            Low Risk
          </div>
        </div>
      </div>
    );
  };

  const StudentCancelationCard = ({ cancelledClasses, totalClasses }) => {
    const numericCancelledClasses = Math.max(0, Number(cancelledClasses) || 0);
    const numericTotalClasses = Math.max(0, Number(totalClasses) || 0);
    const risk = numericTotalClasses ? (numericCancelledClasses / numericTotalClasses) * 100 : 0;
    const colorStyle = getDropoutColor(40, risk);
    const overallColor = getDropoutColor(numericCancelledClasses, 40);

    let riskLabel = "Low Risk";
    if (risk >= 20) riskLabel = "High Risk";
    else if (risk >= 10) riskLabel = "Medium Risk";
    else riskLabel = "Low Risk";
    const riskPercentage = risk.toFixed(2) + "%";
    return (
      <div
        style={{
          maxWidth: "360px",
          borderRadius: "5px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          padding: "10px",
          border: "2px solid #e5e7eb",
          transition: "transform 0.3s",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h6
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              Cancellation Ratio
            </h6>
            {colorStyle.icon}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Cancelled Classes:</label>
            <label className="form-label" style={{ color: overallColor.occupied }}>
              {cancelledClasses}
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Total Classes:</label>
            <label className="form-label" style={{ color: colorStyle.total }}>
              {totalClasses}
            </label>
          </div>
          <div
            style={{
              marginTop: "12px",
              border: `1px solid ${colorStyle.border}`,
              borderRadius: "4px",
              padding: "6px 16px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "14px",
              color: colorStyle.text,
              backgroundColor: "#ffffff",
            }}
          >
            {riskPercentage}
          </div>
        </div>
      </div>
    );
  };

  const StudentSummaryCard = ({ activeStudentCount, overallCount }) => {
    // const percentage = totalHours > 0 ? Math.round((occupiedHours / totalHours) * 100) : 0;
    const colorStyle = getDropoutColor(activeStudentCount, 10);
    const overallColor = getDropoutColor(overallCount, 10);

    return (
      <div
        style={{
          maxWidth: "360px",
          borderRadius: "5px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          padding: "10px",
          border: "2px solid #e5e7eb",
          transition: "transform 0.3s",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h6
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              Student Summary
            </h6>
            {colorStyle.icon}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Active Students:</label>
            <label className="form-label" style={{ color: colorStyle.total }}>
              {activeStudentCount}
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Overall student count:</label>
            <label className="form-label" style={{ color: overallColor.occupied }}>
              {overallCount}
            </label>
          </div>

          <div
            style={{
              marginTop: "12px",
              border: `1px solid ${colorStyle.border}`,
              borderRadius: "4px",
              padding: "6px 16px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "14px",
              color: colorStyle.text,
              backgroundColor: "#ffffff",
            }}
          >
            View Details
          </div>
        </div>
      </div>
    );
  };

  const TutorEngagementCard = ({ tutorName, totalHours = 0, occupiedHours = 0 }) => {
    totalHours = Math.max(0, Number(totalHours) || 0);
    occupiedHours = Math.max(0, Number(occupiedHours) || 0);
    const percentage = totalHours > 0 ? Math.round((occupiedHours / totalHours) * 100) : 0;
    const colorStyle = getEngagementColor(percentage);

    return (
      <div
        style={{
          maxWidth: "360px",
          borderRadius: "5px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          padding: "10px",
          border: "2px solid #e5e7eb",
          transition: "transform 0.3s",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h6
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontWeight: 500,
                letterSpacing: "0.05em",
                // textTransform: "uppercase",
              }}
            >
              Engagement
            </h6>
            {colorStyle.icon}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Available Hrs:</label>
            {/* <span style={{ color: colorStyle.total }}>{totalHours} hrs</span> */}
            <label className="form-label" style={{ color: colorStyle.total }}>
              {totalHours.toFixed(2)} hrs
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500 }}>
            <label className="form-label">Occupied Hours:</label>
            <label className="form-label" style={{ color: colorStyle.occupied }}>
              {occupiedHours.toFixed(2)} hrs
            </label>
            {/* <span style={{ color: colorStyle.occupied }}>{occupiedHours} hrs</span> */}
          </div>

          <div
            style={{
              marginTop: "12px",
              border: `1px solid ${colorStyle.border}`,
              borderRadius: "4px",
              padding: "6px 16px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "14px",
              color: colorStyle.text,
              backgroundColor: "#ffffff",
            }}
          >
            Engagement: {percentage}%
          </div>
        </div>
      </div>
    );
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable pagination={false} data={Array.isArray(props.dataSource) ? props.dataSource : []} columns={dtColumns} className="nk-tb-list" />
      </>
    );
  };

  const RenderContent = () => {
    return (
      <>
        {tutorInfoData && (
          <>
            <Row className="col-md-12 pb-3">
              <Col md="3">
                <StudentSummaryCard
                  tutorName="Kalaivani Sambath"
                  activeStudentCount={tutorInfoData?.totalActiveStudents}
                  overallCount={tutorInfoData?.totalAllocatedByTCT}
                ></StudentSummaryCard>
              </Col>
              <Col md="3">
                <TutorEngagementCard
                  tutorName="Kalaivani Sambath"
                  totalHours={tutorInfoData?.engagement?.totalAvailableHours}
                  occupiedHours={tutorInfoData?.engagement?.totalOccupiedHours}
                ></TutorEngagementCard>
              </Col>
              <Col md="3">
                <StudentDropoutCard
                  tutorName="Kalaivani Sambath"
                  dropoutByTutor={tutorInfoData?.totalDropoutStudents}
                  overAllDropouts={tutorInfoData?.overallDropoutStudents}
                ></StudentDropoutCard>
              </Col>
              <Col md="3">
                <StudentCancelationCard
                  tutorName="Kalaivani Sambath"
                  cancelledClasses={tutorInfoData?.tutorTotalCancelledClasses}
                  totalClasses={tutorInfoData?.tutorTotalClasses}
                ></StudentCancelationCard>
              </Col>
            </Row>
          </>
        )}
        <Row className="col-md-12">
          <Col md="6">
            {availabilityChecked && tutorAvailableSlots.length > 0 && (
              <>
                <UserAvailableSlotsProgressBar
                  type="tutor"
                  dataSource={tutorAvailableSlots}
                />
                {!isCoordinatorAdmin && (
                  <div className="text-right mt-1">
                    <span
                      style={{ cursor: "pointer", color: "#6576ff", fontSize: "12px" }}
                      onClick={() => setAvailabilityModalOpen(true)}
                    >
                      <Icon name="edit" /> Edit Availability
                    </span>
                  </div>
                )}
              </>
            )}
            {availabilityChecked && tutorAvailableSlots.length === 0 && (
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center"
                style={{ height: "160px", border: "1px dashed #d1d5db", borderRadius: "8px", backgroundColor: "#f9fafb" }}
              >
                <Icon name="calendar-alt" style={{ fontSize: "28px", color: "#9ca3af" }} />
                <p className="text-muted mt-2 mb-2" style={{ fontSize: "13px" }}>
                  No availability set for this tutor.
                </p>
                {!isCoordinatorAdmin && (
                  <Button color="primary" size="sm" onClick={() => setAvailabilityModalOpen(true)}>
                    Add Availability
                  </Button>
                )}
              </div>
            )}
          </Col>
          <Col md="6">
            <RatingSummaryCard
              totalRatings={tutorInfoData?.ratingSummary?.totalRatings}
              averageRating={tutorInfoData?.ratingSummary?.averageRating}
            ></RatingSummaryCard>
          </Col>
        </Row>
        <Row className="col-md-12">
          <Col md="12">
            {subjectsDatasource.length > 0 && (
              <>
                <RenderGrid dataSource={subjectsDatasource}></RenderGrid>
              </>
            )}
          </Col>
        </Row>
      </>
    );
  };

  return (
    <>
      {availabilityModalOpen && (
        <TutorAvailabilityModal
          isOpen={availabilityModalOpen}
          userId={props.tutorUserId}
          loggedInUserId={loggedInUserId}
          onClose={() => setAvailabilityModalOpen(false)}
          onSaved={() => {
            setAvailabilityModalOpen(false);
            setAvailabilityChecked(false);
            setTutorAvailableSlots([]);
            setTimeout(() => tutorAvailablity(props.tutorUserId), 0);
          }}
        />
      )}
      {props.isTabContent == true ? (
        <RenderContent></RenderContent>
      ) : (
        <>
          {isModalOpen && <style>{tutorInfoModalStyle}</style>}
          <Modal
            key={"tutorModal1"}
            isOpen={isModalOpen}
            toggle={() => {
              setIsModalOpen(false);
              props?.tutorInfoModalHandler(false);
            }}
            className="modal-dialog-centered custom-modal tct-tutor-info"
            size="xl"
          >
            <ModalHeader
              close={
                <button
                  className="close"
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={() => {
                    setIsModalOpen(false);
                    props?.tutorInfoModalHandler(false);
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            >
              Tutor Info
            </ModalHeader>
            <ModalBody>
              <RenderContent></RenderContent>
            </ModalBody>
          </Modal>
        </>
      )}
    </>
  );
};

export default TutorInfo;

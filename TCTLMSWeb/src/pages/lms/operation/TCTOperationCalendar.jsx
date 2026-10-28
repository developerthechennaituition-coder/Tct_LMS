import { React, useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { Link } from "react-router-dom";
import "react-phone-number-input/style.css";

import { Block, Col, PreviewAltCard, Row } from "../../../components/Component";

import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useSelector } from "react-redux";
import { scheduleStatusConfig } from "../../../utils/Utils";
import Icon from "../../../components/icon/Icon";
import { toast } from "react-toastify";
import { getOperationstatuscount, getScheduledStudentList } from "../../../apiservices/ScheduleService";
import CompletedClassScheduleReport from "../schedule/ApproveClassAttendanceList";
import moment from "moment";
const TCTOperationCalendar = () => {
  const selectedDate = useSelector((state) => state.calendar.selectedDate);
  const previousDateRef = useRef("");
  const topSectionRef = useRef(null);
  const gridRef = useRef(null);
  const [summaryData, setSummaryData] = useState([]);
  const [summaryCount, setSummaryCount] = useState(0);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [gridData, setGridData] = useState([]);
  const operationId = localStorage.getItem("userId");
  const [input, setInput] = useState({
    fromDate: moment(fromDate).format("YYYY-MM-DDTHH:mm:ss"),
    toDate: moment(toDate).format("YYYY-MM-DDTHH:mm:ss"),
  });

  useEffect(() => {
    if (!selectedDate) return;
    if (previousDateRef.current === selectedDate.dateStr) {
      return;
    }
    previousDateRef.current = selectedDate.dateStr;
    console.log("Selected date:", selectedDate.dateStr);
  }, [selectedDate]);

  useEffect(() => {
    const input = {
      fromDate: moment(fromDate).format("YYYY-MM-DDTHH:mm:ss"),
      toDate: moment(toDate).format("YYYY-MM-DDTHH:mm:ss"),
    };
    getStatusCount(input.fromDate, input.toDate);
  }, []);

  useEffect(() => {
    const _input = {
      fromDate: moment(fromDate).format("YYYY-MM-DDTHH:mm:ss"),
      toDate: moment(toDate).format("YYYY-MM-DDTHH:mm:ss"),
    };

    setInput(_input);

    getStatusCount(_input.fromDate, _input.toDate);
  }, [fromDate, toDate]);

  const getStatusCount = async (_fromDate, _toDate) => {
    try {
      const response = await getOperationstatuscount(_fromDate, _toDate, localStorage.getItem("userId"));
      setSummaryCount(response.totalCount);
      setSummaryData(response?.statusSummary || []);
    } catch (error) {
      console.error(error);
      toast.error(`Error loading report`);
    }
  };

  const loadGridData = async (statusId) => {
    try {
      setSelectedStatus(null);

      setTimeout(() => {
        setSelectedStatus(statusId);
      }, 0);

      setTimeout(() => {
        gridRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch (error) {
      toast.error("Error loading details");
    }
  };

  const handleBackToSummary = () => {
    setSelectedStatus(null);
    setTimeout(() => {
      topSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <>
      <Head title="Operations Class Management" />
      <Content>
        <Block>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
            <div>
              <h4
                style={{
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                Operations Class Management
              </h4>

              <span
                className="text-soft"
                style={{
                  fontSize: "13px",
                }}
              >
                Monitor all class schedules and statuses
              </span>
            </div>
            <div className="row g-3 align-items-end">
              <div className="col-auto">
                <label className="form-label mb-1" style={{ fontSize: "12px", fontWeight: 600 }}>
                  From Date
                </label>
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => {
                    setFromDate(date);
                    // if (date && toDate) {
                    //   getStatusCount(date, toDate);
                    // }
                  }}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  maxDate={toDate}
                />
              </div>

              <div className="col-auto">
                <label
                  className="form-label mb-1"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  To Date
                </label>
                <DatePicker
                  selected={toDate}
                  onChange={(date) => {
                    setToDate(date);
                    // if (fromDate && date) {
                    //   getStatusCount(fromDate, date);
                    // }
                  }}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                  minDate={fromDate}
                />
              </div>
              <div className="col-auto">
                <Link to={`${process.env.PUBLIC_URL}/lms/operation/view-calendar`} className="btn btn-primary">
                  <Icon name="calendar" />
                  <span>View Calendar</span>
                </Link>
              </div>
            </div>
          </div>
          <div ref={topSectionRef}>
            <PreviewAltCard>
              <Row className="g-gs">
                {summaryData?.map((item) => {
                  const localConfig = scheduleStatusConfig.find((x) => x.typeCodeValue == item.value);

                  return (
                    <Col sm="6" lg="4" xxl="3" key={item.statusId}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => loadGridData(item.statusId)}
                        style={{
                          cursor: "pointer",
                          borderRadius: "14px",
                          border:
                            selectedStatus === item.statusId
                              ? `1px solid var(--bs-${localConfig?.color || "primary"})`
                              : "1px solid #ebeef2",
                          transition: "all .25s ease",
                        }}
                      >
                        <div
                          style={{
                            padding: "16px",
                            background: "#fff",
                            borderRadius: "14px",
                            boxShadow: "0 1px 6px rgba(15,34,58,.05)",
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            {/* LEFT */}
                            <div className="d-flex align-items-center flex-grow-1">
                              {/* ICON */}
                              <div
                                className={`bg-${localConfig?.color || "primary"}-dim`}
                                style={{
                                  width: "42px",
                                  height: "42px",
                                  minWidth: "42px",
                                  borderRadius: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: "12px",
                                }}
                              >
                                <Icon
                                  name={localConfig?.icon || "layers-fill"}
                                  className={`text-${localConfig?.color || "primary"}`}
                                  style={{
                                    fontSize: "18px",
                                  }}
                                />
                              </div>

                              {/* CONTENT */}
                              <div
                                style={{
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    lineHeight: "18px",
                                  }}
                                >
                                  {item.statusName}
                                </div>

                                <div className="d-flex align-items-center mt-2">
                                  <span
                                    className={`badge bg-${localConfig?.color || "primary"}`}
                                    style={{
                                      fontSize: "11px",
                                      padding: "5px 10px",
                                      borderRadius: "8px",
                                    }}
                                  >
                                    {item.count}
                                  </span>

                                  <span
                                    className={`text-${localConfig?.color || "primary"} ml-2`}
                                    style={{
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    View Details
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT */}
                            <Icon
                              name="arrow-right"
                              className={`text-${localConfig?.color || "primary"}`}
                              style={{
                                fontSize: "16px",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
              {selectedStatus && (
                <div ref={gridRef} style={{ marginTop: "10px", animation: "fadeIn .5s ease" }}>
                  <div
                    className="d-flex justify-content-between align-items-center sticky-top"
                    style={{ background: "#fff", zIndex: 10 }}
                  >
                    <div>
                      <h5 style={{ fontWeight: 700 }}> Schedule Details</h5>
                    </div>
                    <button
                      className="btn btn-outline-primary d-flex align-items-center"
                      onClick={handleBackToSummary}
                      style={{
                        borderRadius: "10px",
                        fontWeight: 600,
                      }}
                    >
                      <Icon name="arrow-left" />
                      <span className="ml-1">Back</span>
                    </button>
                  </div>
                  {selectedStatus && (
                    <CompletedClassScheduleReport
                      key={`${selectedStatus}-${input.fromDate}-${input.toDate}`}
                      operationId={operationId}
                      operationStatus={selectedStatus}
                      fromDate={input.fromDate}
                      toDate={input.toDate}
                      canShowFilter={true}
                      canShowHeader={true}
                    />
                  )}
                </div>
              )}
            </PreviewAltCard>
          </div>
        </Block>
      </Content>

      {/* ANIMATION */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
};

export default TCTOperationCalendar;

import React, { useState } from "react";
import { Progress, UncontrolledTooltip, Row, FormGroup } from "reactstrap";
import {
  Block,
  ReactDataTable,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  Icon,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";

const UserAvailableSlotsProgressBar = (props) => {
  const [dataItems, setDataItems] = useState(props.dataSource);
  const slots = [
    { day: "Monday", startHour: 6.3, endHour: 18, IsScheduled: false },
    { day: "Monday", startHour: 9, endHour: 11, IsScheduled: true },
    { day: "Monday", startHour: 19, endHour: 24, IsScheduled: false },
    { day: "Tuesday", startHour: 9, endHour: 17, IsScheduled: false },
    { day: "Tuesday", startHour: 18, endHour: 23, IsScheduled: false },
    { day: "Wednesday", startHour: 10, endHour: 22, IsScheduled: false },
  ];

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) {
      acc[slot.day] = [];
    }
    acc[slot.day].push(slot);
    return acc;
  }, {});

  // Generate time markers for 0 to 24 hours
  const timeMarkers = Array.from({ length: 25 }, (_, i) => `${i}h`);

  // Convert time to minutes from start of the day
  const timeSpanToMinutes = (time) => {
    let [hours, minutes] = time.match(/\d+/g).map(Number);
    if (/AM|PM/.test(time)) {
      const isPM = time.includes("PM");
      if (isPM && hours !== 12) hours += 12; // Convert PM times (except 12 PM)
      if (!isPM && hours === 12) hours = 0; // Convert 12 AM to 0 hours
    }
    return hours * 60 + minutes;
  };

  const to24HourFormat = (time) => {
    let [hours, minutes] = time.match(/\d+/g).map(Number);
    if (time.includes("PM") && hours !== 12) hours += 12;
    if (time.includes("AM") && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const to12HourFormat11 = (time) => {
    if (typeof time !== "string" || !time.trim()) return "--:--";

    const parts = time.match(/\d+/g);
    if (!parts || parts.length < 2) return "--:--";

    let hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "--:--";

    const normalizedTime = time.toUpperCase();
    if (normalizedTime.includes("PM") && hours !== 12) hours += 12;
    if (normalizedTime.includes("AM") && hours === 12) hours = 0;

    const period = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <>
      {/* Slots */}
      {props.dataSource?.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "8px" }}>
          <Row className="col-md-12" key={"t" + item.day}>
            <Col md="3">
              <FormGroup className="pr-2">
                <label className="pr-2"> {item.day} </label>
              </FormGroup>
            </Col>
            <div className="col-md-9 sss" style={{ margin: "10px auto" }}>
              <div
                style={{ height: "9px", position: "relative", backgroundColor: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}
              >
                {item.timeSlots?.map((slot, index) => {
                  const slotStart = timeSpanToMinutes(slot.startTime) / 60;
                  const slotEnd = timeSpanToMinutes(slot.endTime) / 60;
                  const startPercent = (slotStart / 24) * 100;
                  const endPercent = (slotEnd / 24) * 100;
                  const width = Math.max(endPercent - startPercent, 1);
                  const tooltipId = `tooltip_${props.type}_${item?.day}_${index}`;
                  return (
                    <React.Fragment key={index}>
                      <div
                        id={tooltipId}
                        style={{
                          left: `${startPercent}%`,
                          width: `${width}%`,
                          height: "9px",
                          position: "absolute",
                          backgroundColor: slot.isAllocated ? "#f97316" : "#14b8a6",
                        }}
                      >
                        <UncontrolledTooltip placement="top" target={tooltipId}>
                          {to24HourFormat(slot.startTime)} - {to24HourFormat(slot.endTime)} (
                          {!slot.isAllocated ? "Available" : "Allocated"})
                        </UncontrolledTooltip>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "3px" }}>
                {item.timeSlots?.map((slot, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: "10px",
                      color: slot.isAllocated ? "#f97316" : "#0d9488",
                      backgroundColor: slot.isAllocated ? "#fff7ed" : "#f0fdfa",
                      border: `1px solid ${slot.isAllocated ? "#fed7aa" : "#99f6e4"}`,
                      borderRadius: "4px",
                      padding: "1px 5px",
                    }}
                  >
                    {to12HourFormat11(slot.startTime)} – {to12HourFormat11(slot.endTime)}
                  </span>
                ))}
              </div>
            </div>
          </Row>
        </div>
      ))}
    </>
  );
};

export default UserAvailableSlotsProgressBar;

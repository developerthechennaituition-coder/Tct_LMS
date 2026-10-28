import React, { useState } from "react";
import { Progress, UncontrolledTooltip } from "reactstrap";
// import "bootstrap/dist/css/bootstrap.min.css"; // Ensure Bootstrap is included

const TimeSlotProgress = (props) => {
  const [timeSlots, setTimeSlots] = useState(props.Slots);
  //   const timeSlots = [
  //     { start: "09:00 AM", end: "10:30 AM", isAvailable: false, color: "danger" },
  //     { start: "10:30 AM", end: "11:00 AM", isAvailable: true, color: "success" },
  //     { start: "11:00 AM", end: "11:30 AM", isAvailable: false, color: "danger" },
  //     { start: "11:30 AM", end: "02:00 PM", isAvailable: true, color: "success" },
  //   ];

  const formatTime123 = (value) => {
    const hours24 = Math.floor(value / 60);
    const minutes = Math.round(value % 60); // Round minutes to avoid decimals
    const ampm = hours24 >= 12 ? "PM" : "AM";
    let hours12 = hours24 % 12;
    hours12 = hours12 === 0 ? 12 : hours12; // Convert 0 to 12 for AM/PM format

    return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Convert time to minutes from start of the day
  const timeToMinutes = (time) => {
    let [hours, minutes] = time.match(/\d+/g).map(Number);
    if (/AM|PM/.test(time)) {
      const isPM = time.includes("PM");
      if (isPM && hours !== 12) hours += 12; // Convert PM times (except 12 PM)
      if (!isPM && hours === 12) hours = 0; // Convert 12 AM to 0 hours
    }
    return hours * 60 + minutes;
  };

  const to12HourFormat = (time) => {
    let [hours, minutes] = time.match(/\d+/g).map(Number);
    if (time.includes("AM") || time.includes("PM")) {
      return time; // Already in 12-hour format
    }
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
    return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const startOfDay = timeToMinutes("00:00"); // Set starting reference
  const endOfDay = timeToMinutes("23:30"); // Set ending reference
  const totalMinutes = endOfDay - startOfDay;

  return (
    <div style={{ width: "100%", margin: "10px auto" }}>
      {timeSlots && (
        <>
          <Progress multi key={props.component_key}>
            {timeSlots.map((slot, index) => {
              const slotStart = timeToMinutes(slot.startTime);
              const slotEnd = timeToMinutes(slot.endTime);
              const widthPercentage = ((slotEnd - slotStart) / totalMinutes) * 100;
              const tooltipId = `tooltip-${props.component_key}_${index}`;

              return (
                <Progress
                  key={"bar" + index}
                  bar
                  onClick={() => {
                    props.onProgressbarClickCallback();
                  }}
                  color={slot.color}
                  value={widthPercentage}
                  id={tooltipId} // Tooltip target
                >
                  {/* {slot.start} - {slot.end} */}
                  <UncontrolledTooltip placement="top" target={tooltipId}>
                    {to12HourFormat(slot.startTime)} - {to12HourFormat(slot.endTime)} (
                    {!slot.isAllocated ? "Available" : "Allocated"})
                  </UncontrolledTooltip>
                </Progress>
              );
            })}
          </Progress>
        </>
      )}
    </div>
  );
};

export default TimeSlotProgress;

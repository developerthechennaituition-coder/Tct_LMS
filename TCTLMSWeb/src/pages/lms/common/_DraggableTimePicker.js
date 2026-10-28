import React, { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import Nouislider from "nouislider-react";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  DropdownItem,
  Form,
  Row,
  Input,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
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

const _DragTimeRangePicker = (props) => {
  const [values, setValues] = useState([props.minTime, props.maxTime]); // Configurable start and end times
  const [selectedTime, setSelectedTime] = useState();
  // const MIN = 0; // 00:00 in minutes
  // const MAX = 1440; // 24:00 in minutes
  useEffect(() => {
    setSelectedTime(`${formatTime(props.minTime)}-${formatTime(props.maxTime)}`);
  }, []);
  const MIN = props.minTime; // 00:00 in minutes
  const MAX = props.maxTime; // 24:00 in minutes

  const formatTime11 = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHour = (hours % 12 || 12).toString().padStart(2, "0");
    const formattedMinutes = mins.toString().padStart(2, "0");
    return `${formattedHour}:${formattedMinutes} ${ampm}`;
  };

  const formatTime = (value) => {
    const hours24 = Math.floor(value / 60) % 24;
    const minutes = Math.round(value % 60); // Round minutes to avoid decimals
    return `${hours24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleSliderChange = (value, day) => {
    setSelectedTime(`${formatTime(value[0])}-${formatTime(value[1])}`);
    if (typeof props.sliderChangeCallback == "function") {
      setTimeout(() => {
        props.sliderChangeCallback(value, day);
      }, 10);
    }
  };
  // component_key={"slots" + index}
  //                           minTime={elem.startMinutes}
  //                           maxTime={elem.endMinutes}
  //                           dayOfWeek={elem.dayofWeek}
  return (
    <div className="border border-primary rounded mb-1">
      <table style={{ width: "100%", marginBottom: "10px" }}>
        <tr>
          <td style={{ width: "10%" }} className="pt-3 pl-3">
            <label className="form-label"> {props.dayOfWeek}</label>
          </td>
          <td style={{ width: "10%" }} className="pt-3">
            <label style={{ width: "100px" }} className="form-label">
              {formatTime(props.minTime)}
            </label>
          </td>
          <td style={{ width: "60%" }} className="pt-1 pr-3">
            <div className="form-group">
              <label className="form-label" style={{ width: "100%", textAlign: "center" }}>
                {selectedTime}
              </label>
              <div className="form-control-wrap">
                {/* <Nouislider
                  start={[10, 15, 30, 45, 100]}
                  connect={[false, true, false, true, false, false]} // Make all sections connected
                  range={{ min: 0, max: 100 }}
                /> */}
                {/* <Nouislider
                  className="form-range-slider"
                  accessibility
                  tooltips={[
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                  ]}
                  onChange={(value) => {
                    handleSliderChange(value, props.dayOfWeek);
                  }}
                  step={15}
                  start={[360, 460, 600, 720, 780]}
                  connect={[false, false, false, true, false, true]} // Adjusted length
                  range={{
                    min: props.minTime,
                    max: props.maxTime,
                  }}
                /> */}
                {/* <Nouislider
                  className="form-range-slider"
                  accessibility
                  tooltips={[
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                    { to: formatTime },
                  ]}
                  onChange={(value) => {
                    handleSliderChange(value, props.dayOfWeek);
                  }}
                  step={15}
                  start={[360, 460, 600, 720, 780]}
                  connect={[false, true, false, true, true]}
                  range={{
                    min: props.minTime,
                    max: props.maxTime,
                  }}
                ></Nouislider> */}

                <Nouislider
                  className="form-range-slider"
                  accessibility
                  tooltips={[
                    { to: formatTime }, // First handle
                    { to: formatTime }, // Second handle
                  ]}
                  connect={true}
                  onChange={handleSliderChange}
                  margin={30}
                  step={15}
                  start={[props.minTime, props.maxTime]}
                  range={{
                    min: props.minTime,
                    max: props.maxTime,
                  }}
                ></Nouislider>
              </div>
            </div>
          </td>
          <td style={{ width: "10%" }} className="pt-3 pl-3">
            <label style={{ width: "100px" }} className="form-label">
              {formatTime(props.maxTime)}
            </label>
          </td>
          <td style={{ width: "10%" }} className="pt-3 pl-3">
            <CalendarClock
              onClick={() => {
                props.addSlotHandlerCallback();
              }}
            />
          </td>
        </tr>
      </table>
    </div>
  );
};

export default _DragTimeRangePicker;

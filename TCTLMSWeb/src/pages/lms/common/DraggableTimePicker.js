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
  TooltipComponent,
  Icon,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";

const DragTimeRangePicker = (props) => {
  const [values, setValues] = useState([props.minTime, props.maxTime]); // Configurable start and end times
  const [selectedTime, setSelectedTime] = useState();
  // const MIN = 0; // 00:00 in minutes
  // const MAX = 1440; // 24:00 in minutes
  // useEffect(() => {
  //   setSelectedTime(`${formatTime(props.minTime)}-${formatTime(props.maxTime)}`);
  // }, []);
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
    if (props.use24Hour) {
      const totalMinutes = Math.max(0, Math.min(1440, Math.round(Number(value) || 0)));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
    const hours24 = Math.floor(value / 60);
    const minutes = Math.round(value % 60); // Round minutes to avoid decimals
    const ampm = hours24 >= 12 ? "PM" : "AM";
    let hours12 = hours24 % 12;
    hours12 = hours12 === 0 ? 12 : hours12; // Convert 0 to 12 for AM/PM format

    return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleSliderChange = (value, dataItem) => {
    // setSelectedTime(`${formatTime(value[0])}-${formatTime(value[1])}`);
    if (typeof props.sliderChangeCallback == "function") {
      // setTimeout(() => {
      props.sliderChangeCallback(value, dataItem);
      // }, 10);
    }
  };
  return (
    <div className="">
      <table style={{ width: "100%", marginBottom: "10px" }}>
        {/* <td style={{ width: "10%" }} className="pt-3 pl-3">
            <label className="form-label"> {props.dayOfWeek}</label>
          </td>
          <td style={{ width: "10%" }} className="pt-3">
            <label style={{ width: "100px" }} className="form-label">
              {formatTime(props.minTime)}
            </label>
          </td> */}
        {props?.slots?.map((dataItem, index) => {
          return (
            <tr>
              <>
                {/* <td style={{ width: "10%" }} className="pt-3">
                  <label style={{ width: "100px" }} className="form-label">
                    {formatTime(dataItem.startMinutes)}
                  </label>
                </td> */}
                <td style={{ width: "90%" }} className="pt-1 pr-3">
                  <div className="row">
                    <div className="col-md-4">
                      {index == 0 && (
                        <label style={{ width: "100px" }} className="form-label">
                          {formatTime(dataItem.minMinutes)}
                        </label>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" style={{ width: "100%", textAlign: "center" }}>
                        {dataItem?.selectedTime}
                      </label>
                    </div>
                    <div className="col-md-4 text-left">
                      {index == 0 && (
                        <label style={{ width: "100%" }} className="form-label text-right">
                          {formatTime(dataItem.maxMinutes)}
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-control-wrap" style={{ padding: "0 14px" }}>
                      <Nouislider
                        className="form-range-slider"
                        accessibility
                        tooltips={[
                          { to: formatTime },
                          { to: formatTime },
                        ]}
                        connect={true}
                        behaviour="drag-tap"
                        onChange={(value) => {
                          handleSliderChange(value, dataItem);
                        }}
                        margin={15}
                        step={15}
                        start={[dataItem.startMinutes, dataItem.endMinutes]}
                        range={{
                          min: dataItem.minMinutes,
                          max: dataItem.maxMinutes,
                        }}
                      ></Nouislider>
                    </div>
                  </div>
                </td>
                <td style={{ width: "10%" }} className="pt-3 pl-3">
                  {index == 0 ? (
                    <>
                      <Button
                        type="button"
                        id={"add" + dataItem?.dayofWeek}
                        className={`toggle btn-icon btn-trigger`}
                        onClick={() => {
                          props.addSlotHandlerCallback(dataItem?.dayofWeek);
                        }}
                      >
                        <Icon name="plus" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        id={"remove" + dataItem?.dayofWeek}
                        className={`toggle btn-icon btn-trigger`}
                        onClick={() => {
                          props.removeSlotHandlerCallback(dataItem?.dayofWeek || dataItem?.dayOfWeek, index);
                        }}
                      >
                        <Icon name="cross" />
                      </Button>
                    </>
                  )}
                </td>
              </>
            </tr>
          );
        })}

        {/* <td  className="pt-3 pl-3">
            <CalendarClock
              onClick={() => {
                props.addSlotHandlerCallback();
              }}
            />
          </td> */}
      </table>
    </div>
  );
};

export default DragTimeRangePicker;

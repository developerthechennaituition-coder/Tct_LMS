import React, { useEffect, useState, useRef, forwardRef, useCallback } from "react";
import moment from "moment";
import { FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row, Form } from "reactstrap";
import DatePicker from "react-datepicker";
import { toast, ToastContainer } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  Button,
  ReactDataTable,
  PreviewCard, 
} from "../../../components/Component";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem, Label } from "reactstrap";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  getUserAvailability,
  addUserTimeSlots,
  getUserSlotsByDay,
  updateTimeSlots,
  removeTimeSlot,
} from "../../../apiservices/UserService";
import Swal from "sweetalert2";
import { WeekDays, formatTime24, convertToTimeSpan } from "../../../utils/Utils";
import DragTimeRangePicker from "../common/DraggableTimePicker";

// Tutor Student Profile only (showRowsPerPage): search + Add Slots on one row. Scoped to .tct-av-head.
const tutorAvailabilityHeadStyle = `
  .tct-av-head { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
  .tct-av-head > .entrolled-list { flex: 1 1 280px; min-width: 0; }
  .tct-av-head > .entrolled-list .card-search.search-wrap { flex: 0 1 360px !important; max-width: 360px; }
  .tct-av-head > .tct-av-add { flex: 0 0 auto; height: 38px; margin-left: auto; }
  @media (max-width: 575.98px) {
    .tct-av-head > .tct-av-add { width: 100%; justify-content: center; }
  }
`;

const UserAvailability = (props) => {
  const [loading, setLoading] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [userDataSource, setUserDataSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [onSearchText, setSearchText] = useState("");
  const searchParams = new URLSearchParams(window.location.search);
  const loggedUserId = localStorage.getItem("userId");
  const targetUserId =
    searchParams.get("userId") ||
    props?.studentId ||
    searchParams.get("id") ||
    loggedUserId;
  const [id, setId] = useState(targetUserId);
  const [userId, setUserId] = useState(targetUserId); 
  const [onSearch, setonSearch] = useState(true);
  const [tablesm, updateTableSm] = useState(false);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [originalData, setOriginalData] = useState([]);
  const makeEmptySlot = (dayInNo, dayofWeek, uniqueId = 0) => ({
    dayInNo,
    uniqueId,
    dayofWeek,
    startTime: "00:00",
    startMinutes: 0,
    endTime: "00:00",
    endMinutes: 0,
    minMinutes: 0,
    maxMinutes: 1440,
    selectedTime: "",
  });

  const makeEmptyDay = (dayInNo, dayofWeek) => ({
    dayInNo,
    dayofWeek,
    slots: [makeEmptySlot(dayInNo, dayofWeek)],
    startMinutes: 0,
    endMinutes: 1440,
    minMinutes: 0,
    maxMinutes: 1440,
  });

  const copySlotsToDay = (sourceSlots, targetDay) =>
    (sourceSlots || []).map((slot, index) => ({
      ...slot,
      slotId: undefined,
      id: undefined,
      uniqueId: index + 1,
      dayInNo: targetDay.dayInNo,
      dayofWeek: targetDay.dayofWeek || targetDay.dayOfWeek,
      dayOfWeek: targetDay.dayofWeek || targetDay.dayOfWeek,
    }));

  const displaySlotsIn24HourFormat = (days) =>
    (days || []).map((day) => ({
      ...day,
      slots: (day.slots || day.Slots || []).map((slot) => ({
        ...slot,
        startTime: formatTime24(slot.startMinutes),
        endTime: formatTime24(slot.endMinutes),
        selectedTime: `${formatTime24(slot.startMinutes)}-${formatTime24(slot.endMinutes)}`,
      })),
    }));

  // DayOfWeek enum: Sunday=0, Monday=1, ..., Saturday=6
  const INITIAL_FILTERED_SLOT = [makeEmptyDay(0, "Sunday")];

  const [filtteredTimeSlot, setFiltteredTimeSlot] = useState(INITIAL_FILTERED_SLOT);
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const applyToAllDaysRef = useRef(false);

  const [timeSlots] = useState([
    makeEmptyDay(0, "Sunday"),
    makeEmptyDay(1, "Monday"),
    makeEmptyDay(2, "Tuesday"),
    makeEmptyDay(3, "Wednesday"),
    makeEmptyDay(4, "Thursday"),
    makeEmptyDay(5, "Friday"),
    makeEmptyDay(6, "Saturday"),
  ]);

  useEffect(() => {
    applyToAllDaysRef.current = applyToAllDays;
  }, [applyToAllDays]);

  const [formData, setFormData] = useState({
    id: defaultGuid,
    userId: loggedUserId,
    roleId: localStorage.getItem("roleId"),
    dayOfWeek: "Monday",
    startTime: new Date(),
    endTime: new Date(),
    timeZone: "UTC", // Set a default timezone
    isActve: true,
    isRecurring: true,
    isAvailable: true,
    startDate: new Date(),
    endDate: new Date(),
    createdBy: loggedUserId,
    createdDate: new Date(),
    weeklyDays: ["Sunday"],
  });
  const formRef = useRef(null);
  const { errors, register, handleSubmit, reset } = useForm();

  const loadAvailability = useCallback(() => {
    if (!targetUserId) return Promise.resolve([]);
    return getUserAvailability(targetUserId)
      .then((response) => {
        const records = Array.isArray(response) ? response : [];
        setUserDataSource(records);
        setOriginalData(records);
        return records;
      })
      .catch((error) => {
        console.error("Error fetching user availability:", error);
        setUserDataSource([]);
        setOriginalData([]);
        throw error;
      });
  }, [targetUserId]);

  useEffect(() => {
    setUserId(targetUserId);
    setId(targetUserId);
    loadAvailability().catch(() => {});
  }, [modalOpen, isDelete, itemPerPage, targetUserId, loadAvailability]);

  const dtUserColumns = [
    { name: "Day Of Week", selector: (row) => row.dayOfWeek, sortable: true },
    {
      name: "Start Date",
      selector: (row) => row.startDate,
      cell: (row) => <span>{row?.startDate != null ? moment(row.startDate).format("DD-MMM-yyyy") : ""}</span>,
      hide: "md",
    },
    {
      name: "End Date",

      selector: (row) => row.endDate,
      cell: (row) => <span>{row?.endDate != null ? moment(row.endDate).format("DD-MMM-yyyy") : ""}</span>,
      hide: "md",
    },
    {
      name: "Start Time",

      selector: (row) => row.startTime,
      cell: (row) => <span>{row?.startTime != null ? moment(row.startTime).format("HH:mm") : ""}</span>,
      hide: "md",
    },
    {
      name: "End Time",

      selector: (row) => row.endTime,
      cell: (row) => <span>{row?.endTime != null ? moment(row.endTime).format("HH:mm") : ""}</span>,
      hide: "md",
    },
    {
      name: "Actions",
      selector: (row) => (row?.startDate != null ? row?.userAvailabilityId : row?.userAvailabilityExceptionId),
      cell: (row) => (
        <>
          <UncontrolledDropdown>
            <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu right>
              <ul className="link-list-opt no-bdr">
                <li>
                  <Link
                    onClick={() => {
                      const id = row?.userAvailabilityId || row?.userAvailabilityExceptionId;
                      onEditHandler(id, row);
                    }}
                  >
                    <Icon name="edit"></Icon>
                    <span>Edit Slot Details</span>
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={() => {
                      const id = row?.userAvailabilityId || row?.userAvailabilityExceptionId;
                      onDeleteHandler(id);
                    }}
                  >
                    <Icon name="trash"></Icon>
                    <span>Delete Slot Details</span>
                  </Link>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </>
      ),
    },
  ];

  const resetForm = () => {
    setFormData({
      id: defaultGuid,
      userId: loggedUserId,
      roleId: localStorage.getItem("roleId"),
      dayOfWeek: "Monday",
      startTime: new Date(),
      endTime: new Date(),
      timeZone: "UTC",
      isActve: true,
      isRecurring: true,
      isAvailable: true,
      startDate: new Date(),
      endDate: new Date(),
      createdBy: loggedUserId,
      createdDate: new Date(),
      weeklyDays: ["Sunday"],
    });
    setIsEdit(false);
    applyToAllDaysRef.current = false;
    setApplyToAllDays(false);
    setFiltteredTimeSlot([makeEmptyDay(0, "Sunday")]);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onFormSubmit = async () => {
    let _slots = [];
    const edit = isEdit;
    filtteredTimeSlot.map((record) => {
      const slots = (record.slots || record.Slots || []).map((item) => ({
        StartTime: convertToTimeSpan(item?.startTime),
        EndTime: convertToTimeSpan(item?.endTime),
        Day: item.dayofWeek || item.dayOfWeek,
        DayofWeek: item.dayInNo,
        Id: item?.slotId || defaultGuid,
      }));
      _slots = [..._slots, ...slots];
      return slots;
    });

    const _inputData = {
      loggedInUserId: loggedUserId,
      userId: targetUserId,
      isRecurring: formData.isRecurring,
      startDate: formData.startDate,
      endDate: formData.endDate,
      slotList: _slots,
    };
    setLoading(true);
    try {
      const response = edit
        ? await updateTimeSlots(_inputData)
        : await addUserTimeSlots(_inputData);
      const succeeded = response === true || response?.data === true || response?.succeeded === true;

      if (!succeeded) {
        toast.error(response?.message || "Failed to save availability.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
        return;
      }

      await loadAvailability();
      setModalOpen(false);
      resetForm();
      toast.success(edit ? "Time slots updated successfully." : "User availability slot saved successfully.", {
              position: "top-right",
              autoClose: true,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: false,
              closeButton: <CloseButton />,
      });
    } catch (error) {
      console.error("Error submitting availability form:", error);
      toast.error(error?.response?.data?.message || "Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  const onEditHandler = (id, dataItem) => {
    getUserSlotsByDay(dataItem?.userId || targetUserId, dataItem?.dayOfWeek).then((response) => {
      const records = Array.isArray(response?.data) ? response.data : [];
      if (!records.length) {
        toast.error("Unable to load the selected availability slot.");
        return;
      }
      setIsEdit(true);
      setModalOpen(true);
      const record = records;
      setFormData((prev) => ({
        ...prev,
        weeklyDays: [record[0].dayOfWeek],
        isRecurring: record[0].isRecurring,
        startDate: record[0].startDate ? new Date(record[0].startDate) : new Date(),
        endDate: record[0].endDate ? new Date(record[0].endDate) : new Date(),
      }));
      setFiltteredTimeSlot(displaySlotsIn24HourFormat(records));
    });
  };

  const onDeleteHandler = (timeSlotId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const _inputData = {
          loggedInUserId: loggedUserId,
          id: timeSlotId,
        };

        removeTimeSlot(_inputData)
          .then((response) => {
            loadAvailability().catch(() => {});
            if (response.data) {
              toast.success("Time slots deleted successfully.", {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
                closeButton: <CloseButton />,
              });
            } else {
              toast.error(response.message, {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
                closeButton: <CloseButton />,
              });
            }
          })
          .catch((error) => {
            console.error("Error submitting form:", error);
            toast.error("Failed to submit form");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    });
  };

  const addNewTimeSlotHandler = (_day) => {
    const temp = [...filtteredTimeSlot];
    var currentItemIndex = temp.findIndex((s) => (s.dayofWeek || s.dayOfWeek) == _day);
    let max = -Infinity;

    temp[currentItemIndex].slots.forEach((value) => {
      if (value.endMinutes > max) {
        max = value.endMinutes;
      }
    });
    temp[currentItemIndex].slots.push({
      dayInNo: temp[currentItemIndex].dayInNo,
      uniqueId: temp[currentItemIndex].slots.length + 1,
      dayofWeek: temp[currentItemIndex].dayofWeek,
      startTime: max,
      endTime: max + 60,
      startMinutes: max,
      endMinutes: max + 60,
      minMinutes: temp[currentItemIndex].startMinutes,
      maxMinutes: temp[currentItemIndex].endMinutes,
    });

    setFiltteredTimeSlot(temp);
  };

  const removeSlotHandlerCallback = (dayOfWeek, index) => {
    const temp = [...filtteredTimeSlot];
    var currentItemIndex = temp.findIndex((s) => s.dayofWeek == dayOfWeek || s.dayOfWeek == dayOfWeek);

    const slot = temp[currentItemIndex]?.slots?.[index];
    if (!slot?.slotId) {
      temp[currentItemIndex].slots.splice(index, 1);
      setFiltteredTimeSlot([...temp]);
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const _inputData = {
          loggedInUserId: loggedUserId,
          id: slot.slotId,
        };

        removeTimeSlot(_inputData)
          .then((response) => {
            loadAvailability().catch(() => {});
            if (response.data) {
              setModalOpen(false);
              toast.success("Time slots deleted successfully.", {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
                closeButton: <CloseButton />,
              });
            } else {
              setModalOpen(true);
              toast.error(response.message, {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
                closeButton: <CloseButton />,
              });
            }
          })
          .catch((error) => {
            console.error("Error submitting form:", error);
            toast.error("Failed to submit form");
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      }
    });
  };

  const toggle = () => setonSearch(!onSearch);
  const onFilterChange = (e) => {
    const filterText = e.target.value.toLowerCase();
    setSearchText(filterText);
    const filteredData = originalData.filter((item) => item.dayOfWeek.toLowerCase().includes(filterText));
    getUserAvailability(targetUserId).then((data) => {
      const filteredData = originalData.filter((item) => item.dayOfWeek.toLowerCase().includes(filterText));
      setUserDataSource(filteredData);
    });
  };
  const [availabilities, setAvailabilities] = useState([]);
  const [exceptions, setExceptions] = useState([]);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  //const timeZones = Intl.DateTimeFormat().resolvedOptions().timeZone ? [Intl.DateTimeFormat().resolvedOptions().timeZone] : [];
  const timeZones = Intl.supportedValuesOf("timeZone") || ["UTC"];
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const ExampleCustomInput = forwardRef(({ value, onClick, onChange }, ref) => (
    <div onClick={onClick} ref={ref}>
      <div className="form-icon form-icon-left">
        <Icon name="calendar"></Icon>
      </div>
      <input className="form-control date-picker" type="text" value={value} onChange={onChange} />
    </div>
  ));
  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtUserColumns}
          pagination
          pageSize={itemPerPage}
          className="nk-tb-list"
          fixedHeaderScrollHeight="400px"
          customStyles={{
            table: {
              style: {
                minWidth: "1200px",
              },
            },
          }}
          // customStyles={customStyles}
          // responsive={true} // Ensure responsiveness
          canShowFilter={false}
        />
      </>
    );
  };

  const handleChange = (e) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [e.target.name]: e.target.value,
    }));
  };

  const holidays = [
    { date: new Date("2025-03-19"), name: "Testing" },
    { date: new Date("2025-04-14"), name: "Tamil New Year Day" },
  ];

  const toggleWeekDay = (day) => {
    if (formData.weeklyDays.length > 0) {
      setFormData((prev) => ({
        ...prev,
        weeklyDays: prev.weeklyDays?.includes(day)
          ? prev.weeklyDays?.filter((d) => d !== day)
          : [...prev?.weeklyDays, day],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        weeklyDays: [day],
      }));
    }

    setTimeout(() => {
      let temp = formData.weeklyDays;
      if (temp.includes(day)) {
        temp = temp.filter((d) => d !== day);
      } else {
        temp.push(day);
      }

      const fillterData = filtteredTimeSlot.filter((record) => temp.includes(record.dayofWeek));

      let filterList = [];
      timeSlots.forEach((item, index) => {
        var filterItem = fillterData.filter((record) => record.dayofWeek == item.dayofWeek);
        if (temp.includes(item.dayofWeek) && filterItem.length == 0) {
          item.slots = [item.slots[0]];
          filterList.push(item);
        }
      });
      filterList = filterList.concat(fillterData);
      filterList = filterList.sort((a, b) => a.dayInNo - b.dayInNo);

      if (applyToAllDaysRef.current) {
        const sourceDay = filterList.find((d) => (d.slots || []).some((s) => s.selectedTime));
        if (sourceDay) {
          const sourceDayName = sourceDay.dayofWeek || sourceDay.dayOfWeek;
          filterList = filterList.map((d) =>
            (d.dayofWeek || d.dayOfWeek) === sourceDayName
              ? d
              : { ...d, slots: copySlotsToDay(sourceDay.slots, d) }
          );
        }
      }

      setFiltteredTimeSlot([...filterList]);
    }, 2);
  };

  const sliderChangeCallback1 = useCallback((value, _dataItem) => {
    const isApplyToAll = applyToAllDaysRef.current;
    const itemDayName = _dataItem.dayofWeek || _dataItem.dayOfWeek;
    const updatedSlot = {
      selectedTime: `${formatTime24(Number(value[0]))}-${formatTime24(Number(value[1]))}`,
      startMinutes: Number(value[0]),
      endMinutes: Number(value[1]),
      startTime: formatTime24(Number(value[0])),
      endTime: formatTime24(Number(value[1])),
    };
    setFiltteredTimeSlot((prevState) =>
      prevState.map((day) => {
        const dayName = day.dayofWeek || day.dayOfWeek;
        const isTargetDay = dayName === itemDayName;
        if (!isApplyToAll && !isTargetDay) return day;
        return {
          ...day,
          slots: day.slots.map((slot) =>
            slot.uniqueId === _dataItem.uniqueId ? { ...slot, ...updatedSlot } : slot
          ),
        };
      }),
    );
  }, []);

  // Search/settings toolbar and Add Slots button (each rendered once; placement depends on layout below).
  const availabilityToolbar = (
    <div className="entrolled-list card-inner position-relative card-tools-toggle">
      <div className="card-title-group">
        <div className="card-tools"></div>
        <div className="card-tools mr-n1">
          <ul className="btn-toolbar gx-1">
            <li>
              <a
                href="#search"
                onClick={(ev) => {
                  ev.preventDefault();
                  toggle();
                }}
                className="btn btn-icon search-toggle toggle-search"
              >
                <Icon name="search"></Icon>
              </a>
            </li>
            <li className="btn-toolbar-sep"></li>
            <li>
              <div className="toggle-wrap">
                <Button
                  className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`}
                  onClick={() => updateTableSm(true)}
                >
                  <Icon name="menu-right"></Icon>
                </Button>
                <div className={`toggle-content ${tablesm ? "content-active" : ""}`}>
                  <ul className="btn-toolbar gx-1">
                    <li className="toggle-close">
                      <Button className="btn-icon btn-trigger toggle" onClick={() => updateTableSm(false)}>
                        <Icon name="arrow-left"></Icon>
                      </Button>
                    </li>
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                          <Icon name="setting"></Icon>
                        </DropdownToggle>
                        <DropdownMenu right className="dropdown-menu-xs">
                          <ul className="link-check">
                            <li>
                              <span>Show</span>
                            </li>
                            <li className={itemPerPage === 10 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(10);
                                }}
                              >
                                10
                              </DropdownItem>
                            </li>
                            <li className={itemPerPage === 15 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(15);
                                }}
                              >
                                15
                              </DropdownItem>
                            </li>
                            <li className={itemPerPage === 25 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(25);
                                }}
                              >
                                25
                              </DropdownItem>
                            </li>
                            <li className={itemPerPage === 30 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(30);
                                }}
                              >
                                30
                              </DropdownItem>
                            </li>
                            <li className={itemPerPage === 50 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(50);
                                }}
                              >
                                50
                              </DropdownItem>
                            </li>
                            <li className={itemPerPage === 100 ? "active" : ""}>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setItemPerPage(100);
                                }}
                              >
                                100
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className={`card-search search-wrap ${!onSearch && "active"}`}>
        <div className="card-body">
          <div className="search-content">
            <Button
              className="search-back btn-icon toggle-search active"
              onClick={() => {
                setSearchText("");
                toggle();
              }}
            >
              <Icon name="arrow-left"></Icon>
            </Button>
            <input
              type="text"
              className="border-transparent form-focus-none form-control"
              placeholder="Search by day of week"
              value={onSearchText}
              onChange={(e) => onFilterChange(e)}
            />
            <Button className="search-submit btn-icon">
              <Icon name="search"></Icon>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  const addSlotsButton = (
    <Button
      color="primary"
      className="tct-av-add"
      onClick={() => {
        resetForm();
        setModalOpen(true);
      }}
    >
      <Icon name="plus" /> Add Slots
    </Button>
  );

  return (
    <>
      {props.showRowsPerPage ? (
        // Tutor Student Profile: search (left, fills the row) and Add Slots (right) on one row.
        <>
          <style>{tutorAvailabilityHeadStyle}</style>
          <div className="tct-av-head">
            {availabilityToolbar}
            {addSlotsButton}
          </div>
        </>
      ) : (
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5"></BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>{addSlotsButton}</BlockHeadContent>
          </BlockBetween>
        </BlockHead>
      )}

      <Block>
        {!props.showRowsPerPage && (
          <Row>
            <Col size={6}></Col>
            <Col size={6}>
              {availabilityToolbar}
            </Col>
          </Row>
        )}
        {userDataSource &&
          (props.showRowsPerPage ? (
            // Opt-in (tutor Student Profile only): visible Rows per page next to the pagination,
            // using the same itemPerPage state and options as the settings menu's "Show" list.
            <div className="tct-av-grid">
              <RenderGrid dataSource={userDataSource}></RenderGrid>
              {userDataSource.length > 0 && (
                <div className="tct-rpp">
                  <span>Rows per page</span>
                  <UncontrolledDropdown direction="up">
                    <DropdownToggle tag="button" type="button" className="tct-rpp-toggle" aria-label={`Rows per page: ${itemPerPage}`}>
                      <span>{itemPerPage}</span>
                      <Icon name="chevron-down" />
                    </DropdownToggle>
                    <DropdownMenu right className="tct-rpp-menu">
                      {[10, 15, 25, 30, 50, 100].map((size) => (
                        <DropdownItem
                          key={size}
                          tag="button"
                          type="button"
                          active={itemPerPage === size}
                          onClick={() => setItemPerPage(size)}
                        >
                          <span>{size}</span>
                          {itemPerPage === size && <Icon name="check" />}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              )}
            </div>
          ) : (
            <>
              <RenderGrid dataSource={userDataSource}></RenderGrid>
            </>
          ))}
      </Block>

      <Modal isOpen={modalOpen} toggle={closeModal} className="modal-dialog-centered custom-modal" size="xl">
        <ModalHeader toggle={closeModal}>{isEdit ? "Edit Slots" : "Add Slots"}</ModalHeader>
        <ModalBody className="pb-0 pt-0">
          <div>
            <PreviewCard>
              <Form className="row pb-0 pt-0" ref={formRef} noValidate onSubmit={handleSubmit(onFormSubmit)}>
                <Row className="col-md-12">
                  <Col md="12">
                    <div className="h-100 d-flex align-items-end">
                      <div className="custom-control custom-control-sm custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input form-control"
                          id="isRecurring"
                          name="isRecurring"
                          checked={formData?.isRecurring}
                          onChange={() => setFormData({ ...formData, isRecurring: !formData?.isRecurring })}
                        />
                        <label className="custom-control-label" htmlFor="isRecurring">
                          {" "}
                          Recurring
                        </label>
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row className="col-md-12 pb-1">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Select Day</label>
                      <Row className="col-md-12">
                        {WeekDays.map((day, index) => (
                          <>
                            <Col key={`weekdays_${day.value}`}>
                              <div className="form-control-wrap days-wrap ml-1 mr-1">
                                <Button
                                  type="button"
                                  key={day.value}
                                  className={formData?.weeklyDays?.includes(day.value) ? "btn-primary " : "btn-repeat"}
                                  onClick={() => toggleWeekDay(day.value)}
                                >
                                  {day.label}
                                </Button>
                              </div>
                            </Col>
                          </>
                        ))}
                      </Row>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Start Date</label>
                          <div className="w-100">
                            <div className="form-control-wrap">
                              <DatePicker
                                placeholderText="Select startdate"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                yearDropdownItemNumber={100}
                                scrollableYearDropdown
                                selected={new Date(formData?.startDate)}
                                startDate={new Date()}
                                value={new Date(formData?.startDate)}
                                minDate={new Date()}
                                onChange={(date) => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    startDate: date,
                                  }));
                                }}
                                className="form-control date-picker"
                              />
                            </div>
                          </div>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        {!formData.isRecurring && (
                          <>
                            <FormGroup>
                              <label className="form-label">End Date</label>
                              <div className="w-100">
                                <div className="form-control-wrap">
                                  <DatePicker
                                    placeholderText="Select enddate"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    yearDropdownItemNumber={100}
                                    scrollableYearDropdown
                                    selected={formData?.endDate}
                                    startDate={new Date()}
                                    minDate={new Date()}
                                    onChange={(date) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        endDate: date,
                                      }));
                                    }}
                                    className="form-control date-picker"
                                  />
                                </div>
                              </div>
                            </FormGroup>
                          </>
                        )}
                      </Col>
                    </Row>
                  </Col>
                </Row>
                <Row className="col-md-12 pb-1">
                  <Col md="12">
                    <div className="custom-control custom-control-sm custom-checkbox">
                      <input
                        type="checkbox"
                        className="custom-control-input form-control"
                        id="applyToAllDays"
                        name="applyToAllDays"
                        checked={applyToAllDays}
                        onChange={() => {
                          const next = !applyToAllDays;
                          applyToAllDaysRef.current = next;
                          setApplyToAllDays(next);
                          if (next) {
                            setFiltteredTimeSlot((prevState) => {
                              const sourceDay = prevState.find((day) =>
                                (day.slots || []).some((slot) => slot.selectedTime)
                              );
                              if (!sourceDay) return prevState;
                              const sourceDayName = sourceDay.dayofWeek || sourceDay.dayOfWeek;
                              return prevState.map((day) =>
                                (day.dayofWeek || day.dayOfWeek) === sourceDayName
                                  ? day
                                  : { ...day, slots: copySlotsToDay(sourceDay.slots, day) }
                              );
                            });
                          }
                        }}
                      />
                      <label className="custom-control-label" htmlFor="applyToAllDays">
                        Apply time to all selected days
                      </label>
                    </div>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="12">
                    {filtteredTimeSlot &&
                      filtteredTimeSlot.map((elem, index) => {
                        const dayName = elem?.dayofWeek || elem?.dayOfWeek;
                        return (
                          <div key={`divSlots_${dayName}`} className="row border border-primary rounded mb-1">
                            <div className="col-md-2" style={{ display: "flex", alignItems: "center" }}>
                              <div className="d-flex align-items-center">{dayName}</div>
                            </div>
                            <div className="col-md-10">
                              <DragTimeRangePicker
                                key={`picker_${dayName}_${applyToAllDays}_${(elem.slots || []).map((s) => `${s.startMinutes}-${s.endMinutes}`).join(",")}`}
                                component_key={"slots" + index}
                                slots={elem.slots || elem.Slots}
                                dayOfWeek={dayName}
                                use24Hour
                                sliderChangeCallback={sliderChangeCallback1}
                                addSlotHandlerCallback={(_day) => {
                                  addNewTimeSlotHandler(_day);
                                }}
                                removeSlotHandlerCallback={(_dayOfWeek, _index) => {
                                  removeSlotHandlerCallback(_dayOfWeek, _index);
                                }}
                              ></DragTimeRangePicker>
                            </div>
                          </div>
                        );
                      })}
                  </Col>
                  <Col md="12">
                    {(!filtteredTimeSlot || filtteredTimeSlot?.length == 0) && (
                      <div key={"divSlots"} className="row border border-primary rounded mb-1">
                        <div className="col-md-12 text-center pt-2 pb-2 success">
                          <span className="tb-status text-warning"> Please select day to add.</span>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </Form>
            </PreviewCard>
          </div>
        </ModalBody>
        <ModalFooter className="pb-1 pt-1">
          <Row className="col-md-12 pr-0">
            <Col sm="12">
              <div className="d-flex justify-content-end">
                {" "}
                <Button color="primary mr-1" onClick={onFormSubmit} disabled={loading}>
                  {loading ? (isEdit ? "Updating Slot..." : "Adding Slot...") : isEdit ? "Update Slot" : "Add Slot"}
                </Button>{" "}
                <Button color="secondary" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </Col>
          </Row>
        </ModalFooter>
      </Modal>
      {/* <ToastContainer /> */}
    </>
  );
};
export default UserAvailability;

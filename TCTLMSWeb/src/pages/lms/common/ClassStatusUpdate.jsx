import React, { useCallback, useEffect, useState, useRef } from "react";
import { scheduledPackageEnd } from "../../../library/scheduledPackagePeriod";
import { FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Form, Row, Spinner } from "reactstrap";

import "react-phone-number-input/style.css";
import DatePicker from "react-datepicker";
import { Icon, Col, Button } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import { useForm } from "react-hook-form";
import { getLookups } from "../../../apiservices/LookupsService";
import {
  FollowUpStatus,
  processTimeData,
  WeekDays,
  UUIDNill,
  formatTime1,
  findOverlappingIndices,
  convertToTimeSpan,
  findOverlapsInAllocatedSlots,
} from "../../../utils/Utils";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import DragTimeRangePicker from "./DraggableTimePicker";
import { getSubjectList } from "../../../apiservices/StudentEnrollmentService";
import {
  getOverlappingTimeSlot,
  getTutorAvailablity,
  getStudentAllocatedSchedule,
  scheduleEvent,
} from "../../../apiservices/UserService";
import { toast } from "react-toastify";
import UserAvailableSlotsProgressBar from "./UserAvailableSlotsProgressBar";
import moment from "moment";

// ---------------------------------------------------------------------------
// Helper: stable numeric sort index from the WeekDays array (Sun=0 … Sat=6).
// ---------------------------------------------------------------------------
const getDayInNo = (dayName) => {
  const idx = WeekDays.findIndex((d) => d.value === dayName);
  return idx >= 0 ? idx : 99;
};

// ---------------------------------------------------------------------------
// Helper: build a default 9 AM–10 AM slot for a day that has no API data.
// ---------------------------------------------------------------------------
const buildDefaultSlot = (dayofWeek) => ({
  uniqueId: 1,
  dayofWeek,
  dayInNo: getDayInNo(dayofWeek),
  startMinutes: 540,
  endMinutes: 600,
  startTime: "09:00:00",
  endTime: "10:00:00",
  minMinutes: 0,
  maxMinutes: 1440,
});

// ---------------------------------------------------------------------------
// Helper: placeholder day entry with one default slot.
// ---------------------------------------------------------------------------
const buildPlaceholderDay = (dayName) => ({
  dayofWeek: dayName,
  dayInNo: getDayInNo(dayName),
  startMinutes: 0,
  endMinutes: 1440,
  slots: [buildDefaultSlot(dayName)],
});

const copySlotsToDay = (sourceSlots, targetDay) =>
  (sourceSlots || []).map((slot, index) => ({
    ...slot,
    slotId: undefined,
    id: undefined,
    uniqueId: index + 1,
    dayInNo: targetDay.dayInNo,
    dayofWeek: targetDay.dayofWeek,
  }));

const ClassStatusUpdate = (props) => {
  const MAX_DAILY_MINUTES = 120;
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);
  const [statusList, setStatusList] = useState([]);
  const [tutorAvailableSlots, setTutorAvailableSlots] = useState([]);
  const [tutorFilteredSlots, setTutorFilteredSlots] = useState([]);
  const [studentAvailableSlots, setStudentAvailableSlots] = useState();
  const [studentFilteredSlots, setStudentFilteredSlots] = useState();
  const [filtteredTimeSlot, setFiltteredTimeSlot] = useState();
  const [unFillterdStatusList, setUnFillterdStatusList] = useState([]);
  const [timeSlots, setTimeSlots] = useState();
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const applyToAllDaysRef = useRef(false);
  const userId = localStorage.getItem("userId");
  const defaultGuid = UUIDNill();
  const [subjects, setSubjects] = useState();

  useEffect(() => {
    applyToAllDaysRef.current = applyToAllDays;
  }, [applyToAllDays]);

  const [formData, setFormData] = useState({
    scheduleId: defaultGuid,
    saleDetailsId: defaultGuid,
    subjectId: defaultGuid,
    tutorId: defaultGuid,
    studentId: defaultGuid,
    scheduleStatus: defaultGuid,
    meetingLink: "",
    IsRecurrence: true,
    scheduleMode: "Weekly",
    totalClasses: 5,
    title: "No title",
    startDate: new Date(),
    endDate: moment().endOf("month").toDate(),
    noOfMonths: 10,
    startTime: new Date(),
    endTime: new Date(),
    repeatType: "Daily",
    description: "",
    studentAvailableSlots: [],
    weeklyDays: [],
  });

  const [salesDetails, setSalesDetails] = useState({
    studentId: null,
    studentName: "",
    tutorName: "",
    coordinatorId: "",
    coordinatorName: "",
    subjectId: "",
    subjectName: "",
    gradeName: "",
    gradId: "",
    boardName: "",
    boardId: "",
    tutorId: null,
    enrollmentDate: "",
    status: "",
  });

  // Convert any time value (string "HH:MM:SS" or number) to minutes from midnight
  const parseToMinutes = (val) => {
    if (val !== undefined && val !== null && !isNaN(Number(val))) return Number(val);
    if (typeof val === "string" && val.includes(":")) {
      const p = val.split(":").map(Number);
      return p[0] * 60 + (p[1] || 0);
    }
    return 0;
  };

  // Normalize a slot so startMinutes/endMinutes are always reliable numbers
  const normalizeSlot = (slot) => {
    const start = parseToMinutes(slot.startMinutes ?? slot.startTime);
    const end   = parseToMinutes(slot.endMinutes   ?? slot.endTime);
    return { ...slot, startMinutes: start, endMinutes: end };
  };
  // tutorAvailableSlots is an array of { day: "Monday", timeSlots: [...] }
  // A day counts as available if it has at least one timeSlot with isAllocated===false
  // (i.e. free slots exist), OR simply if the day entry exists at all.
  // Adjust the predicate below to match your API's shape.
  // ---------------------------------------------------------------------------
  const tutorAvailableDays = tutorAvailableSlots
    .filter((item) => item.timeSlots?.some((s) => !s.isAllocated))
    .map((item) => item.day);

  const isTutorAvailableOnDay = (dayName) => tutorAvailableDays.includes(dayName);

  // ---------------------------------------------------------------------------
  // When timeSlots (overlapping) loads, rebuild filtteredTimeSlot.
  // Only include days where the tutor is actually available.
  // Auto-correct formData.weeklyDays to remove unavailable days.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!timeSlots) return;

    const startDateDay = moment(formData.startDate).format("dddd");
    const requestedDays =
      formData.scheduleMode === "OneTime" ? [startDateDay] : formData.weeklyDays;

    // A one-time class is tied to the Start Date weekday. For repeating
    // schedules, keep the coordinator's selected weekdays.
    const allAvailable = requestedDays.filter((day) => isTutorAvailableOnDay(day));
    const availableSelected = allAvailable;

    // Update weeklyDays in formData to remove unavailable days
    setFormData((prev) =>
      prev.weeklyDays.length === availableSelected.length &&
      prev.weeklyDays.every((day, index) => day === availableSelected[index])
        ? prev
        : { ...prev, weeklyDays: availableSelected }
    );

    setTutorFilteredSlots(
      availableSelected.length > 0
        ? (tutorAvailableSlots || []).filter((item) => availableSelected.includes(item.day))
        : formData.scheduleMode === "OneTime"
        ? []
        : tutorAvailableSlots || []
    );
    setStudentFilteredSlots(
      availableSelected.length > 0
        ? (studentAvailableSlots || []).filter((item) => availableSelected.includes(item.day))
        : formData.scheduleMode === "OneTime"
        ? []
        : studentAvailableSlots || []
    );

    const timeSlotsMap = new Map((timeSlots || []).map((item) => [item.dayofWeek, item]));

    const initialFiltered = availableSelected
      .map((day) => {
        const fromApi = timeSlotsMap.get(day);
        const dayInNo = getDayInNo(day);

        if (fromApi) {
          return {
            ...fromApi,
            dayInNo,
            slots: fromApi.slots?.length
              ? fromApi.slots.map((s) => normalizeSlot(s))
              : [buildDefaultSlot(day)],
          };
        }

        return buildPlaceholderDay(day);
      })
      .sort((a, b) => a.dayInNo - b.dayInNo);

    setFiltteredTimeSlot(initialFiltered);
  }, [
    timeSlots,
    tutorAvailableSlots,
    studentAvailableSlots,
    formData.scheduleMode,
    formData.startDate,
  ]);

  useEffect(() => {
    const loadData = async () => {
      const _dataItem = props.dataItem;

      if (_dataItem) {
        try {
          const response = await GetSalesDetails(_dataItem.salesId, _dataItem.saleDetailsId);
          if (response?.data) {
            setSalesDetails({
              ...response.data,
              salesId: _dataItem.salesId,
              saleDetailsId: _dataItem.saleDetailsId,
            });
          }
        } catch (error) {
          console.error("Error loading sales details:", error);
        }

        getSubjectList(_dataItem.studentId, userId).then((data) => {
          setSubjects(props.lockSubject ? data.filter((s) => s.saleDetailsId === _dataItem.saleDetailsId) : data);
          const _subjectId = data.find((s) => s.saleDetailsId === _dataItem.saleDetailsId)?.subjectId;
          setFormData((prev) => ({ ...prev, subjectId: _subjectId }));
        });

        await overlappingTimeSlot(_dataItem.tutorUserId, _dataItem.stdUserId);
        await tutorAvailablity(_dataItem.tutorId);

        await getStudentAllocatedSchedule(_dataItem.stdUserId, _dataItem.studentId, _dataItem.saleDetailsId).then(
          (response) => {
            setStudentAvailableSlots(response);
            setStudentFilteredSlots(response);
            setFormData((prev) => ({ ...prev, studentAvailableSlots: response }));
          }
        );
      }

      getLookups("200").then((response) => {
        let temp = [];
        response
          ?.filter((s) => s.typeCodeValue == FollowUpStatus.DemoPendingTutorAssignedNotApproved)
          ?.forEach((s) => {
            temp.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
          });
        setStatusList(temp);

        let temp1 = [];
        response.forEach((s) => {
          temp1.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
        });
        setUnFillterdStatusList(temp1);
      });
    };

    loadData();
  }, []);

  const tutorAvailablity = async (tutorId) => {
    await getTutorAvailablity(tutorId).then((response) => {
      setTutorAvailableSlots(response);
      setTutorFilteredSlots(response);
    });
  };

  const overlappingTimeSlot = async (tutorId, studentId) => {
    await getOverlappingTimeSlot(tutorId, studentId)
      .then((response) => {
        const result = processTimeData(response);
        setTimeSlots(result);
        console.log(result);
      })
      .catch((errors) => {});
  };

  const onStatusUpdateHandler = () => {};

  // ---------------------------------------------------------------------------
  // Toggle a weekday — disabled if tutor is not available that day.
  // ---------------------------------------------------------------------------
  const toggleWeekDay = (day) => {
    if (formData.scheduleMode === "OneTime") {
      const isSelected = formData.weeklyDays.includes(day);

      if (isSelected) {
        setFormData((prev) => ({ ...prev, weeklyDays: [] }));
        setFiltteredTimeSlot([]);
        setTutorFilteredSlots(tutorAvailableSlots || []);
        setStudentFilteredSlots(studentAvailableSlots || []);
        return;
      }

      if (!isTutorAvailableOnDay(day)) return;

      const targetDayNumber = getDayInNo(day);
      const currentDate = moment(formData.startDate).startOf("day");
      let nextDate = currentDate.clone().day(targetDayNumber);
      if (nextDate.isBefore(currentDate, "day")) nextDate.add(7, "days");

      setFormData((prev) => ({
        ...prev,
        weeklyDays: [day],
        startDate: nextDate.toDate(),
        endDate: nextDate.toDate(),
      }));
      return;
    }

    // Silently block if tutor has no availability this day
    if (!isTutorAvailableOnDay(day)) return;

    setFormData((prev) => {
      const nextWeeklyDays = prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter((d) => d !== day)
        : [...prev.weeklyDays, day];

      const currentFilteredMap = new Map(
        (filtteredTimeSlot || []).map((item) => [item.dayofWeek, item])
      );
      const timeSlotsMap = new Map((timeSlots || []).map((item) => [item.dayofWeek, item]));

      const rebuiltFilteredSlots = nextWeeklyDays
        .map((d) => {
          const fromApi = timeSlotsMap.get(d);
          const existingDay = currentFilteredMap.get(d);
          const dayInNo = getDayInNo(d);

          if (existingDay) {
            return {
              ...(fromApi || existingDay),
              dayofWeek: d,
              dayInNo,
              slots: existingDay.slots?.length ? [...existingDay.slots] : [buildDefaultSlot(d)],
            };
          }

          if (fromApi) {
            return {
              ...fromApi,
              dayInNo,
              slots: fromApi.slots?.length ? [normalizeSlot(fromApi.slots[0])] : [buildDefaultSlot(d)],
            };
          }

          return buildPlaceholderDay(d);
        })
        .sort((a, b) => a.dayInNo - b.dayInNo);

      setFiltteredTimeSlot(rebuiltFilteredSlots);

      // With no selected day, restore the complete availability overview.
      // Previously filtering by an empty array left both sections blank.
      setTutorFilteredSlots(
        nextWeeklyDays.length === 0
          ? tutorAvailableSlots || []
          : (tutorAvailableSlots || []).filter((item) => nextWeeklyDays.includes(item.day))
      );
      setStudentFilteredSlots(
        nextWeeklyDays.length === 0
          ? studentAvailableSlots || []
          : (studentAvailableSlots || []).filter((item) => nextWeeklyDays.includes(item.day))
      );

      return { ...prev, weeklyDays: nextWeeklyDays };
    });
  };

  const convertToTime1 = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return new Date(1970, 0, 1, hours, minutes, seconds);
  };

  const getRequiredSessionCount = () => Number(salesDetails?.noOfSessionPerWeek || 0);

  const getSelectedSessionCount = () => {
    if (!filtteredTimeSlot?.length) return 0;
    return filtteredTimeSlot.reduce((total, day) => total + (day?.slots?.length || 0), 0);
  };

  // Parse a slot's start/end into numeric minutes from midnight.
  // Slots may carry startMinutes/endMinutes (numbers) OR startTime/endTime (strings like "09:00:00").
  const slotToMinutes = (slot) => {
    const toMins = (minVal, timeVal) => {
      if (minVal !== undefined && minVal !== null && !isNaN(Number(minVal))) return Number(minVal);
      if (typeof timeVal === "string" && timeVal.includes(":")) {
        const parts = timeVal.split(":").map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      }
      return 0;
    };
    const start = toMins(slot?.startMinutes, slot?.startTime);
    const end = toMins(slot?.endMinutes, slot?.endTime);
    return { start, end, duration: Math.max(0, end - start) };
  };

  const getDaySelectedMinutes = (dayRecord) =>
    dayRecord?.slots?.reduce((sum, slot) => sum + slotToMinutes(slot).duration, 0) || 0;

  // noOfSessionPerWeek = total hours allowed per week (e.g. 4 = 4 hours = 240 min)
  const getRequiredWeeklyMinutes = () => {
    const hours = Number(salesDetails?.noOfSessionPerWeek || 0);
    return hours > 0 ? hours * 60 : 0;
  };

  const getRequiredWeeklyHours = () => {
    return Number(salesDetails?.noOfSessionPerWeek || 0);
  };

  const getSelectedWeeklyMinutes = () => {
    if (!filtteredTimeSlot?.length) return 0;
    return filtteredTimeSlot.reduce((total, day) => total + getDaySelectedMinutes(day), 0);
  };

  const showToastError = (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
    });
  };

  const canUpdateSlotDuration = (dayofWeek, uniqueId, newStartMinutes, newEndMinutes) => {
    const requiredWeeklyMinutes = getRequiredWeeklyMinutes();
    let totalWeeklyMinutes = 0;
    let totalDayMinutes = 0;

    filtteredTimeSlot.forEach((day) => {
      let dayMinutes = 0;
      day?.slots?.forEach((slot) => {
        let slotMinutes =
          day.dayofWeek === dayofWeek && slot.uniqueId === uniqueId
            ? Math.max(0, newEndMinutes - newStartMinutes)
            : Math.max(
                0,
                Number(slot?.endMinutes ?? slot?.endTime ?? 0) -
                  Number(slot?.startMinutes ?? slot?.startTime ?? 0)
              );
        dayMinutes += slotMinutes;
        totalWeeklyMinutes += slotMinutes;
      });
      if (day.dayofWeek === dayofWeek) totalDayMinutes = dayMinutes;
    });

    if (totalDayMinutes > 120) {
      showToastError("You can select only 2 hours per day.");
      return false;
    }
    if (requiredWeeklyMinutes > 0 && totalWeeklyMinutes > requiredWeeklyMinutes) {
      showToastError(`Weekly limit is ${getRequiredWeeklyHours()} hours only.`);
      return false;
    }
    return true;
  };

  const sliderChangeCallback1 = useCallback(
    (value, _dataItem) => {
      const newStartMinutes = value[0];
      const newEndMinutes = value[1];
      const isApplyToAll = applyToAllDaysRef.current;

      // No live validation here — limits are checked on Save instead
      setFiltteredTimeSlot((prevState) =>
        prevState.map((day) =>
          isApplyToAll || day.dayInNo === _dataItem.dayInNo
            ? {
                ...day,
                slots: day.slots.map((slot) =>
                  slot.uniqueId === _dataItem.uniqueId
                    ? {
                        ...slot,
                        selectedTime: `${formatTime1(newStartMinutes)}-${formatTime1(newEndMinutes)}`,
                        startMinutes: newStartMinutes,
                        endMinutes: newEndMinutes,
                        startTime: formatTime1(newStartMinutes),
                        endTime: formatTime1(newEndMinutes),
                      }
                    : slot
                ),
              }
            : day
        )
      );
    },
    [filtteredTimeSlot]
  );

  const addNewTimeSlotHandler = (_day) => {
    const temp = [...filtteredTimeSlot];
    const currentItemIndex = temp.findIndex((s) => s.dayofWeek == _day);
    if (currentItemIndex === -1) return;

    let max = -Infinity;
    temp[currentItemIndex].slots.forEach((v) => {
      if (v.endMinutes > max) max = v.endMinutes;
    });
    if (!isFinite(max)) max = temp[currentItemIndex].startMinutes ?? 540;

    const newSlot = {
      dayInNo: temp[currentItemIndex].dayInNo,
      uniqueId: temp[currentItemIndex].slots.length + 1,
      dayofWeek: temp[currentItemIndex].dayofWeek,
      startTime: formatTime1(max),
      endTime: formatTime1(max + 60),
      startMinutes: max,
      endMinutes: max + 60,
      minMinutes: temp[currentItemIndex].startMinutes,
      maxMinutes: temp[currentItemIndex].endMinutes,
    };

    // No live validation — limits are checked on Save instead
    temp[currentItemIndex].slots.push(newSlot);
    setFiltteredTimeSlot([...temp]);
  };

  const removeSlotHandlerCallback = (dayOfWeek, index) => {
    const temp = [...filtteredTimeSlot];
    const currentItemIndex = temp.findIndex((s) => s.dayofWeek == dayOfWeek);
    temp[currentItemIndex].slots.splice(index, 1);
    setFiltteredTimeSlot([...temp]);
  };

  const onSubjectChangeHandler = async (input) => {
    setStudentFilteredSlots([]);
    setSalesDetails((prev) => ({ ...prev, tutorName: input.tutorName }));
    await tutorAvailablity(input.tutorId);
    await overlappingTimeSlot(input.tutorUserId, props.dataItem.stdUserId);
    setFormData((prev) => ({
      ...prev,
      weeklyDays: [],
    }));
    setStudentFilteredSlots(studentAvailableSlots);
  };

  const onSaveSchedule = () => {
    if (formData.scheduleMode === "Weekly" && moment(formData.endDate).isAfter(
      scheduledPackageEnd(formData.startDate, formData.noOfMonths), "day"
    )) {
      showToastError("End Date cannot be after Schedule End Date.");
      return;
    }

    const scheduleSlotRecords =
      formData.scheduleMode === "OneTime"
        ? (filtteredTimeSlot || []).filter(
            (record) => record.dayofWeek === moment(formData.startDate).format("dddd")
          )
        : filtteredTimeSlot || [];

    if (scheduleSlotRecords.length === 0) {
      showToastError("The tutor is not available on the selected start date.");
      return;
    }

    if (
      formData.scheduleMode === "FixedCount" &&
      (!Number.isInteger(Number(formData.totalClasses)) || Number(formData.totalClasses) < 1)
    ) {
      showToastError("Enter a valid total number of classes.");
      return;
    }

    // ── Validate daily (max 2 hrs = 120 min) and weekly total ─────────────────
    // noOfSessionPerWeek = total hours allowed per week (e.g. "4" = 4 hours = 240 min)
    const weeklyHours = Number(salesDetails?.noOfSessionPerWeek || 0);
    const weeklyCapMinutes = weeklyHours > 0 ? weeklyHours * 60 : 0;

    let totalWeeklyMinutes = 0;
    for (const day of scheduleSlotRecords) {
      const dayMinutes = day.slots.reduce((sum, slot) => {
        const start = Number(slot.startMinutes ?? 0);
        const end   = Number(slot.endMinutes   ?? 0);
        return sum + Math.max(0, end - start);
      }, 0);

      totalWeeklyMinutes += dayMinutes;

      if (dayMinutes > MAX_DAILY_MINUTES) {
        const hrs = (dayMinutes / 60).toFixed(1);
        showToastError(`${day.dayofWeek}: ${hrs}h selected, maximum is 2 hours per day.`);
        return;
      }
    }

    if (formData.scheduleMode === "Weekly" && weeklyCapMinutes > 0) {
      const totalHrs = (totalWeeklyMinutes / 60).toFixed(1);
      if (totalWeeklyMinutes < weeklyCapMinutes) {
        showToastError(`Total ${totalHrs}h selected, you must select exactly ${weeklyHours}h per week.`);
        return;
      }
      if (totalWeeklyMinutes > weeklyCapMinutes) {
        showToastError(`Total ${totalHrs}h selected, weekly limit is ${weeklyHours}h.`);
        return;
      }
    }

    let errorMessage = "";
    let isError = false;

    for (let i = 0; i < scheduleSlotRecords.length; i++) {
      const record = scheduleSlotRecords[i];

      if (findOverlappingIndices(record.slots).length > 0) {
        errorMessage = "Time slot overlapping....";
        isError = true;
        break;
      }

      // Allocated slots here are aggregated by weekday, not by the dates in
      // this one-time schedule. The API checks each proposed class date for
      // tutor and student conflicts before saving any classes.
      if (formData.scheduleMode !== "FixedCount") {
        const tutorSlots =
          tutorAvailableSlots.find((s) => s.day == record.dayofWeek)?.timeSlots?.filter((s) => s.isAllocated) || [];
        if (findOverlapsInAllocatedSlots(record.slots, tutorSlots).length > 0) {
          errorMessage = "Conflict in tutor available slots....";
          isError = true;
          break;
        }

        const studentSlots =
          studentAvailableSlots?.find((s) => s.day == record.dayofWeek)?.timeSlots?.filter((s) => s.isAllocated) || [];
        if (findOverlapsInAllocatedSlots(record.slots, studentSlots).length > 0) {
          errorMessage = "Conflict in student available slots....";
          isError = true;
          break;
        }
      }
    }

    if (isError) {
      showToastError(errorMessage);
      return;
    }

    const _timeSlots = scheduleSlotRecords.map((record) => ({
      Day: record.dayofWeek,
      SalesId: props?.dataItem.salesId,
      SalesDetailsId: props?.dataItem.saleDetailsId,
      StartDate: formData?.startDate,
      IsRecurrence: formData.scheduleMode === "Weekly",
      EndDate: formData?.endDate,
      NoOfMonths: formData.scheduleMode === "Weekly" ? formData.noOfMonths : null,
      DayInNo: record?.dayInNo,
      TimeSlots: record.slots.map((item) => ({
        StartTime: convertToTimeSpan(item?.startTime),
        EndTime: convertToTimeSpan(item?.endTime),
        Day: item.dayofWeek,
        Color: "",
      })),
    }));

    const inputData = {
      SalesId: props?.dataItem.salesId,
      SalesDetailsId: props?.dataItem.saleDetailsId,
      TutorId: props?.dataItem.tutorId,
      StudentId: props?.dataItem.studentId,
      SubjectId: props?.dataItem.subjectId,
      StartDate: formData?.startDate,
      ScheduleStatus: unFillterdStatusList.find((s) => s.code == FollowUpStatus.Schedule)?.id,
      ScheduleType: 100501,
      UserId: userId,
      Title: formData?.title,
      MeetingLink: formData?.meetingLink,
      IsRecurrence: formData.scheduleMode === "Weekly",
      EndDate: formData?.endDate,
      NoOfMonths: formData.scheduleMode === "Weekly" ? formData.noOfMonths : null,
      ScheduleEndDate: formData.scheduleMode === "Weekly"
        ? scheduledPackageEnd(formData.startDate, formData.noOfMonths).toDate()
        : null,
      ScheduleMode: formData.scheduleMode,
      TotalClasses: formData.scheduleMode === "FixedCount" ? Number(formData.totalClasses) : null,
      TimeSlotGroup: _timeSlots,
    };

    setSaving(true);
    scheduleEvent(inputData)
      .then((response) => {
        if (response?.succeeded === false) {
          showToastError(response?.message || "Unable to schedule the class.");
          return;
        }
        toast.success("Class scheduled successfully.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        setIsModalOpen(false);
        props.modalStateChange("success");
      })
      .catch((error) => {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.title ||
          error?.message ||
          "Unable to schedule the class. Please check the selected time.";
        toast.error(message, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const { errors, register, handleSubmit } = useForm({});

  return (
    <>
      {props?.type == FollowUpStatus.NeedToSchedule ? (
        <Modal
          scrollable={true}
          key={"modal123"}
          isOpen={isModalOpen}
          toggle={() => {
            setIsModalOpen(false);
            props.modalStateChange("closeaction");
          }}
          className="modal-dialog-centered custom-modal"
          size="xl"
        >
          <ModalHeader
            close={
              <div>
                <Button color="primary" type="button" disabled={saving} onClick={onSaveSchedule}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-1" /> Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
                <button
                  className="close"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setIsModalOpen(false);
                    props.modalStateChange("closeaction");
                  }}
                >
                  <Icon name="cross" />
                </button>
              </div>
            }
          >
            Schedule {salesDetails.subjectName} Class for <i>{salesDetails.studentName}</i>
          </ModalHeader>
          <ModalBody>
            <Form className="row gy-1" ref={formRef} noValidate onSubmit={handleSubmit(onStatusUpdateHandler)}>
              {/* Coordinator / Tutor */}
              <Row className="col-md-12">
                <Col md="2">
                  <FormGroup>
                    <label className="overline-title">Coordinator:</label>
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <p>{salesDetails.coordinatorName}</p>
                  </FormGroup>
                </Col>
                <Col sm="2">
                  <FormGroup>
                    <label className="overline-title">Tutor:</label>
                  </FormGroup>
                </Col>
                <Col sm="3">
                  <FormGroup>
                    <p>{salesDetails.tutorName}</p>
                  </FormGroup>
                </Col>
              </Row>

              {/* Board / Grade */}
              <Row className="col-md-12">
                <Col sm="2">
                  <FormGroup>
                    <label className="overline-title">Board:</label>
                  </FormGroup>
                </Col>
                <Col sm="4">
                  <FormGroup>
                    <p>{salesDetails.boardName}</p>
                  </FormGroup>
                </Col>
                <Col md="2">
                  <FormGroup>
                    <label className="overline-title">Grade:</label>
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <p>{salesDetails.gradeName}</p>
                  </FormGroup>
                </Col>
              </Row>

              {/* Subject + schedule mode */}
              {subjects && (
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Select Subject</label>
                      <div className="form-control-wrap">
                        <Row className="col-md-12">
                          {subjects.map((sub, index) => (
                            <Col md="3" sm="6" key={index}>
                              <div className="preview-block">
                                <div className="custom-control custom-radio">
                                  <input
                                    type="radio"
                                    id={sub.subjectName}
                                    name="subject"
                                    value={sub.saleDetailsId}
                                    onChange={() => {
                                      setFormData({ ...formData, subjectId: sub.subjectId });
                                      onSubjectChangeHandler(sub);
                                    }}
                                    defaultChecked={sub.saleDetailsId == props.dataItem.saleDetailsId}
                                    className="custom-control-input form-control"
                                  />
                                  <label className="custom-control-label" htmlFor={sub.subjectName}>
                                    {sub.subjectName}
                                  </label>
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label d-block">Schedule Type</label>
                      <div className="d-flex flex-wrap align-items-center" role="radiogroup" aria-label="Schedule Type">
                        {[
                          { value: "FixedCount", label: "One-time" },
                          { value: "Weekly", label: "Recurring" },
                        ].map(({ value, label }) => (
                          <div className="custom-control custom-radio mr-4 mb-2" key={value}>
                            <input
                              type="radio"
                              className="custom-control-input"
                              id={`scheduleMode_${value}`}
                              name="scheduleMode"
                              value={value}
                              checked={formData.scheduleMode === value}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  scheduleMode: value,
                                  IsRecurrence: value === "Weekly",
                                  endDate:
                                    value === "FixedCount"
                                      ? moment(prev.startDate).endOf("month").toDate()
                                      : prev.endDate,
                                }))
                              }
                            />
                            <label className="custom-control-label" htmlFor={`scheduleMode_${value}`}>
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                      {formData.scheduleMode === "FixedCount" && (
                        <div className="mt-2">
                          <label className="form-label">Total Classes</label>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            className="form-control"
                            value={formData.totalClasses}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, totalClasses: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      <small className="text-muted mt-1 d-block">
                        {formData.scheduleMode === "Weekly" &&
                          "Creates the selected weekdays through End Date; subsequent months are scheduled after approval, up to Schedule End Date."}
                        {formData.scheduleMode === "FixedCount" &&
                          `Creates exactly ${Number(formData.totalClasses) || 0} class${Number(formData.totalClasses) === 1 ? "" : "es"} on the selected weekdays this month, with no automatic rollover.`}
                      </small>
                    </FormGroup>
                  </Col>
                </Row>
              )}

              {/* Title / Meeting Link */}
              <Row className="col-md-12">
                <Col md="6">
                  <FormGroup>
                    <label className="form-label" htmlFor="title">
                      Title
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter title"
                      ref={register({ required: "This field is required" })}
                    />
                    {errors.title && <span className="invalid">{errors.title.message}</span>}
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <label className="form-label" htmlFor="meetingLink">
                      Meeting Link
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      name="meetingLink"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      placeholder="Enter meeting link"
                      ref={register({ required: "This field is required" })}
                    />
                    {errors.meetingLink && <span className="invalid">{errors.meetingLink.message}</span>}
                  </FormGroup>
                </Col>
              </Row>

              {/* Day selector + Dates */}
              <Row className="col-md-12">
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">Select Day</label>
                    <Row className="col-md-12">
                      {WeekDays.map((day) => {
                        const isAvailable = isTutorAvailableOnDay(day.value);
                        const isSelected = formData.weeklyDays.includes(day.value);
                        const requiredSessionCount = getRequiredSessionCount();
                        const isDisabled = !isAvailable;
                        const tooltipText = !isAvailable
                          ? `Tutor not available on ${day.value}`
                          : "";
                        return (
                          <Col key={`weekdays_${day.value}`}>
                            <div className="form-control-wrap days-wrap ml-1 mr-1">
                              <Button
                                type="button"
                                disabled={isDisabled}
                                title={tooltipText}
                                className={isSelected ? "btn-primary" : "btn-repeat"}
                                style={isDisabled ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                                onClick={() => toggleWeekDay(day.value)}
                              >
                                {day.label}
                              </Button>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                    <small className="text-muted mt-1 d-block">
                      {(() => {
                        const weeklyHrs = getRequiredWeeklyHours();
                        if (formData.scheduleMode === "Weekly" && weeklyHrs > 0) {
                          const selectedMins = getSelectedWeeklyMinutes();
                          const selectedHrs = (selectedMins / 60).toFixed(1);
                          return `${selectedHrs}h / ${weeklyHrs}h selected (must select exactly ${weeklyHrs}h). Greyed out days indicate tutor unavailability.`;
                        }
                        return "Select the weekdays and times for this month's classes. Greyed out days indicate tutor unavailability.";
                      })()}
                    </small>
                    <div className="custom-control custom-control-sm custom-checkbox mt-1">
                      <input
                        type="checkbox"
                        className="custom-control-input form-control"
                        id="class_applyToAll"
                        checked={applyToAllDays}
                        onChange={() => {
                          const next = !applyToAllDays;
                          applyToAllDaysRef.current = next;
                          setApplyToAllDays(next);
                          if (next) {
                            setFiltteredTimeSlot((prev) => {
                              const sourceDay = prev?.[0];
                              if (!sourceDay) return prev;
                              return prev.map((targetDay, index) =>
                                index === 0
                                  ? targetDay
                                  : { ...targetDay, slots: copySlotsToDay(sourceDay.slots, targetDay) },
                              );
                            });
                          }
                        }}
                      />
                      <label className="custom-control-label" htmlFor="class_applyToAll">
                        Apply time to all selected days
                      </label>
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6">
                  {formData.scheduleMode === "Weekly" && <Row>
                    <Col sm="6">
                      <FormGroup>
                        <label className="form-label">No. of Months</label>
                        <select
                          className="form-control"
                          value={formData.noOfMonths}
                          onChange={(e) =>
                            setFormData((prev) => {
                              const noOfMonths = Number(e.target.value);
                              const scheduleEndDate = scheduledPackageEnd(prev.startDate, noOfMonths).toDate();
                              return {
                                ...prev,
                                noOfMonths,
                                endDate: prev.endDate > scheduleEndDate ? scheduleEndDate : prev.endDate,
                              };
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                            .filter((month) =>
                              !scheduledPackageEnd(formData.startDate, month)
                                .isAfter(scheduledPackageEnd(new Date(), 10), "day")
                            )
                            .map((month) => (
                              <option key={month} value={month}>
                                {month} month{month > 1 ? "s" : ""}
                              </option>
                            ))}
                        </select>
                      </FormGroup>
                    </Col>
                    <Col sm="6">
                      <FormGroup>
                        <label className="form-label">Schedule End Date</label>
                        <DatePicker
                          selected={scheduledPackageEnd(formData.startDate, formData.noOfMonths).toDate()}
                          disabled
                          className="form-control date-picker w-100"
                        />
                      </FormGroup>
                    </Col>
                  </Row>}
                  <Row>
                    <Col sm="6">
                      <FormGroup>
                        <label className="form-label">Start Date</label>
                        <DatePicker
                          placeholderText="Select start date"
                          selected={formData?.startDate}
                          minDate={new Date()}
                          maxDate={moment().add(9, "months").toDate()}
                          onChange={(date) =>
                            setFormData((prev) => {
                              const allowedMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
                                (months) =>
                                  !scheduledPackageEnd(date, months)
                                    .isAfter(scheduledPackageEnd(new Date(), 10), "day")
                              );
                              const noOfMonths = Math.min(prev.noOfMonths, Math.max(...allowedMonths));
                              const academicEnd = scheduledPackageEnd(date, noOfMonths).toDate();
                              return {
                                ...prev,
                                startDate: date,
                                noOfMonths,
                                endDate:
                                  prev.scheduleMode === "FixedCount"
                                    ? moment(date).endOf("month").toDate()
                                    : prev.endDate < date
                                    ? date
                                    : prev.endDate > academicEnd
                                    ? academicEnd
                                    : prev.endDate,
                              };
                            })
                          }
                          className="form-control date-picker w-100"
                        />
                      </FormGroup>
                    </Col>
                    <Col sm="6">
                      <FormGroup>
                        <label className="form-label">End Date</label>
                        <DatePicker
                          placeholderText="Select end date"
                          selected={formData?.endDate}
                          minDate={formData?.startDate}
                          maxDate={
                            formData.scheduleMode === "FixedCount"
                              ? moment(formData.startDate).endOf("month").toDate()
                              : scheduledPackageEnd(formData.startDate, formData.noOfMonths).toDate()
                          }
                          onChange={(date) =>
                            setFormData((prev) => ({ ...prev, endDate: date }))
                          }
                          className="form-control date-picker w-100"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Time slot sliders */}
              <Row className="col-md-12">
                <Col md="12">
                  {filtteredTimeSlot &&
                    filtteredTimeSlot.map((elem) => (
                      <div key={elem.dayofWeek} className="row border border-primary rounded mb-1">
                        <div className="col-md-1" style={{ lineHeight: "50px" }}>
                          {elem?.dayofWeek}
                        </div>
                        <div className="col-md-11">
                          <DragTimeRangePicker
                            key={`class_picker_${elem.dayofWeek}_${applyToAllDays}_${(elem.slots || [])
                              .map((s) => `${s.startMinutes}-${s.endMinutes}`)
                              .join(",")}`}
                            component_key={elem.dayofWeek}
                            slots={elem.slots}
                            dayOfWeek={elem.dayofWeek}
                            sliderChangeCallback={sliderChangeCallback1}
                            addSlotHandlerCallback={(_day) => addNewTimeSlotHandler(_day)}
                            removeSlotHandlerCallback={(_dayOfWeek, _index) =>
                              removeSlotHandlerCallback(_dayOfWeek, _index)
                            }
                          />
                        </div>
                      </div>
                    ))}
                </Col>
              </Row>

              {/* Availability progress bars */}
              <Row className="col-md-12">
                <Col md="6">
                  <Row className="col-md-12">
                    <Col md="12">
                      <FormGroup>
                        <label className="overline-title">Tutor Available Slots:</label>
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      {tutorFilteredSlots && (
                        <UserAvailableSlotsProgressBar type="tutor" dataSource={tutorFilteredSlots} />
                      )}
                    </Col>
                  </Row>
                </Col>
                <Col md="6">
                  <Row className="col-md-12">
                    <Col md="12">
                      <FormGroup>
                        <label className="overline-title">Student Available Slots:</label>
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      {studentFilteredSlots && (
                        <UserAvailableSlotsProgressBar type="student" dataSource={studentFilteredSlots} />
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Form>
          </ModalBody>
        </Modal>
      ) : (
        <Modal
          scrollable={true}
          isOpen={isModalOpen}
          toggle={() => {
            setIsModalOpen(false);
            props.modalStateChange(false);
          }}
          className="modal-dialog-centered totur-modal"
          size="lg"
        >
          <ModalHeader
            close={
              <button
                className="close"
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  props.modalStateChange(false);
                }}
              >
                <Icon name="cross" />
              </button>
            }
          >
            Change Status
          </ModalHeader>
          <ModalBody className="totur-modal-body">
            <Content />
          </ModalBody>
          <ModalFooter className="bg-light">
            <Col size="12">
              <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                <li>
                  <Button
                    color="primary"
                    size="md"
                    onClick={() => formRef.current.props.onSubmit()}
                  >
                    Update
                  </Button>
                </li>
                <li>
                  <a
                    href="#cancel"
                    onClick={(ev) => {
                      ev.preventDefault();
                      setIsModalOpen(false);
                      props.modalStateChange(false);
                    }}
                    className="link link-light"
                  >
                    Cancel
                  </a>
                </li>
              </ul>
            </Col>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default ClassStatusUpdate;

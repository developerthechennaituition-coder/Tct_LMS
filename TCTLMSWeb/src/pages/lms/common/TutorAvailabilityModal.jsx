import React, { useCallback, useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { Form, FormGroup, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  Button,
  Col,
  Icon,
  PreviewCard,
  Row,
} from "../../../components/Component";
import {
  addUserTimeSlots,
  getUserAvailability,
  getUserSlotsByDay,
  removeTimeSlot,
  updateTimeSlots,
} from "../../../apiservices/UserService";
import { WeekDays, convertToTimeSpan, formatTime24 } from "../../../utils/Utils";
import DragTimeRangePicker from "./DraggableTimePicker";

const defaultGuid = "00000000-0000-0000-0000-000000000000";
const DAY_ORDER = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
const hhmmssToMinutes = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

const makeEmptySlot = (dayInNo, dayofWeek, uniqueId = 0) => ({
  dayInNo,
  uniqueId,
  dayofWeek,
  startTime: "09:00",
  startMinutes: 540,
  endTime: "17:00",
  endMinutes: 1020,
  minMinutes: 0,
  maxMinutes: 1440,
  selectedTime: "09:00-17:00",
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

const INITIAL_FILTERED_SLOT = [makeEmptyDay(0, "Sunday")];

const baseTimeSlots = [
  makeEmptyDay(0, "Sunday"),
  makeEmptyDay(1, "Monday"),
  makeEmptyDay(2, "Tuesday"),
  makeEmptyDay(3, "Wednesday"),
  makeEmptyDay(4, "Thursday"),
  makeEmptyDay(5, "Friday"),
  makeEmptyDay(6, "Saturday"),
];

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

// Rebuild the picker state from a previously captured draft payload (slotList shape).
const hydrateFromSlotList = (slotList) => {
  const grouped = {};
  (slotList || []).forEach((item) => {
    const day = item.Day || item.day;
    if (!day) return;
    const startHH = (item.StartTime || item.startTime || "").slice(0, 5);
    const endHH = (item.EndTime || item.endTime || "").slice(0, 5);
    if (!startHH || !endHH) return;
    const startMins = hhmmssToMinutes(startHH);
    const endMins = hhmmssToMinutes(endHH);
    if (startMins >= endMins) return;
    const dayInNo = DAY_ORDER[day] ?? 0;
    if (!grouped[day]) {
      grouped[day] = { dayInNo, dayofWeek: day, slots: [], startMinutes: 0, endMinutes: 1440, minMinutes: 0, maxMinutes: 1440 };
    }
    grouped[day].slots.push({
      dayInNo,
      uniqueId: grouped[day].slots.length,
      dayofWeek: day,
      startTime: formatTime24(startMins),
      startMinutes: startMins,
      endTime: formatTime24(endMins),
      endMinutes: endMins,
      minMinutes: 0,
      maxMinutes: 1440,
      selectedTime: `${formatTime24(startMins)}-${formatTime24(endMins)}`,
    });
  });
  return Object.values(grouped).filter((d) => d.slots.length > 0).sort((a, b) => a.dayInNo - b.dayInNo);
};

const TutorAvailabilityModal = ({ isOpen, userId, loggedInUserId, onClose, onSaved, draftMode = false, initialDraft = null }) => {
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const applyToAllDaysRef = useRef(false);
  const [filtteredTimeSlot, setFiltteredTimeSlot] = useState(INITIAL_FILTERED_SLOT);

  const [formData, setFormData] = useState({
    weeklyDays: ["Sunday"],
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(),
  });

  useEffect(() => {
    applyToAllDaysRef.current = applyToAllDays;
  }, [applyToAllDays]);

  const resetForm = () => {
    setFormData({ weeklyDays: ["Sunday"], isRecurring: true, startDate: new Date(), endDate: new Date() });
    setIsEdit(false);
    setApplyToAllDays(false);
    applyToAllDaysRef.current = false;
    setFiltteredTimeSlot(INITIAL_FILTERED_SLOT);
  };

  useEffect(() => {
    if (!isOpen || !draftMode) return;
    const days = hydrateFromSlotList(initialDraft?.slotList);
    if (days.length === 0) {
      resetForm();
      return;
    }
    setIsEdit(false);
    setFormData((prev) => ({
      ...prev,
      weeklyDays: days.map((d) => d.dayofWeek),
      isRecurring: initialDraft?.isRecurring ?? true,
      startDate: initialDraft?.startDate ? new Date(initialDraft.startDate) : new Date(),
      endDate: initialDraft?.endDate ? new Date(initialDraft.endDate) : new Date(),
    }));
    setFiltteredTimeSlot(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftMode]);

  useEffect(() => {
    if (!isOpen || draftMode || !userId) return;
    getUserAvailability(userId)
      .then((response) => {
        if (!Array.isArray(response) || response.length === 0) return;
        const grouped = {};
        response.forEach((item) => {
          const day = item.dayOfWeek;
          if (!day) return;
          const startHH = item.startTime ? item.startTime.slice(11, 19) : null;
          const endHH = item.endTime ? item.endTime.slice(11, 19) : null;
          if (!startHH || !endHH) return;
          const startMins = hhmmssToMinutes(startHH);
          const endMins = hhmmssToMinutes(endHH);
          if (startMins >= endMins) return;
          if (!grouped[day]) {
            grouped[day] = { dayInNo: DAY_ORDER[day] ?? 0, dayofWeek: day, slots: [], startMinutes: 0, endMinutes: 1440, minMinutes: 0, maxMinutes: 1440 };
          }
          grouped[day].slots.push({
            dayInNo: DAY_ORDER[day] ?? 0,
            uniqueId: grouped[day].slots.length,
            dayofWeek: day,
            startTime: formatTime24(startMins),
            startMinutes: startMins,
            endTime: formatTime24(endMins),
            endMinutes: endMins,
            minMinutes: 0,
            maxMinutes: 1440,
            selectedTime: `${formatTime24(startMins)}-${formatTime24(endMins)}`,
            slotId: item.userAvailabilityId,
          });
        });
        const days = Object.values(grouped).filter((d) => d.slots.length > 0).sort((a, b) => a.dayInNo - b.dayInNo);
        if (days.length === 0) return;
        const firstItem = response.find((r) => r.startDate);
        setIsEdit(true);
        setFormData((prev) => ({
          ...prev,
          weeklyDays: days.map((d) => d.dayofWeek),
          isRecurring: response[0]?.isRecurring ?? true,
          startDate: firstItem?.startDate ? new Date(firstItem.startDate) : new Date(),
          endDate: firstItem?.endDate ? new Date(firstItem.endDate) : new Date(),
        }));
        setFiltteredTimeSlot(days);
      })
      .catch(() => {});
  }, [isOpen, userId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onFormSubmit = () => {
    if (loading) return;
    let _slots = [];
    filtteredTimeSlot.forEach((record) => {
      const slots = (record.slots || record.Slots || []).map((item) => ({
        StartTime: convertToTimeSpan(item?.startTime),
        EndTime: convertToTimeSpan(item?.endTime),
        Day: item.dayofWeek || item.dayOfWeek,
        DayofWeek: item.dayInNo,
        Id: item?.slotId || defaultGuid,
      }));
      _slots = [..._slots, ...slots];
    });

    const _inputData = {
      loggedInUserId,
      userId,
      isRecurring: formData.isRecurring,
      startDate: formData.startDate,
      endDate: formData.endDate,
      slotList: _slots,
    };

    if (!_slots.length || _slots.some((slot) => !slot.Day || slot.StartTime >= slot.EndTime)) {
      toast.error("Select at least one valid time slot; end time must be after start time.");
      return;
    }
    if (!formData.isRecurring && (!formData.endDate || formData.endDate < formData.startDate)) {
      toast.error("End date must be on or after start date.");
      return;
    }

    if (draftMode) {
      if (_slots.length === 0) {
        toast.error("Please select at least one day and time slot.", { position: "top-right", autoClose: true });
        return;
      }
      onSaved(_inputData);
      resetForm();
      return;
    }

    setLoading(true);
    const apiCall = isEdit ? updateTimeSlots(_inputData) : addUserTimeSlots(_inputData);
    apiCall
      .then((response) => {
        const result = response?.data && typeof response.data === "object" ? response.data : response;
        if (result?.succeeded !== false && (result === true || result?.data === true)) {
          toast.success(isEdit ? "Time slots updated successfully." : "Availability slot saved successfully.", {
            position: "top-right", autoClose: true, hideProgressBar: true,
            closeOnClick: true, pauseOnHover: true, draggable: true, progress: false,
          });
          resetForm();
          onSaved();
        } else {
          toast.error(response?.message || "Failed to save.", { position: "top-right", autoClose: true });
        }
      })
      .catch(() => toast.error("Failed to save availability."))
      .finally(() => setLoading(false));
  };

  const toggleWeekDay = (day) => {
    setFormData((prev) => {
      const next = prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter((d) => d !== day)
        : [...prev.weeklyDays, day];
      return { ...prev, weeklyDays: next };
    });

    setTimeout(() => {
      setFiltteredTimeSlot((prev) => {
        let temp = formData.weeklyDays.includes(day)
          ? formData.weeklyDays.filter((d) => d !== day)
          : [...formData.weeklyDays, day];

        const existing = prev.filter((r) => temp.includes(r.dayofWeek || r.dayOfWeek));
        const newDays = baseTimeSlots.filter(
          (ts) => temp.includes(ts.dayofWeek) && !existing.find((e) => (e.dayofWeek || e.dayOfWeek) === ts.dayofWeek),
        );
        let result = [...existing, ...newDays].sort((a, b) => a.dayInNo - b.dayInNo);
        if (applyToAllDaysRef.current) {
          const sourceDay = result.find((d) => (d.slots || []).some((slot) => slot.selectedTime));
          if (sourceDay) {
            const sourceName = sourceDay.dayofWeek || sourceDay.dayOfWeek;
            result = result.map((targetDay) =>
              (targetDay.dayofWeek || targetDay.dayOfWeek) === sourceName
                ? targetDay
                : { ...targetDay, slots: copySlotsToDay(sourceDay.slots, targetDay) },
            );
          }
        }
        return result;
      });
    }, 2);
  };

  const addNewTimeSlotHandler = (_day) => {
    setFiltteredTimeSlot((prev) => {
      const temp = [...prev];
      const idx = temp.findIndex((s) => (s.dayofWeek || s.dayOfWeek) === _day);
      if (idx === -1) return prev;
      const max = Math.max(...temp[idx].slots.map((s) => s.endMinutes), 0);
      const updatedSourceDay = {
        ...temp[idx],
        slots: [
          ...temp[idx].slots,
          {
            dayInNo: temp[idx].dayInNo,
            uniqueId: temp[idx].slots.length + 1,
            dayofWeek: temp[idx].dayofWeek,
            startTime: max,
            endTime: max + 60,
            startMinutes: max,
            endMinutes: max + 60,
            minMinutes: temp[idx].startMinutes,
            maxMinutes: temp[idx].endMinutes,
          },
        ],
      };
      temp[idx] = updatedSourceDay;
      if (applyToAllDaysRef.current) {
        return temp.map((targetDay, dayIndex) =>
          dayIndex === idx
            ? targetDay
            : { ...targetDay, slots: copySlotsToDay(updatedSourceDay.slots, targetDay) },
        );
      }
      return temp;
    });
  };

  const removeSlotHandlerCallback = (dayOfWeek, index) => {
    setFiltteredTimeSlot((prev) => {
      const temp = [...prev];
      const idx = temp.findIndex((s) => (s.dayofWeek || s.dayOfWeek) === dayOfWeek);
      if (idx === -1) return prev;
      const slotId = temp[idx].slots[index]?.slotId;
      if (slotId) {
        Swal.fire({
          title: "Are you sure?", text: "You won't be able to revert this!", icon: "warning",
          showCancelButton: true, confirmButtonText: "Yes, delete it!",
        }).then((result) => {
          if (result.isConfirmed) {
            removeTimeSlot({ loggedInUserId, id: slotId })
              .then(() => {
                toast.success("Time slot deleted.", { position: "top-right", autoClose: true });
                setFiltteredTimeSlot((p) => {
                  const t = [...p];
                  const i = t.findIndex((s) => (s.dayofWeek || s.dayOfWeek) === dayOfWeek);
                  if (i === -1) return p;
                  t[i] = { ...t[i], slots: t[i].slots.filter((_, si) => si !== index) };
                  return t;
                });
              })
              .catch(() => toast.error("Failed to delete slot."));
          }
        });
      } else {
        temp[idx] = { ...temp[idx], slots: temp[idx].slots.filter((_, si) => si !== index) };
        return temp;
      }
      return prev;
    });
  };

  const sliderChangeCallback = useCallback((value, _dataItem) => {
    const isApplyToAll = applyToAllDaysRef.current;
    const itemDayName = _dataItem.dayofWeek || _dataItem.dayOfWeek;
    const updatedSlot = {
      selectedTime: `${formatTime24(Number(value[0]))}-${formatTime24(Number(value[1]))}`,
      startMinutes: Number(value[0]),
      endMinutes: Number(value[1]),
      startTime: formatTime24(Number(value[0])),
      endTime: formatTime24(Number(value[1])),
    };
    setFiltteredTimeSlot((prev) =>
      prev.map((day) => {
        const dayName = day.dayofWeek || day.dayOfWeek;
        if (!isApplyToAll && dayName !== itemDayName) return day;
        return {
          ...day,
          slots: day.slots.map((slot) =>
            slot.uniqueId === _dataItem.uniqueId ? { ...slot, ...updatedSlot } : slot,
          ),
        };
      }),
    );
  }, []);

  return (
    <Modal isOpen={isOpen} toggle={handleClose} className="modal-dialog-centered" size="xl">
      <ModalHeader toggle={handleClose}>{isEdit ? "Edit Availability Slots" : "Add Availability Slots"}</ModalHeader>
      <ModalBody className="pb-0 pt-0">
        <PreviewCard>
          <Form className="row pb-0 pt-0" noValidate>
            <Row className="col-md-12">
              <Col md="12">
                <div className="custom-control custom-control-sm custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input form-control"
                    id="avail_isRecurring"
                    checked={formData.isRecurring}
                    onChange={() => setFormData((p) => ({ ...p, isRecurring: !p.isRecurring }))}
                  />
                  <label className="custom-control-label" htmlFor="avail_isRecurring">Recurring</label>
                </div>
              </Col>
            </Row>
            <Row className="col-md-12 pb-1">
              <Col md="6">
                <FormGroup>
                  <label className="form-label">Select Day</label>
                  <Row className="col-md-12">
                    {WeekDays.map((day) => (
                      <Col key={`avail_day_${day.value}`}>
                        <div className="form-control-wrap days-wrap ml-1 mr-1">
                          <Button
                            type="button"
                            className={formData.weeklyDays.includes(day.value) ? "btn-primary" : "btn-repeat"}
                            onClick={() => toggleWeekDay(day.value)}
                          >
                            {day.label}
                          </Button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </FormGroup>
              </Col>
              <Col md="6">
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Start Date</label>
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={new Date(formData.startDate)}
                          minDate={new Date()}
                          onChange={(date) => setFormData((p) => ({ ...p, startDate: date }))}
                          className="form-control date-picker"
                          showMonthDropdown showYearDropdown dropdownMode="select"
                        />
                      </div>
                    </FormGroup>
                  </Col>
                  {!formData.isRecurring && (
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">End Date</label>
                        <div className="form-control-wrap">
                          <DatePicker
                            selected={formData.endDate}
                            minDate={new Date()}
                            onChange={(date) => setFormData((p) => ({ ...p, endDate: date }))}
                            className="form-control date-picker"
                            showMonthDropdown showYearDropdown dropdownMode="select"
                          />
                        </div>
                      </FormGroup>
                    </Col>
                  )}
                </Row>
              </Col>
            </Row>
            <Row className="col-md-12 pb-1">
              <Col md="12">
                <div className="custom-control custom-control-sm custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input form-control"
                    id="avail_applyToAll"
                    checked={applyToAllDays}
                    onChange={() => {
                      const next = !applyToAllDays;
                      applyToAllDaysRef.current = next;
                      setApplyToAllDays(next);
                      if (next) {
                        setFiltteredTimeSlot((prev) => {
                          const sourceDay = prev.find((d) => (d.slots || []).some((s) => s.selectedTime));
                          if (!sourceDay) return prev;
                          const sourceName = sourceDay.dayofWeek || sourceDay.dayOfWeek;
                          return prev.map((targetDay) =>
                            (targetDay.dayofWeek || targetDay.dayOfWeek) === sourceName
                              ? targetDay
                              : { ...targetDay, slots: copySlotsToDay(sourceDay.slots, targetDay) },
                          );
                        });
                      }
                    }}
                  />
                  <label className="custom-control-label" htmlFor="avail_applyToAll">Apply time to all selected days</label>
                </div>
              </Col>
            </Row>
            <Row className="col-md-12">
              <Col md="12">
                {filtteredTimeSlot.map((elem, index) => {
                  const dayName = elem?.dayofWeek || elem?.dayOfWeek;
                  return (
                    <div key={`avail_slot_${dayName}`} className="row border border-primary rounded mb-1">
                      <div className="col-md-2 d-flex align-items-center">{dayName}</div>
                      <div className="col-md-10">
                        <DragTimeRangePicker
                          key={`avail_picker_${dayName}_${applyToAllDays}_${(elem.slots || []).map((s) => `${s.startMinutes}-${s.endMinutes}`).join(",")}`}
                          component_key={"avail_slots" + index}
                          slots={elem.slots || elem.Slots}
                          dayOfWeek={dayName}
                          use24Hour
                          sliderChangeCallback={sliderChangeCallback}
                          addSlotHandlerCallback={addNewTimeSlotHandler}
                          removeSlotHandlerCallback={removeSlotHandlerCallback}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!filtteredTimeSlot || filtteredTimeSlot.length === 0) && (
                  <div className="row border border-primary rounded mb-1">
                    <div className="col-md-12 text-center pt-2 pb-2">
                      <span className="tb-status text-warning">Please select a day to add slots.</span>
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          </Form>
        </PreviewCard>
      </ModalBody>
      <ModalFooter className="pb-1 pt-1">
        <Button color="primary mr-1" onClick={onFormSubmit} disabled={loading}>
          {loading ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update Slot" : "Add Slot"}
        </Button>
        <Button color="secondary" onClick={handleClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};

export default TutorAvailabilityModal;

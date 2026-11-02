import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
// reactstrap's Button: it really disables the element (the theme's Button only adds a "disabled" class).
import { Button, Modal, ModalBody, ModalHeader, ModalFooter, Spinner } from "reactstrap";
import { getSupportedTimeZones, updateUserTimeZone } from "../../../apiservices/TimeZoneService";

// "UTC+05:30" for the zone right now (it changes with daylight saving), or "" if this browser does not know the zone.
export const formatUtcOffset = (timeZoneId, date = new Date()) => {
  if (!timeZoneId) return "";
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: timeZoneId, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName");
    if (part && /^GMT([+-]\d{2}:\d{2})?$/.test(part.value)) return part.value === "GMT" ? "UTC+00:00" : part.value.replace("GMT", "UTC");
  } catch (e) {
    // Older browsers: no "longOffset"; fall through to the manual calculation.
  }
  try {
    const wall = (zone) => new Date(date.toLocaleString("en-US", { timeZone: zone }));
    const minutes = Math.round((wall(timeZoneId) - wall("UTC")) / 60000);
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  } catch (e) {
    return "";
  }
};

// The browser's own name for a zone, so an alias it reports (e.g. "Asia/Calcutta") matches the server's ID ("Asia/Kolkata").
const browserZoneName = (timeZoneId) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timeZoneId }).resolvedOptions().timeZone;
  } catch (e) {
    return null;
  }
};

const regionOf = (id) => (id.includes("/") && !id.startsWith("Etc/") ? id.split("/")[0] : "Other");
const placeOf = (id) => (id.includes("/") ? id.split("/").slice(1).join(" / ").replace(/_/g, " ") : id);

export const buildTimeZoneOptions = (timeZoneIds, now = new Date()) => {
  const groups = {};
  timeZoneIds.forEach((id) => {
    const offset = formatUtcOffset(id, now);
    const region = regionOf(id);
    (groups[region] = groups[region] || []).push({
      value: id,
      label: `${placeOf(id)} — ${id}${offset ? ` (${offset} now)` : ""}`,
    });
  });
  return Object.keys(groups)
    .sort((a, b) => (a === "Other") - (b === "Other") || a.localeCompare(b))
    .map((region) => ({ label: region, options: groups[region] }));
};

// The supported ID matching this device's timezone, or null.
export const findDeviceTimeZone = (timeZoneIds) => {
  let device;
  try {
    device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return null;
  }
  if (!device) return null;
  const exact = timeZoneIds.find((id) => id.toLowerCase() === device.toLowerCase());
  if (exact) return exact;
  const deviceName = browserZoneName(device);
  return timeZoneIds.find((id) => browserZoneName(id) === deviceName) || null;
};

// Choose, change or clear a user's timezone. The device's timezone is only pre-selected as a
// suggestion; nothing is saved until Save (or Clear) is clicked.
const TimeZoneModal = ({ isOpen, userId, currentTimeZoneId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [timeZoneIds, setTimeZoneIds] = useState([]);
  const [selected, setSelected] = useState(currentTimeZoneId || null);
  const [suggested, setSuggested] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getSupportedTimeZones()
      .then((response) => {
        if (cancelled) return;
        const ids = Array.isArray(response?.timeZoneIds) ? response.timeZoneIds : [];
        if (!response?.available || ids.length === 0) {
          setUnavailable(true);
          return;
        }
        setUnavailable(false);
        setTimeZoneIds(ids);
        const device = findDeviceTimeZone(ids);
        setSuggested(device);
        setSelected(currentTimeZoneId && ids.includes(currentTimeZoneId) ? currentTimeZoneId : currentTimeZoneId ? null : device);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load the list of time zones. Please close and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTimeZoneId]);

  const options = useMemo(() => buildTimeZoneOptions(timeZoneIds), [timeZoneIds]);
  const selectedOption = useMemo(
    () => options.flatMap((group) => group.options).find((option) => option.value === selected) || null,
    [options, selected],
  );

  // Save requires a selection; clearing goes only through the explicit "Clear time zone" button.
  const save = (timeZoneId, clear = false) => {
    if (saving || loading || unavailable || (!clear && !timeZoneId)) return;
    setSaving(true);
    setError("");
    // On success the parent closes (unmounts) this modal, so "saving" is reset only when it stays open.
    updateUserTimeZone(userId, timeZoneId)
      .then((response) => {
        if (response?.succeeded) {
          if (typeof onSaved === "function") onSaved(response.timeZoneId || null);
          return;
        }
        setError(response?.message || "The time zone could not be saved.");
        setSaving(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "The time zone could not be saved. Please try again.");
        setSaving(false);
      });
  };

  const showingSuggestion = !currentTimeZoneId && suggested && selected === suggested;

  return (
    <Modal isOpen={isOpen} toggle={onClose} className="modal-dialog-centered" size="md">
      <ModalHeader toggle={onClose}>Time zone</ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-3">
            <Spinner size="sm" color="primary" /> Loading time zones…
          </div>
        ) : unavailable ? (
          <div className="alert alert-warning mb-0" role="alert">
            Time zone selection is not available on this server right now. Your time zone has not been changed.
            Please contact support.
          </div>
        ) : (
          <>
            <p className="text-soft">
              Class and availability times will later be shown in this time zone. Choose the city or region you are
              in; countries with several time zones (for example the USA) list each one separately.
            </p>
            <Select
              inputId="timezone-select"
              aria-label="Time zone"
              options={options}
              value={selectedOption}
              onChange={(option) => setSelected(option ? option.value : null)}
              placeholder="Search a city or region, e.g. New York, London, Kolkata"
              isClearable
              isDisabled={saving}
            />
            {showingSuggestion && (
              <div className="form-note mt-2">Suggested from this device. Nothing is saved until you click Save.</div>
            )}
            {!showingSuggestion && suggested && suggested !== selected && (
              <Button color="link" size="sm" className="px-0 mt-1" onClick={() => setSelected(suggested)} disabled={saving}>
                Use this device's time zone ({suggested})
              </Button>
            )}
          </>
        )}
        {error && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="bg-light">
        {currentTimeZoneId && !unavailable && (
          <Button color="light" className="mr-auto" onClick={() => save(null, true)} disabled={saving || loading}>
            Clear time zone
          </Button>
        )}
        <Button color="light" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {!unavailable && (
          <Button
            color="primary"
            onClick={() => save(selected)}
            disabled={saving || loading || !selected || selected === currentTimeZoneId}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default TimeZoneModal;

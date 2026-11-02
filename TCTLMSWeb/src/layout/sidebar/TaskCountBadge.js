import React, { useCallback, useEffect, useRef, useState } from "react";
import { getMyTasks } from "../../apiservices/MyCalendarService";
import { openAssignedTaskCount, TASK_COUNT_EVENT } from "../../library/myCalendarTasks";

// Refresh pattern of the header notifications (timer + window focus + event). Tasks assigned by someone else
// appear within a minute; changes made on the Tasks page arrive at once through TASK_COUNT_EVENT.
const REFRESH_MS = 60 * 1000;

// Sidebar "Tasks" badge: the "Assigned to me" count (tasks assigned to the user, not completed), from the existing
// GET /my-calendar/tasks. Hidden when there are none or the count could not be loaded.
const TaskCountBadge = () => {
  const [count, setCount] = useState(null);
  const updatedAt = useRef(0);

  const setFresh = (value) => {
    updatedAt.current = Date.now();
    setCount(value);
  };

  // Skipped when the Tasks page reported the count recently: its own load already has it.
  const refresh = useCallback((force = false) => {
    if (!force && Date.now() - updatedAt.current < REFRESH_MS / 2) return;
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    getMyTasks()
      .then((response) => setFresh(openAssignedTaskCount(response?.data, userId)))
      .catch(() => {
        /* keep the last count; the next refresh retries */
      });
  }, []);

  useEffect(() => {
    refresh(true);
    const onCount = (e) => Number.isInteger(e.detail?.count) && setFresh(e.detail.count);
    const onFocus = () => refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener(TASK_COUNT_EVENT, onCount);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener(TASK_COUNT_EVENT, onCount);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  if (!count) return null;
  return (
    <span className="nk-menu-badge" title={`${count} open task${count === 1 ? "" : "s"} assigned to you`}>
      {count > 99 ? "99+" : count}
    </span>
  );
};

export default TaskCountBadge;

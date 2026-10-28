import React, { useCallback, useState, useEffect, useMemo } from "react";
import { DropdownToggle, DropdownMenu, UncontrolledDropdown } from "reactstrap";
import Icon from "../../../../components/icon/Icon";
import { fetchNotifications, MarkAsRead, MarkAllAsRead } from "../../../../apiservices/NofiticationService";
import { Link, useHistory } from "react-router-dom";
import NotificationMessage from "../../../../components/NotificationMessage";
import { notificationLinkPath } from "../../../../utils/Utils";

// `div` cannot be nested inside `span` — use a Fragment wrapper instead
const NotificationItem = ({ text, time, id, isRead, sourceTeam, onOpen }) => {
  return (
    <div className={`nk-notification-item ${isRead ? "n_read" : "n_unread"}`} id={id} onClick={onOpen} role="button">
      <div className="nk-notification-icon">
        {/* Fix: `class` → `className` to avoid React DOM prop warning */}
        <em className="icon icon-circle bg-warning-dim ni ni-curve-down-right"></em>
      </div>
      <div className="nk-notification-content">
        <div className="mb-1"><span className="badge badge-dim badge-primary">{sourceTeam || "System"}</span></div>
        <div className="nk-notification-text">
          <NotificationMessage message={text} />
        </div>
        <div className="nk-notification-time">{time}</div>
      </div>
    </div>
  );
};

const notificationStripStyle = {
  backgroundColor: "#E0F7FA",
  color: "#003366",
  padding: "10px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  animation: "blinker 1s linear infinite",
  borderRadius: "8px",
  width: "100%",
  marginRight: "10px",
  boxSizing: "border-box",
};

const TCTNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const history = useHistory();
  const notificationsCount = useMemo(
    () => notifications.filter((notification) => notification.isRead === false).length,
    [notifications]
  );
  const groupedNotifications = useMemo(() => {
    const groups = new Map();
    notifications.forEach((notification) => {
      const team = notification.sourceTeam || "System";
      if (!groups.has(team)) groups.set(team, []);
      groups.get(team).push(notification);
    });
    return Array.from(groups.entries());
  }, [notifications]);

  const fetchData = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
      const fetchedNotifications = await fetchNotifications(userId);
      const latestNotifications = Array.isArray(fetchedNotifications) ? fetchedNotifications : [];
      setNotifications(latestNotifications);
    } catch (error) {
      console.error("Unable to refresh notifications", error);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Notifications can be created from another signed-in dashboard. Refresh often
    // enough for the Coordinator Admin banner to appear without a manual reload.
    const interval = setInterval(fetchData, 15 * 1000);
    window.addEventListener("focus", fetchData);
    window.addEventListener("tct:notifications-changed", fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchData);
      window.removeEventListener("tct:notifications-changed", fetchData);
    };
  }, [fetchData]);

  const handleBellClick = () => {
    setDropdownOpen((prev) => {
      if (!prev) {
        const userId = localStorage.getItem("userId");
        MarkAllAsRead(notifications, userId)
          .then(() => setNotifications((current) => current.map((item) => ({ ...item, isRead: true }))))
          .catch(() => fetchData());
      }
      return !prev;
    });
  };

  const handleNotificationOpen = async (item) => {
    // Notifications with a target page (e.g. a re-schedule request, a class completion alert) open it.
    const linkPath = notificationLinkPath(item);
    if (linkPath) {
      setDropdownOpen(false);
      history.push(linkPath);
    }
    if (!item.isRead) {
      const userId = localStorage.getItem("userId");
      const response = await MarkAsRead(item.id, userId);
      if (response?.succeeded !== false) {
        setNotifications((current) => current.map((notification) =>
          notification.id === item.id ? { ...notification, isRead: true } : notification
        ));
      }
    }
  };

  const userRole = localStorage.getItem("userRole");
  const viewAllPath =
    userRole === "Coordinator"
      ? `${process.env.PUBLIC_URL}/lms/users/coordinator-notification`
      : userRole === "CoordinatorAdmin"
      ? `${process.env.PUBLIC_URL}/lms/users/coadmin-notification`
      : `${process.env.PUBLIC_URL}/lms/users/user-notification`;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {notificationsCount > 0 && (
        <div style={notificationStripStyle}>
          <span>You have new notifications!</span>
        </div>
      )}

      <UncontrolledDropdown className="user-dropdown">
          <DropdownToggle
            tag="a"
            className="dropdown-toggle nk-quick-nav-icon"
            onClick={handleBellClick}
          >
            <div className="icon-status icon-status-info">
              <Icon name="bell" />
              {notificationsCount > 0 && <span className="badge badge-dot"></span>}
            </div>
          </DropdownToggle>

          {isDropdownOpen && (
            <DropdownMenu right className="dropdown-menu-xl dropdown-menu-s1">
              <div className="dropdown-head">
                <span className="sub-title nk-dropdown-title">Notifications</span>
              </div>
              <div className="dropdown-body">
                <div className="nk-notification">
                  {groupedNotifications.map(([team, items]) => (
                    <React.Fragment key={team}>
                      <div className="px-3 py-2 text-soft bg-light" style={{ fontWeight: 600 }}>{team}</div>
                      {items.map((item) => (
                        <NotificationItem
                          key={item.id}
                          id={item.id}
                          text={item.message}
                          time={item.time}
                          isRead={item.isRead}
                          sourceTeam={item.sourceTeam}
                          onOpen={() => handleNotificationOpen(item)}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="dropdown-foot center">
                {/* Fix: nested <a> inside <Link> was invalid — use Link directly */}
                <Link
                  className="btn btn-outline-light bg-white d-none d-sm-inline-flex"
                  to={viewAllPath}
                  onClick={() => setDropdownOpen(false)}
                >
                  View All
                </Link>
              </div>
            </DropdownMenu>
          )}
      </UncontrolledDropdown>

      <style>{`@keyframes blinker { 50% { opacity: 0; } }`}</style>
    </div>
  );
};

export default TCTNotification;

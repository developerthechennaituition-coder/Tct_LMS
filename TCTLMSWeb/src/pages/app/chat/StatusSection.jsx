import UserStatusItem from "./UserStatusItem";

const StatusSection = ({ title, color, users, dateField, loggedInUser, emptyText, showCount = true }) => (
  <div className="chat-profile-group">
    <div className="px-3 pt-3 pb-2">
      <h6 className="status-title" style={{ color }}>
        {title}
        {showCount ? ` (${users.length})` : ""}
      </h6>

      {users.length === 0 ? (
        <div className="text-muted text-center py-3">{emptyText}</div>
      ) : (
        users.map((user) => (
          <UserStatusItem key={user.userId} user={user} loggedInUser={loggedInUser} dateField={dateField} />
        ))
      )}
    </div>
  </div>
);

export default StatusSection;

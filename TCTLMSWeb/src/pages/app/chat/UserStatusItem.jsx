import moment from "moment";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { getImageUrl, getColor, findUpper1 } from "../../../utils/Utils";

const UserStatusItem = ({ user, loggedInUser, dateField }) => (
  <div className="user-card mb-3">
    <UserAvatar1
      className="chat-media"
      image={getImageUrl(user)}
      theme={getColor(user.name)}
      text={findUpper1(user.name)}
    />

    <div className="ml-3">
      <div className="user-name">{loggedInUser === user.userId ? "You" : user.name}</div>

      {dateField && user[dateField] && (
        <div className="user-time">{moment(user[dateField]).format("DD MMM YYYY hh:mm A")}</div>
      )}
    </div>
  </div>
);

export default UserStatusItem;

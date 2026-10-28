import { Icon } from "../../../components/Component";

const MessageInfoHeader = ({ onClose }) => (
  <div className="message-info-header">
    <Icon name="arrow-left" className="message-info-back" onClick={onClose} />
    <span>Message info</span>
  </div>
);

export default MessageInfoHeader;

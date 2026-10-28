import moment from "moment";
import MessageAttachment from "./MessageAttachment ";
 
 

const MessagePreview = ({ message, getTick }) => (
  <div className="message-preview">
    <div className="message-preview-bubble">
      
      {message?.fileDatas?.length > 0 && <MessageAttachment msg={message} onImageClick={() => {}} />}

      {message?.messageText && <div className="message-text">{message.messageText}</div>}

      <div className="message-footer">
        <small>{moment(message.createdAt).format("hh:mm A")}</small>

        <span>{getTick(message)}</span>
      </div>
    </div>
  </div>
);

export default MessagePreview;

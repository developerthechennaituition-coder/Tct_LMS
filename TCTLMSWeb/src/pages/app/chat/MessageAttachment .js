import React from "react";
import { Icon } from "../../../components/Component";

const MessageAttachment = ({ msg, onImageClick }) => {
  if (!msg?.fileDatas?.length) return null;

  const imageFiles = msg.fileDatas.filter((file) => {
    const base64 = file.data;
    return (
      base64?.startsWith("/9j/") || // jpg
      base64?.startsWith("iVBOR") // png
    );
  });

  const documentFiles = msg.fileDatas.filter((file) => {
    const base64 = file.data;
    return !(base64?.startsWith("/9j/") || base64?.startsWith("iVBOR"));
  });
  const renderImages = () => {
    const count = imageFiles.length;

    if (count === 1) {
      return (
        <div className="wa-single-image">
          <img
            src={`data:image/jpeg;base64,${imageFiles[0].data}`}
            alt={imageFiles[0].fileName}
            onClick={() => onImageClick(imageFiles, 0)}
          />
        </div>
      );
    }

    return (
      <div className="wa-image-grid">
        {imageFiles.slice(0, 4).map((file, index) => (
          <div key={index} className="wa-grid-item" onClick={() => onImageClick(imageFiles, index)}>
            <img src={`data:${getImageType(file.data)};base64,${file.data}`} alt="" />

            {index === 3 && imageFiles.length > 4 && <div className="wa-grid-overlay">+{imageFiles.length - 4}</div>}
          </div>
        ))}
      </div>
    );
  };
  const getImageType = (base64) => {
    if (base64.startsWith("iVBOR")) return "image/png";
    if (base64.startsWith("/9j/")) return "image/jpeg";
    return "image/jpeg";
  };
  return (
    <div className="message-attachments">
      {imageFiles.length > 0 && renderImages()}

      {/* DOCUMENTS */}
      {documentFiles.map((file, index) => {
        const isPdf = file.data?.startsWith("JVBER");

        return (
          <div key={`doc-${index}`} className="wa-document-card">
            <div className="wa-document-icon">
              <Icon name={isPdf ? "file-docs" : "file"} />
            </div>

            <div className="wa-document-content">
              <div className="wa-document-name">{file.fileName}</div>

              <div className="wa-document-type">{isPdf ? "PDF Document" : "Attachment"}</div>
            </div>

            <a
              href={
                isPdf ? `data:application/pdf;base64,${file.data}` : `data:application/octet-stream;base64,${file.data}`
              }
              download={file.fileName}
              className="wa-document-download"
            >
              <Icon name="download" />
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default MessageAttachment;

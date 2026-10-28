import React, { useEffect, useState } from "react";
import { Icon } from "../../../components/Component";

const ImageViewer = ({ open, images = [], currentIndex, setCurrentIndex, onClose }) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowLeft":
          prevImage();
          break;

        case "ArrowRight":
          nextImage();
          break;

        case "Escape":
          onClose();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images]);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const getImageType = (base64) => {
    if (base64?.startsWith("iVBOR")) {
      return "image/png";
    }

    return "image/jpeg";
  };

  const nextImage = () => {
    setZoom(1);

    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const prevImage = () => {
    setZoom(1);

    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const imageUrl = `data:${getImageType(currentImage.data)};base64,${currentImage.data}`;

  return (
    <div className="wa-viewer-overlay">
      <div className="wa-viewer-header">
        <div className="wa-left-tools">
          <button onClick={onClose}>
            <Icon name="cross" />
          </button>

          <span>
            {currentIndex + 1} of {images.length}
          </span>
        </div>

        <div className="wa-right-tools">
          <button onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}>+</button>

          <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>-</button>

          <a href={imageUrl} download={currentImage.fileName}>
            <Icon name="download" />
          </a>
        </div>
      </div>

      <div className="wa-viewer-body">
        <button className="wa-nav-left" onClick={prevImage}>
          ❮
        </button>

        <img
          className="wa-main-image"
          src={imageUrl}
          alt=""
          style={{
            transform: `scale(${zoom})`,
          }}
          onWheel={(e) => {
            if (e.deltaY < 0) {
              setZoom((z) => Math.min(z + 0.1, 4));
            } else {
              setZoom((z) => Math.max(z - 0.1, 0.5));
            }
          }}
        />

        <button className="wa-nav-right" onClick={nextImage}>
          ❯
        </button>
      </div>

      <div className="wa-viewer-thumbnails">
        {images.map((img, idx) => {
          const thumbUrl = `data:${getImageType(img.data)};base64,${img.data}`;

          return (
            <img
              key={idx}
              src={thumbUrl}
              alt=""
              className={idx === currentIndex ? "active" : ""}
              onClick={() => {
                setZoom(1);
                setCurrentIndex(idx);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ImageViewer;

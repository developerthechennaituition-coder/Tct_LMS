import React from "react";
import classNames from "classnames";
import Icon from "../icon/Icon";

// Aviable sizes {xs,sm,md,lg,xl}
/* Aviable theme {blue-dim, blue, azure-dim, azure, indigo-dim, indigo, purple-dim, purple, pink-dim, pink, orange-dim, orange, teal-dim, teal, 
    primary-dim, primary, secondary-dim, secondary, success-dim, success, info-dim, info, warning-dim, warning, danger-dim, danger, dark-dim, dark, gray-dim, gray, lighter, light} */

const UserAvatar1 = ({ className, size, theme, icon, text, image, imageAlt, ...props }) => {
  const classes = classNames({
    "user-avatar": true,
    [`${className}`]: className,
    [`user-avatar-${size}`]: size,
    // [`bg-${theme}`]: theme,
  });
  return (
    <>
      <div className={classes} style={{ backgroundColor: theme }}>
        {icon ? <Icon name={icon} /> : null}
        {props.group == true ? (
          <>{image && <img src={image} alt={imageAlt} style={{ height: "25px", width: "25px" }} />}</>
        ) : (
          <>{image && <img src={image} alt={imageAlt} style={{ height: "41px", width: "41px" }} />}</>
        )}
        {text && !image && <span>{text}</span>}
        {props.children}
      </div>
    </>
  );
};

export default UserAvatar1;

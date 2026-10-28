
import { Icon, UserAvatar } from "../../../components/Component";
import React, { useState } from "react";
const MenuGroupMenu = ({ menuData = [], selectedId, onItemClick }) => { 
  const [openMenus, setOpenMenus] = useState({}); 
  const toggleMenu = (groupName) => {
    setOpenMenus((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <ul className="nk-menu">
      {menuData.map((group) => {
        const isOpen = openMenus[group.name];

        return (
          <li
            key={group.name}
            className={`nk-menu-item has-sub ${
              isOpen ? "active" : ""
            }`}
          >
            {/* MAIN MENU */}
            <div
              className="nk-menu-link nk-menu-toggle"
              style={{ cursor: "pointer" }}
              onClick={() => toggleMenu(group.name)}
            >
              <span className="nk-menu-icon">
                <Icon name="users-fill" />
              </span>

              <span className="nk-menu-text">
                {group.name}
              </span>

              <span className="nk-menu-arrow">
                <Icon
                  name={
                    isOpen
                      ? "chevron-down"
                      : "chevron-right"
                  }
                />
              </span>
            </div>

            {/* SUB MENU */}
            {isOpen && (
              <ul className="nk-menu-sub">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={`nk-menu-item ${
                      selectedId === item.id
                        ? "active current-page"
                        : ""
                    }`}
                  >
                    <div
                      className={`nk-menu-link ${
                        selectedId === item.id
                          ? "active"
                          : ""
                      }`}
                      style={{ cursor: "pointer" }}
                      onClick={() => onItemClick(item)}
                    >
                      <span className="nk-menu-text">
                        {item.groupName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}; 
export default MenuGroupMenu;

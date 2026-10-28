import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  DataTableRow,
  Row,
  Col,
  BlockBetween,
} from "../../../components/Component";
import { Form, FormGroup, Spinner, Alert } from "reactstrap";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import Content from "../../../layout/content/Content";
import { GetHierarchyMenu, UpdateRolePermission } from "../../../apiservices/AuthenticateService";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";

const PermissionTreeGrid = ({ onUpdateSuccessCallback, data }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [permissions, setPermissions] = useState(new Map());
  const [savingPermissions, setSavingPermissions] = useState(new Set());
  const [roleId, setRoleId] = useState(searchParams.get("roleId"));
  const [roleName, setRoleName] = useState(searchParams.get("name"));
  const userId = localStorage.getItem("userId");
  const permissionValue = (item, type) =>
    type === "mapbank" ? (item.mapBank ?? item.mapbank ?? false) : (item[type] ?? false);

  const initializeDefaultPermissions = (items) => {
    const newPermissions = new Map();
    items.forEach((item) => {
      //   if (item.id === "1")
      {
        // Dashboard
        //, "mapbank", "report"
        ["view", "edit", "add", "delete"].forEach((type) => {
          newPermissions.set(`${item.id}-${type}`, permissionValue(item, type));
        });
        if (item.subMenu) {
          item.subMenu.forEach((child) => {
            ["view", "edit", "add", "delete", "mapbank", "report"].forEach((type) => {
              newPermissions.set(`${child.id}-${type}`, permissionValue(child, type));
            });
            if (child.subMenu) {
              child.subMenu.forEach((grandChild) => {
                ["view", "edit", "add", "delete", "mapbank", "report"].forEach((type) => {
                  newPermissions.set(`${grandChild.id}-${type}`, permissionValue(grandChild, type));
                });
              });
            }
          });
        }
      }
    });
    setPermissions(newPermissions);
  };

  useEffect(() => {
    const allIds = getAllIds(data);
    setExpandedRows(new Set(allIds));
    initializeDefaultPermissions(data);
  }, [data]);

  const getAllIds = (items) => {
    let ids = [];
    items.forEach((item) => {
      ids.push(item.id);
      if (item.subMenu) {
        ids = [...ids, ...getAllIds(item.subMenu)];
      }
    });
    return ids;
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getPermissionKey = (id, type) => `${id}-${type}`;

  const togglePermission = async (e, id, type) => {
    const key = getPermissionKey(id, type);
    if (savingPermissions.has(key)) return;
    const previousPermissions = new Map(permissions);
    const nextValue = e.target.checked;
    const newPermissions = new Map(permissions);
    newPermissions.set(key, nextValue);

    const item = findItemById(data, id);
    const idList = [id];
    if (item?.subMenu?.length) {
      updateChildrenPermissions(item.subMenu, type, nextValue, newPermissions);
      collectChildIds(item.subMenu, idList);
    }
    setPermissions(newPermissions);
    setSavingPermissions((current) => new Set(current).add(key));

    try {
      await UpdateRolePermission(roleId, idList.join(), type, nextValue, userId);
      toast.success("Permissions updated successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
      onUpdateSuccessCallback();
    } catch (error) {
      setPermissions(previousPermissions);
    } finally {
      setSavingPermissions((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const collectChildIds = (items, ids) => {
    items.forEach((child) => {
      ids.push(child.id);
      if (child.subMenu?.length) collectChildIds(child.subMenu, ids);
    });
  };

  const updateChildrenPermissions = (subMenu, type, value, permissionsMap) => {
    subMenu.forEach((child) => {
      permissionsMap.set(getPermissionKey(child.id, type), value);
      if (child.subMenu) {
        updateChildrenPermissions(child.subMenu, type, value, permissionsMap);
      }
    });
  };

  const findItemById = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subMenu) {
        const found = findItemById(item.subMenu, id);
        if (found) return found;
      }
    }
    return null;
  };

  const CustomCheckbox = ({ checked, onChange, disabled, id }) => (
    <>
      <div className="custom-control custom-control-sm custom-checkbox notext">
        <input
          type="checkbox"
          id={id}
          onChange={onChange}
          className="custom-control-input form-control"
          checked={checked}
          disabled={disabled}
        ></input>
        <label className="custom-control-label" htmlFor={id}></label>
      </div>
    </>
  );

  const renderRow = (item, level = 0) => {
    const hasChildren = item.subMenu && item.subMenu.length > 0;
    const isExpanded = expandedRows.has(item.id);
    const indent = level * 20;

    return (
      <>
        <div key={item.id} className="nk-tb-item" style={{ background: "#fff" }}>
          <div className="col-toggle w-30">
            {hasChildren ? (
              <div>
                <Button onClick={() => toggleRow(item.id)} className={`btn toggle-btn`}>
                  {isExpanded ? <Icon name="minus" /> : <Icon name="plus" />}
                </Button>
              </div>
            ) : (
              <></>
            )}
          </div>
          <DataTableRow>
            <div className="user-card">              
              <div style={{ width: `${indent}px` }}></div>
              <div className="user-name">
                <span className="tb-lead">{item.text} <b><i>({item.description})</i></b></span>
              </div>
            </div>
          </DataTableRow>
          <div className="nk-tb-col">
            <CustomCheckbox
              id={`add_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "add"))}
              onChange={(e) => togglePermission(e, item.id, "add")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "add"))}
            />
          </div>
          <div className="nk-tb-col">
            <CustomCheckbox
              id={`view_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "view"))}
              onChange={(e) => togglePermission(e, item.id, "view")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "view"))}
            />
          </div>
          <div className="nk-tb-col">
            <CustomCheckbox
              id={`edit_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "edit"))}
              onChange={(e) => togglePermission(e, item.id, "edit")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "edit"))}
            />
          </div>
          <div className="nk-tb-col">
            <CustomCheckbox
              id={`delete_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "delete"))}
              onChange={(e) => togglePermission(e, item.id, "delete")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "delete"))}
            />
          </div> 
          {/* <div className="nk-tb-col">
            <CustomCheckbox
              id={`mapbank_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "mapbank"))}
              onChange={(e) => togglePermission(e, item.id, "mapbank")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "mapbank"))}
            />
          </div>         
          <div className="nk-tb-col">
            <CustomCheckbox
              id={`report_chk_${item.id}`}
              checked={permissions.get(getPermissionKey(item.id, "report"))}
              onChange={(e) => togglePermission(e, item.id, "report")}
              disabled={savingPermissions.has(getPermissionKey(item.id, "report"))}
            />
          </div> */}
        </div>

        {hasChildren && isExpanded && <>{item.subMenu.map((child) => renderRow(child, level + 1))}</>}
      </>
    );
  };

  return (
    <>
      <div className="nk-tb-list is-separate is-medium mb-3">
        <div className="nk-tb-item nk-tb-head" style={{ background: "#fff" }}>
          <div className="nk-tb-col">&nbsp;</div>
          <div className="nk-tb-col">Menu Item</div>
          <div className="nk-tb-col">Add</div>
          <div className="nk-tb-col">View</div>
          <div className="nk-tb-col">Edit</div>          
          <div className="nk-tb-col">Delete</div>
          {/* <div className="nk-tb-col">Map Bank</div>
          <div className="nk-tb-col">Report</div> */}
        </div>
        <>{data.map((item) => renderRow(item))}</>
      </div>
      <ToastContainer />
    </>
  );
};

const Backdrop = ({
  isOpen = false,
  onClose,
  opacity = 50,
  blur = 0,
  children,
  className = "",
  closeOnClick = true,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnClick && onClose) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`
          fixed inset-0 
          transition-opacity 
          duration-300 
          flex items-center 
          justify-center 
          z-50
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
          bg-black/${opacity}
          backdrop-blur-${blur}
          ${className}
        `}
    >
      {children}
    </div>
  );
};

const ExamplePermissionGrid = () => {
  const [dataSource, setDataSource] = useState();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [roleId, setRoleId] = useState(searchParams.get("roleId"));
  const [roleName, setRoleName] = useState(searchParams.get("name"));
  const userId = localStorage.getItem("userId");
  useEffect(() => {
    getMenuData();
  }, []);

  const getMenuData = () => {
    GetHierarchyMenu(roleId).then((response) => {
      setDataSource(response);
    });
  };

  const sampleData = [
    {
      id: "1",
      name: "Dashboard",
      children: [
        {
          id: "1-1",
          name: "Analytics",
        },
        {
          id: "1-2",
          name: "Reports",
          children: [
            {
              id: "1-2-1",
              name: "Sales Report",
            },
            {
              id: "1-2-2",
              name: "User Report",
            },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "User Management",
      children: [
        {
          id: "2-1",
          name: "Users",
        },
        {
          id: "2-2",
          name: "Roles",
        },
      ],
    },
  ];

  return (
    <>
      <Content>
        <Head title="Role Menu Permission"></Head>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h4">Permission for - {roleName} </BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <Link to={`${process.env.PUBLIC_URL}/role-permission`}>
                <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                  <Icon name="arrow-left"></Icon>
                  <span>Back</span>
                </Button>
                <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                  <Icon name="arrow-left"></Icon>
                </Button>
              </Link>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>{dataSource && <PermissionTreeGrid onUpdateSuccessCallback={getMenuData} data={dataSource} />}</Block>
      </Content>
    </>
  );
};

export default ExamplePermissionGrid;

import React, { useEffect, useState } from "react";
import Content from "../../../layout/content/Content";
import { Card } from "reactstrap";
import { ReactDataTable, Icon } from "../../../components/Component";
import {
  GetRolePermission,
  UpdateRolePermission,
  GetRoleMenuPermission,
} from "../../../apiservices/AuthenticateService";
import { getRoles } from "../../../apiservices/UserService";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import UserPermissionIcon from "../../../images/userpermission.png";
import Head from "../../../layout/head/Head";
import PermissionTreeGrid from "./PermissionGrid";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  DropdownItem,
  Form,
} from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  TooltipComponent,
  BlockTitle,
  Row,
  Col,
  Button,
  RSelect,
  PreviewCard,
} from "../../../components/Component";
import { Link } from 'react-router-dom';
const RolePermission = () => {
  const [menuData, setMenuData] = useState();
  const searchParams = new URLSearchParams(location.search);
  const [dataSource, setDataSource] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [roleId, setRoleId] = useState(0);
  const [roleMenuGrid, setRoleMenuGrid] = useState();
  var userId = searchParams.get("id");

  useEffect(() => {
    // FetchRolePermission();
    GetRoles();
  }, []);

  const GetRoles = () => {
    getRoles().then((response) => {
      if (response) {
        setDataSource(response);
      } else {
        console.error("Error: No data found in response");
      }
      
    });
  };
  const FetchRolePermission = () => {
    GetRoleMenuPermission(roleId)
      .then((response) => {
        if (response) {
          setMenuData(response);
        } else {
          console.error("Error: No data found in response");
        }
      })
      .catch((error) => {
        console.error("Error fetching permissions:", error);
      });
  };

  const handlePermissionChange = (id, permission, value, menuId) => {
    const updatedData = menuData.map((item) => (item.id === id ? { ...item, [permission]: value } : item));
    setMenuData(updatedData);
    const RolePermissionUpdate = {
      UserId: localStorage.getItem("userId"),
      Id: id,
      RoleId: roleId,
      MenuId: menuId,
      Name: updatedData.find((item) => item.id === id)?.name,
      Add: updatedData.find((item) => item.id === id)?.add || false,
      View: updatedData.find((item) => item.id === id)?.view || false,
      Edit: updatedData.find((item) => item.id === id)?.edit || false,
      Delete: updatedData.find((item) => item.id === id)?.delete || false,
    };

    UpdateRolePermission(RolePermissionUpdate)
      .then((response) => {
        if (response == "Permission updated successfully.") {
          // setMenuData();
          console.log("Permissions updated successfully");
          FetchRolePermission();
          toast.success("Permissions updated successfully.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
        } else {          
          console.error("Error updating permissions");
          toast.error(response.message, {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
        }
      })
      .catch((error) => {
        console.error("API Error: ", error);
      });
  };

  const dtUserRoleColumn = [
    {
      name: "Role Name",
      minWidth: "150px",
      selector: (row) => row.roleName,
      cell: (row) => <span>{row.roleName}</span>,
    },
    {
      name: "",
      sortable: false,
      hide: "sm",
      width: "800px",
      cell: (row) => (
        
          <Link 
            to={`lms/update-permission?roleId=${row.id}&name=${row.roleName}`}
                  >
          <img src={UserPermissionIcon} alt="logo" style={{ width: "20px",height: "20px" }} />
          </Link>        
      ),
    },
  ];

  // Define columns for the table
  const menuNames = [
    {
      name: "Menu Name",
      selector: (row) => row.name,
    },
    {
      name: "View",
      selector: (row) => row.view,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.view === true}
          onChange={(e) => handlePermissionChange(row.id, "view", e.target.checked, row.menuId)}
        />
      ),
    },
    {
      name: "Add",
      selector: (row) => row.add,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.add === true}
          onChange={(e) => handlePermissionChange(row.id, "add", e.target.checked, row.menuId)}
        />
      ),
    },
    {
      name: "Edit",
      selector: (row) => row.edit,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.edit === true}
          onChange={(e) => handlePermissionChange(row.id, "edit", e.target.checked, row.menuId)}
        />
      ),
    },
    {
      name: "Delete",
      selector: (row) => row.delete,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.delete === true}
          onChange={(e) => handlePermissionChange(row.id, "delete", e.target.checked, row.menuId)}
        />
      ),
    },
  ];

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtUserRoleColumn}
          pagination
          className="nk-tb-list"
          canShowFilter="true"
        />
      </>
    );
  };

  const RenderRoleMenuPermissionGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={menuNames}
          canShowFilter={false}
          // className="nk-tb-list"
        />
      </>
    );
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
    <Content>
      <Head title="Role Menu Permission"></Head>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h5">Role Menu Permission</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent>
            <nav>
              <ul class="breadcrumb breadcrumb-arrow">
                <li class="breadcrumb-item">
                  <a href="#">Settings</a>
                </li>
                <li class="breadcrumb-item active">Role Permission</li>
              </ul>
            </nav>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      <Block>
        {dataSource && (
          <>
            <RenderGrid dataSource={dataSource}></RenderGrid>
          </>
        )}
      </Block>
      <Block>
        <Modal
          scrollable={true}
          isOpen={openModal}
          toggle={() => setOpenModal(false)}
          className="modal-dialog-centered"
          size="lg"
        >
          <ModalHeader
            // toggle={toggle}
            close={
              <button
                className="close"
                type="button"
                onClick={() => {
                  setOpenModal(false);
                }}
              >
                <Icon name="cross" />
              </button>
            }
          >
            Update Role Permission
          </ModalHeader>
          <ModalBody>
            <div className="permission-grid">
              <PermissionTreeGrid></PermissionTreeGrid>
            </div>
          </ModalBody>
        </Modal>
      </Block>
      <ToastContainer />
    </Content>
  );
};

export default RolePermission;

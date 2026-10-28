import React, { useEffect, useState } from "react";
import { Card, UncontrolledDropdown, DropdownMenu, DropdownItem, DropdownToggle } from "reactstrap";
import classNames from "classnames";
import SimpleBar from "simplebar-react";
import { Icon } from "../../../components/Component";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCog,
  ClipboardList,
  UserCheck,
  Laptop,
  Calculator,
  UserPlus,
  BookText,
} from "lucide-react";
import { GetUserCountByRole } from "../../../apiservices/DashboardService";

const UserStatistics = (props) => {
  const [data, setData] = useState("7");
  const [userCountData, setUserCountData] = useState();

  useEffect(() => {
    GetUserCountByRole().then((response) => {
      let _temp = response;
      for (var i = 0; i < _temp.length; i++) {
        switch (_temp[i].roleName) {
          case "Student":
            _temp[i]["url"] = "/lms/studentlist";
            break;
          case "SuperAdmin":
          case "Admin":
          case "OperationsAdmin":
          case "Operations":
          case "CoordinatorAdmin":
          case "Coordinator":
          case "AccountsAdmin":
          case "Accounts":
          case "PayrollAdmin":
          case "Payroll":
          case "HRAdmin":
          case "HR":
            _temp[i]["url"] = `/tct-user-list?roleId=${_temp[i].roleId}`;
            break;
          case "Tutor":
            _temp[i]["url"] = "/tct-tutor-list";
            break;
        }
      }
      setUserCountData(_temp);
    });
  }, []);

  const GetUserRoleIcon = (roleName) => {
    if (roleName == "Student") {
      return (
        <div className="user_statistics  bg-primary-dim">
          <GraduationCap className="h-6 w-6 text-blue-600" />
        </div>
      );
    } else if (roleName == "Coordinator") {
      return <Icon name="account-setting-fill" className="bg-purple-dim"></Icon>;
    } else if (roleName == "Tutor") {
      return <Icon name="users" className="bg-info-dim"></Icon>;
    } else if (roleName == "Operations") {
      return (
        <div className="user_statistics" style={{ backgroundColor: "#1ee0ac" }}>
          <Laptop className="h-6 w-6 text-blue-600" />
        </div>
      );
    }

    return <Icon name="user-list-fill" className="bg-pink-dim"></Icon>;
  };

  return (
    <>
      <Card className="h-100">
        <div className="card-inner">
          <div className="card-title-group mb-2">
            <div className="card-title">
              <h6 className="title">User Statistics</h6>
            </div>
          </div>
          <SimpleBar style={{ maxHeight: "calc(45vh - 0px)" }}>
            {userCountData && (
              <>
                <ul className="nk-store-statistics">
                  {userCountData.map((item, i) => {
                    return (
                      <>
                        <li className="item">
                          <div className="info">
                            <Link to={`${process.env.PUBLIC_URL}${item?.url}`}>
                              <div className="title">{item?.roleName}</div>
                              <div className="count">{item?.userCount}</div>
                            </Link>
                          </div>
                          {GetUserRoleIcon(item?.roleName)}
                        </li>
                      </>
                    );
                  })}
                </ul>
              </>
            )}
          </SimpleBar>
        </div>
      </Card>
    </>
  );
};
export default UserStatistics;

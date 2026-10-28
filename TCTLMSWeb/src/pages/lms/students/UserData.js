import User from "../../../images/avatar/b-sm.jpg";
import User2 from "../../../images/avatar/c-sm.jpg";
import User3 from "../../../images/avatar/a-sm.jpg";
import User4 from "../../../images/avatar/d-sm.jpg";
import { UserAvatar, Icon } from "../../../components/Component";
import UserAvatar1 from "../../../components/user/UserAvatar1"
import { findUpper1, getColor } from "../../../utils/Utils";
import moment from "moment";
import { Link } from "react-router-dom";
export const StudetnData = [
  {
    id: 1,
    avatarBg: "purple",
    studentName: "Nagaparameswaran",
    parentName: "Jayaram",
    phoneNumber: "9524666947",
    payment: "500",
    email: "naga@gmail.com",
    status: "Active",
    enrolledCourse: "Maths"
  },
  {
    id: 1,
    avatarBg: "purple",
    studentName: "Mani",
    parentName: "K",
    phoneNumber: "9524666947",
    payment: "500",
    email: "naga@gmail.com",
    status: "Active",
    enrolledCourse: "Science"
  },

];

export const dataTableColumns = [
  {
    name: "Student",
    selector: (row) => row.name,
    sortable: true,
  },
  {
    name: "Age",
    selector: (row) => row.age,
    sortable: true,
    hide: 370,
  },
  {
    name: "Gender",
    selector: (row) => row.gender,
    sortable: true,
    hide: "sm",
  },
  {
    name: "Company",
    selector: (row) => row.company,
    sortable: true,
    hide: "sm",
  },
  {
    name: "Start Date",
    selector: (row) => row.startDate,
    sortable: true,
    hide: "md",
  },
  {
    name: "Salary",
    selector: (row) => row.salary,
    sortable: true,
    hide: "md",
  },
];


export const notes = [
  {
    id: 1,
    text: "Aproin at metus et dolor tincidunt feugiat eu id quam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aenean sollicitudin non nunc vel pharetra.",
    date: "November 18, 2019",
    time: "5:34 pm",
    company: "Softnio",
  },
  {
    id: 2,
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi eleifend libero semper metus aliquam tempus. Sed efficitur elit et ligula lobortis",
    date: "December 27, 2019",
    time: "7:00 pm",
    company: "Softnio",
  },
];

export const filterStatus = [
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Suspend", label: "Suspend" },
];

export const filterRole = [
  { value: "investor", label: "Investor" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
];

export const countryOptions = [
  { value: "Canada", label: "Canada" },
  { value: "USA", label: "USA" },
  { value: "India", label: "India" },
  { value: "Bangladesh", label: "Bangladesh" },
  { value: "France", label: "France" },
  { value: "England", label: "England" },
];

export const studentEnrolledData1 = [
  { courseName: "Tamil", amount: "500", status: "Active" },
  { courseName: "English", amount: "500", status: "Pending" },
  { courseName: "Computer Science", amount: "500", status: "Active" },
];



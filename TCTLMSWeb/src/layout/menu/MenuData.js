let menu = null;

const userRole = localStorage.getItem("userRole");
if (userRole == "Admin") {
  menu = [
    {
      icon: "dashboard",
      text: "Dashboard",
      active: false,
  subMenu: [
    {
      text: "Dashboard Overview",
      link: "/",
    },
    {
      text: "Reports",
      link: "/  dashboard/reports",
    },
  ],
    },
    {
      icon: "setting",
      text: "Settings",
      active: false,
      subMenu: [
        {
          text: "Master Data",
          link: "/master-data",
        },
        {
          text: "Role Permission",
          link: "/role-permission",
        }
      ],
    },
    {
      icon: "users-fill",
      text: "Users",
      active: false,
      subMenu: [
        {
          text: "User",
          link: "/tct-user",
        },
        {
          text: "User List",
          link: "/tct-user-list",
        },
      ],
    },
    {
      icon: "users-fill",
      text: "Tutors",
      active: false,
      subMenu: [
        {
          text: "Tutor",
          link: "/tct-tutor",
        },
        {
          text: "Tutor List",
          link: "/tct-tutor-list",
        },
        {
          text: "Tutor Calender",
          link: "/tct-tutor-calender",
        },
        {
      text: "Bulk Upload",
      link: "/tct-tutor-bulk-upload",
    },
      ],
    },
    {
      icon: "tile-thumb-fill",
      text: "Sales",
      active: false,
      subMenu: [
        {
          text: "Enrollment History",
          link: "/lms/sales/enrollment-history",
        },
        {
          text: "Enrollment",
          link: "/lms/sales/enroll-a-student",
        },
        {
          text: "New Enrollment",
          link: "/lms/sales/new-enroll",
        },
      ],
    },
    {
      icon: "users-fill",
      text: "Student List",
      link: "/lms/studentlist",
    },
    {
      icon: "bell-fill",
      text: "Notification List",
      link: "/lms/users/user-notification",
    },
  ];
} else if (userRole == "Coordinator") {
  menu = [
    {
      icon: "dashboard",
      text: "Dashboard",
      link: "/",
    },
    {
      icon: "users-fill",
      text: "Tutors",
      active: false,
      subMenu: [
        {
          text: "Tutor List",
          link: "/tct-tutor-list",
        },
      ],
    },
    {
      icon: "users-fill",
      text: "Enrolled Student List",
      link: "/lms/sales/enrollment-history",
    },
    {
      icon: "bell-fill",
      text: "Notification List",
      link: "/lms/users/coordinator-notification",
    },
  ];
} else if (userRole == "CoordinatorAdmin") {
  menu = [
    {
      icon: "dashboard",
      text: "Dashboard",
      link: "/",
    },
    {
      icon: "users-fill",
      text: "Tutors",
      active: false,
      subMenu: [
        {
          text: "Tutor List",
          link: "/tct-tutor-list",
        },
      ],
    },
    {
      icon: "bell-fill",
      text: "Notification List",
      link: "/lms/users/coadmin-notification",
    },
  ];
} else if (userRole == "Account") {
  menu = [
    {
      icon: "dashboard",
      text: "Dashboard",
      link: "/",
    },
    {
      icon: "file-docs",
      text: "Attendance & Payroll",
      active: false,
      subMenu: [
        {
          text: "Tutor Attendance List",
          link: "/tct-account-tutor-list",
        },
      ],
    },
    {
      icon: "bell-fill",
      text: "Notification List",
      link: "/lms/users/coadmin-notification",
    },
  ];
}

export default menu;

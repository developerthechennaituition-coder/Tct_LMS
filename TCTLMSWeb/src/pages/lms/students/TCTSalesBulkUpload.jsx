import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  Button,
  Icon,
  PreviewCard,
} from "../../../components/Component";
import { Spinner } from "reactstrap";

import { axios } from "../../../library/axios";
import { config } from "../../../library/config";
import { getLookups } from "../../../apiservices/LookupsService";
import { getOwnership } from "../../../apiservices/UserService";

const defaultGuid = "00000000-0000-0000-0000-000000000000";

const REQUIRED_HEADERS = [
  "Student ID",
  "Student Name",
  "Parent Name",
  "Date of Birth",
  "Email",
  "Phone Number",
  "Gender",
  "Grade",
  "Board",
  "Ownership",
];

const getValue = (obj, keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return "";
};

const getLookupId = (item) => {
  return item?.id || item?.Id || item?.value || item?.Value || "";
};

const getLookupName = (item) => {
  return (
    item?.typeCodeName ||
    item?.TypeCodeName ||
    item?.name ||
    item?.Name ||
    item?.label ||
    item?.Label ||
    ""
  );
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const findLookup = (items, value, type = "") => {
  const searchValue = normalize(value);

  return (items || []).find((item) => {
    const lookupName = normalize(getLookupName(item));

    if (lookupName === searchValue) {
      return true;
    }

    // Allow Grade 8 to match 8 or Grade 8
    if (type === "grade") { 
      const excelGrade = searchValue.replace(/^grade\s*/i, "");
      const lookupGrade = lookupName.replace(/^grade\s*/i, "");

      return excelGrade === lookupGrade;
    }

    return false;
  });
};
const findOwnership = (items, value) => {
  const searchValue = normalize(value);

  // Excel value "Operations" maps to the Operations user
  if (searchValue === "operations") {
    return (items || []).find(
      (item) => normalize(item?.firstName) === "operationtct"
    );
  }

  return (items || []).find((item) => {
    const firstName = normalize(item?.firstName);
    const fullName = normalize(item?.fullName);
    const userCode = normalize(item?.userCode);

    return (
      firstName === searchValue ||
      fullName === searchValue ||
      userCode === searchValue
    );
  });
};
const formatExcelDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      return new Date(
        parsed.y,
        parsed.m - 1,
        parsed.d
      );
    }
  }

  const text = String(value).trim();

  // Handle DD/MM/YYYY
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsedDate = new Date(value);

  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
};

const formatDateForApi = (value) => {
  const date = formatExcelDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const TCTSalesBulkUpload = () => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [genderList, setGenderList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [ownershipList, setOwnershipList] = useState([]);

  const [result, setResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
  completed: 0,
  total: 0,
});
  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      setLoading(true);

      const [
        genderResponse,
        gradeResponse,
        boardResponse,
        ownershipResponse,
      ] = await Promise.all([
        getLookups("600"),
        getLookups("300"),
        getLookups("400"),
        getOwnership("ownership"),
      ]);

      const genders = genderResponse?.data || genderResponse || [];
      const grades = gradeResponse?.data || gradeResponse || [];
      const boards = boardResponse?.data || boardResponse || [];
      const ownerships =
        ownershipResponse?.data || ownershipResponse || [];
      console.log("OWNERSHIP RESPONSE:", ownershipResponse);
      console.log("OWNERSHIP LIST:", ownerships);
      setGenderList(Array.isArray(genders) ? genders : []);
      setGradeList(Array.isArray(grades) ? grades : []);
      setBoardList(Array.isArray(boards) ? boards : []);
      setOwnershipList(Array.isArray(ownerships) ? ownerships : []);

      console.log("Bulk Upload Lookups:", {
        genders,
        grades,
        boards,
        ownerships,
      });
    } catch (error) {
      console.error("Failed to load lookups:", error);
      alert("Failed to load lookup values.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setResult(null);
    setRows([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    setFile(selectedFile);
    readExcel(selectedFile);
  };

  const readExcel = (selectedFile) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });

        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          alert("Excel file does not contain a worksheet.");
          return;
        }

        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: true,
        });

        if (!jsonData.length) {
          alert("Excel file is empty.");
          return;
        }

        const headers = Object.keys(jsonData[0]);

        const missingHeaders = REQUIRED_HEADERS.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          alert(
            `Missing Excel columns: ${missingHeaders.join(", ")}`
          );
          return;
        }

        setRows(jsonData);

        console.log("Excel rows:", jsonData);
      } catch (error) {
        console.error("Excel parsing error:", error);
        alert("Unable to read the Excel file.");
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const validateRow = (row) => {
    const errors = [];
    const studentId = String(
    getValue(row, ["Student ID"])
    ).trim();

    const studentName = String(
      getValue(row, ["Student Name"])
    ).trim();

    const parentName = String(
      getValue(row, ["Parent Name"])
    ).trim();

    const dob = getValue(row, ["Date of Birth"]);

    const email = String(
      getValue(row, ["Email"])
    ).trim();

    const phone = String(
      getValue(row, ["Phone Number"])
    ).trim();

    const gender = String(
      getValue(row, ["Gender"])
    ).trim();

    const grade = String(
      getValue(row, ["Grade"])
    ).trim();

    const board = String(
      getValue(row, ["Board"])
    ).trim();

    const ownership = String(
      getValue(row, ["Ownership"])
    ).trim();
if (!studentId) errors.push("Student ID is required");
    if (!studentName) {
      errors.push("Student Name is required");
    }

    if (!parentName) {
      errors.push("Parent Name is required");
    }

    if (!dob) {
      errors.push("Date of Birth is required");
    }

    if (!email) {
      errors.push("Email is required");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid Email");
    }

    if (!phone) {
      errors.push("Phone Number is required");
    }

    if (!gender) {
      errors.push("Gender is required");
    }

    if (!grade) {
      errors.push("Grade is required");
    }

    if (!board) {
      errors.push("Board is required");
    }

    if (!ownership) {
      errors.push("Ownership is required");
    }

    return {
      errors,
      values: {
          studentId,
        studentName,
        parentName,
        dob,
        email,
        phone,
        gender,
        grade,
        board,
        ownership,
      },
    };
  };

  const createStudent = async (row) => {
    const validation = validateRow(row);

    if (validation.errors.length > 0) {
      throw new Error(validation.errors.join("; "));
    }

    const {
        studentId,
      studentName,
      parentName,
      dob,
      email,
      phone,
      gender,
      grade,
      board,
      ownership,
    } = validation.values;

    const genderLookup = findLookup(genderList, gender);
   const gradeLookup = findLookup(gradeList, grade, "grade");
    const boardLookup = findLookup(boardList, board);
    const ownershipLookup = findOwnership(
      ownershipList,
      ownership
    );

    if (!genderLookup) {
      throw new Error(`Gender not found: ${gender}`);
    }

    if (!gradeLookup) {
      throw new Error(`Grade not found: ${grade}`);
    }

    if (!boardLookup) {
      throw new Error(`Board not found: ${board}`);
    }

    if (!ownershipLookup) {
      throw new Error(`Ownership not found: ${ownership}`);
    }

    const genderId = getLookupId(genderLookup);
    const gradeId = getLookupId(gradeLookup);
    const boardId = getLookupId(boardLookup);
    const ownershipId = getLookupId(ownershipLookup);

    if (!genderId) {
      throw new Error(`Gender ID not found: ${gender}`);
    }

    if (!gradeId) {
      throw new Error(`Grade ID not found: ${grade}`);
    }

    if (!boardId) {
      throw new Error(`Board ID not found: ${board}`);
    }

    if (!ownershipId) {
      throw new Error(`Ownership ID not found: ${ownership}`);
    }

    const userId = localStorage.getItem("userId");

    if (!userId) {
      throw new Error("Logged-in user ID not found.");
    }

    const formData = new FormData();

    formData.append("Id", defaultGuid);
    formData.append("BoardId", boardId);
    formData.append("GradeId", gradeId);
    formData.append("CreatedBy", userId);
    formData.append("CreatedDate", new Date().toISOString());
    formData.append("IsActive", "true");

    formData.append("StudentId", defaultGuid);

    formData.append(
      "Student.Id",
      defaultGuid
    );

    formData.append(
      "Student.Code",
      studentId
    );

    formData.append(
      "Student.FirstName",
      studentName
    );

    formData.append(
      "Student.LastName",
      parentName
    );

    formData.append(
      "Student.ParentName",
      parentName
    );

    formData.append(
      "Student.DOB",
      formatDateForApi(dob)
    );

    formData.append(
      "Student.EmailAddress",
      email
    );

    formData.append(
      "Student.MobileNumber",
      phone
    );

    /*
     * The existing enrollment page sends Gender as the
     * lookup label, not the lookup ID.
     */
    formData.append(
      "Student.Gender",
      getLookupName(genderLookup)
    );

    formData.append(
      "Student.BoardId",
      boardId
    );

    formData.append(
      "Student.GradeId",
      gradeId
    );

    formData.append(
      "Student.Ownership",
      ownershipId
    );

    formData.append(
      "Student.IsActive",
      "true"
    );

    formData.append(
      "Student.CreatedBy",
      userId
    );

    formData.append(
      "Student.CreatedDate",
      new Date().toISOString()
    );

    /*
     * No SalesDetailRequest is added.
     *
     * Backend CreateSalesDetailsAsync() already allows
     * an empty SalesDetailRequest collection.
     */

    const response = await axios.post(
      `${config.API_URL}/sales/createsales`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    console.log(
  "BULK CREATE API URL:",
  `${config.API_URL}/sales/createsales`
);

console.log(
  "BULK CREATE RESPONSE:",
  response?.data
);
    if (response?.data?.succeeded === false) {
      throw new Error(
        response?.data?.message ||
          "Student creation failed."
      );
    }

    return response;
  };
  const normalizeEmail = (value) =>
  String(value ?? "").trim().toLowerCase();

const validateExcelDuplicates = (rows) => {
  const seenEmails = new Set();
  const seenStudentIds = new Set();
  const duplicates = [];

  rows.forEach((row, index) => {
    const email = normalizeEmail(row["Email"]);
    const studentId = normalize(row["Student ID"]);

    if (email && seenEmails.has(email)) {
      duplicates.push({
        excelRow: index + 2,
        field: "Email",
        value: email,
      });
    }

    if (studentId && seenStudentIds.has(studentId)) {
      duplicates.push({
        excelRow: index + 2,
        field: "Student ID",
        value: studentId,
      });
    }

    if (email) seenEmails.add(email);
    if (studentId) seenStudentIds.add(studentId);
  });

  return duplicates;
};

  const handleUpload = async () => {
  if (!file) {
    alert("Please select an Excel file.");
    return;
  }

  if (!rows.length) {
    alert("No valid rows found in the Excel file.");
    return;
  }
  const duplicates = validateExcelDuplicates(rows);

if (duplicates.length > 0) {
  alert(
    "Duplicate values found in Excel:\n" +
      duplicates
        .map(
          (item) =>
            `Row ${item.excelRow}: ${item.field} - ${item.value}`
        )
        .join("\n")
  );
  return;
}
  setLoading(true);
  setResult(null);

  setUploadProgress({
    completed: 0,
    total: rows.length,
  });

  const successful = [];
  const failed = [];
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;

      if (index >= rows.length) {
        return;
      }

      const row = rows[index];
      const studentName =
        getValue(row, ["Student Name"]) || "Unknown";

      try {
        await createStudent(row);

        successful.push({
          excelRow: index + 2,
          student: studentName,
        });
     } catch (error) {
  console.error(`Row ${index + 2} failed:`, error);

  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.message ||
    "Unknown error";

  failed.push({
    excelRow: index + 2,
    student: studentName,
    reason: message,
    type: status === 409 ? "Duplicate" : "Failed",
  });
} finally {
        completed += 1;

        setUploadProgress({
          completed,
          total: rows.length,
        });
      }
    }
  };

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(3, rows.length) },
        () => worker()
      )
    );

    setResult({
      total: rows.length,
      successful: successful.sort(
        (a, b) => a.excelRow - b.excelRow
      ),
      failed: failed.sort(
        (a, b) => a.excelRow - b.excelRow
      ),
    });
  } finally {
    setLoading(false);
  }
};

  const downloadTemplate = () => {
    const templateData = [
      {
        "Student Name": "Arun Kumar",
        "Parent Name": "Ramesh Kumar",
        "Date of Birth": "2012-05-15",
        Email: "arun.kumar@example.com",
        "Phone Number": "9876543210",
        Gender: "Male",
        Grade: "Grade 8",
        Board: "CBSE",
        Ownership: "Operations",
      },
      {
        "Student Name": "Priya Sharma",
        "Parent Name": "Suresh Sharma",
        "Date of Birth": "2013-08-20",
        Email: "priya.sharma@example.com",
        "Phone Number": "9876543211",
        Gender: "Female",
        Grade: "Grade 7",
        Board: "CBSE",
        Ownership: "Operations",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(templateData);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    XLSX.writeFile(
      workbook,
      "Student_Bulk_Upload_Template.xlsx"
    );
  };

  return (
    <>
      <BlockHead size="sm">
        <BlockHeadContent>
          <BlockTitle tag="h3">
            Student Bulk Upload
          </BlockTitle>

          <BlockDes className="text-soft">
            Upload multiple students using an Excel file.
          </BlockDes>
        </BlockHeadContent>
      </BlockHead>

      <PreviewCard>
        <div className="card-inner">

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="title">
                Upload Students
              </h5>

              <p className="text-soft mb-0">
                Only the 9 required student fields are needed.
              </p>
            </div>

            <Button
              color="outline-primary"
              size="sm"
              onClick={downloadTemplate}
            >
              <Icon name="download" />
              <span>Download Template</span>
            </Button>
          </div>

          <div className="alert alert-warning">
            <strong>Before uploading:</strong>

            <ul className="mb-0 mt-2">
              <li>
                Each Excel row creates one student.
              </li>

              <li>
                Student Name, Parent Name, Date of Birth,
                Email and Phone Number are required.
              </li>

              <li>
                Gender, Grade, Board and Ownership must
                match the existing lookup values.
              </li>

              <li>
                Ownership can be <strong>Operations</strong>
                if that is the value shown in your system.
              </li>

              <li>
                Subject, Coordinator and Sessions Per Week
                are <strong>not required</strong>.
              </li>
            </ul>
          </div>

          <div className="form-group">
            <label className="form-label">
              Excel File
            </label>

            <div className="form-control-wrap">
              <input
                type="file"
                className="form-control"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {rows.length > 0 && (
            <div className="alert alert-info">
              <strong>{rows.length}</strong>{" "}
              student row(s) loaded from Excel.
            </div>
          )}

          <div className="mt-3">
            <Button
              color="primary"
              onClick={handleUpload}
              disabled={
                loading ||
                !file ||
                rows.length === 0
              }
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span className="ms-2">
                    Uploading...
                  </span>
                </>
              ) : (
                <>
                  <Icon name="upload" />
                  <span>Upload Students</span>
                </>
              )}
            </Button>
            {loading && (
  <div className="mt-3">
    <div className="d-flex justify-content-between mb-2">
      <span>Uploading students...</span>
      <span>
        {uploadProgress.completed} / {uploadProgress.total}
      </span>
    </div>

    <div
      className="progress"
      role="progressbar"
      aria-valuenow={uploadProgress.completed}
      aria-valuemin={0}
      aria-valuemax={uploadProgress.total}
    >
      <div
        className="progress-bar"
        style={{
          width: `${
            uploadProgress.total > 0
              ? (uploadProgress.completed /
                  uploadProgress.total) *
                100
              : 0
          }%`,
        }}
      />
    </div>
  </div>
)}
          </div>

          {result && (
            <div className="mt-4">

              <div className="row g-3 mb-3">

                <div className="col-md-4">
                  <div className="alert alert-light">
                    <strong>Total</strong>
                    <div className="fs-4">
                      {result.total}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="alert alert-success">
                    <strong>Successful</strong>
                    <div className="fs-4">
                      {result.successful.length}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="alert alert-danger">
                    <strong>Failed</strong>
                    <div className="fs-4">
                      {result.failed.length}
                    </div>
                  </div>
                </div>

              </div>

              {result.successful.length > 0 && (
                <div className="mb-4">
                  <h6 className="title">
                    Successfully Created
                  </h6>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Excel Row</th>
                          <th>Student</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.successful.map(
                          (item, index) => (
                            <tr key={index}>
                              <td>{item.excelRow}</td>
                              <td>{item.student}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div>
                  <h6 className="title">
                    Failed Rows
                  </h6>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Excel Row</th>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.failed.map(
                          (item, index) => (
                            <tr key={index}>
                              <td>{item.excelRow}</td>
                              <td>{item.student}</td>
                              <td>
                                <span
                                  className={
                                    item.type === "Duplicate"
                                      ? "badge bg-warning text-dark"
                                      : "badge bg-danger"
                                  }
                                >
                                  {item.type || "Failed"}
                                </span>
                              </td>
                              <td>{item.reason}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </PreviewCard>
    </>
  );
};

export default TCTSalesBulkUpload;
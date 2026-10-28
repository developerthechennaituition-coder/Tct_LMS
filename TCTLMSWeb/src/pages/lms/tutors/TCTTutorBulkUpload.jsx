import React, { useEffect, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import { Spinner } from "reactstrap";
import {
    BlockHead,
    BlockBetween,
    BlockHeadContent,
    BlockTitle,
    PreviewCard,
    Button,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
//import { createTutor } from "../../../apiservices/TutorService";
import {
    createTutor,
    addUpdateTutorSkillset,
} from "../../../apiservices/TutorService";

import { getLookups } from "../../../apiservices/LookupsService";
const defaultGuid = "00000000-0000-0000-0000-000000000000";

const REQUIRED_HEADERS = [
    "First Name",
    "Last Name",
    "Date of Birth",
    "Email",
    "Phone Number",
    "Gender",
    "Address Line1",
    "Address Line2",
    "Address Line3",
    "City",
    "ZipCode",
    "State",
    "Country",
     "Board",
    "Grade",
    "Subject",
];

const TCTTutorBulkUpload = () => {

    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const createdBy = localStorage.getItem("userId");
    const [boardList, setBoardList] = useState([]);
const [gradeList, setGradeList] = useState([]);
const [subjectList, setSubjectList] = useState([]);
useEffect(() => {
    const loadSkillLookups = async () => {
        try {
            const [subjectResponse, boardResponse, gradeResponse] =
                await Promise.all([
                    getLookups("500"),
                    getLookups("400"),
                    getLookups("300"),
                ]);

            setSubjectList(
                (subjectResponse || []).map((item) => ({
                    id: item.id,
                    label: item.typeCodeName,
                }))
            );

            setBoardList(
                (boardResponse || []).map((item) => ({
                    id: item.id,
                    label: item.typeCodeName,
                }))
            );

            setGradeList(
                (gradeResponse || [])
                    .filter((item) =>
                        item?.typeCodeName?.startsWith("Grade")
                    )
                    .map((item) => ({
                        id: item.id,
                        label: item.typeCodeName,
                    }))
            );
        } catch (err) {
            console.error("Failed to load skill lookups:", err);
            setError("Unable to load Board, Grade and Subject data.");
        }
    };

    loadSkillLookups();
}, []);
    const downloadTemplate = () => {
        const worksheet = XLSX.utils.aoa_to_sheet([
            REQUIRED_HEADERS,
        ]);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Tutors"
        );

        XLSX.writeFile(
            workbook,
            "Tutor_Bulk_Upload_Template.xlsx"
        );
    };

    const handleFileChange = (event) => {

        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setFileName(file.name);
        setRows([]);
        setError("");

        const reader = new FileReader();

        reader.onload = (e) => {

            try {

                const data = new Uint8Array(e.target.result);

                const workbook = XLSX.read(data, {
                    type: "array",
                    cellDates: true,
                });

                const sheetName = workbook.SheetNames[0];

                const worksheet = workbook.Sheets[sheetName];

                const excelRows = XLSX.utils.sheet_to_json(
                    worksheet,
                    {
                        header: 1,
                        defval: "",
                        raw: false,
                    }
                );

                if (!excelRows.length) {
                    setError("The Excel file is empty.");
                    return;
                }

                const headers = excelRows[0].map((header) =>
                    String(header).trim()
                );

                const missingHeaders =
                    REQUIRED_HEADERS.filter(
                        (header) => !headers.includes(header)
                    );

                if (missingHeaders.length > 0) {

                    setError(
                        `Missing required columns: ${missingHeaders.join(
                            ", "
                        )}`
                    );

                    return;
                }

                const tutorRows =
                    XLSX.utils.sheet_to_json(
                        worksheet,
                        {
                            defval: "",
                            raw: false,
                        }
                    );

                if (tutorRows.length === 0) {
                    setError(
                        "The Excel file does not contain any tutor records."
                    );
                    return;
                }

                setRows(tutorRows);

            } catch (err) {

                console.error(
                    "Excel parsing error:",
                    err
                );

                setError(
                    "Unable to read the Excel file."
                );
            }
        };

        reader.readAsArrayBuffer(file);
    };
const findLookupId = (list, value) => {
    const searchValue = String(value || "")
        .trim()
        .toLowerCase();

    const item = list.find(
        (x) => String(x.label || "").trim().toLowerCase() === searchValue
    );

    return item?.id || null;
};
  const convertRowToTutor = (row) => {
    const userId = crypto.randomUUID();
    const addressId = crypto.randomUUID();

    return {
        id: userId,
        userId: userId,

        firstName: String(row["First Name"] || "").trim(),
        lastName: String(row["Last Name"] || "").trim(),
        userCode: "",

        email: String(row["Email"] || "").trim(),
        phone: String(row["Phone Number"] || "").trim(),
        alternatePhone: "",

        dob: moment(row["Date of Birth"]).isValid()
            ? moment(row["Date of Birth"]).format("YYYY-MM-DD")
            : null,

        gender: String(row["Gender"] || "").trim(),

        designationId: defaultGuid,
        roleId: 0,
        userType: defaultGuid,

        isSystemUser: false,
        isAdminUser: false,

        createdBy: createdBy,
        createdDate: new Date(),
        isActive: true,

       Address: {
    id: addressId,
    userId: userId,

    addressLine1: String(row["Address Line1"] || "").trim(),
    addressLine2: String(row["Address Line2"] || "").trim(),
    addressLine3: String(row["Address Line3"] || "").trim(),

    city: String(row["City"] || "").trim(),
    state: String(row["State"] || "").trim(),
    zipCode: String(row["ZipCode"] || "").trim(),
    country: String(row["Country"] || "").trim(),

    isPrimary: true,
    isActive: true,

    createdBy: createdBy,
    createdDate: new Date(),
},
    };
};

    const validateRows = () => {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;

        if (!row["First Name"]?.trim()) {
            return `Row ${rowNumber}: First Name is required.`;
        }

        if (!row["Last Name"]?.trim()) {
            return `Row ${rowNumber}: Last Name is required.`;
        }

        if (!row["Email"]?.trim()) {
            return `Row ${rowNumber}: Email is required.`;
        }

        if (!row["Phone Number"]?.trim()) {
            return `Row ${rowNumber}: Phone Number is required.`;
        }

        if (!row["Gender"]?.trim()) {
            return `Row ${rowNumber}: Gender is required.`;
        }

        if (!row["Address Line1"]?.trim()) {
            return `Row ${rowNumber}: Address Line1 is required.`;
        }

        if (!row["City"]?.trim()) {
            return `Row ${rowNumber}: City is required.`;
        }

        if (!row["ZipCode"]?.trim()) {
            return `Row ${rowNumber}: ZipCode is required.`;
        }

        if (!row["State"]?.trim()) {
            return `Row ${rowNumber}: State is required.`;
        }

        if (!row["Country"]?.trim()) {
            return `Row ${rowNumber}: Country is required.`;
        }

        // Skill set validation
        if (!row["Board"]?.trim()) {
            return `Row ${rowNumber}: Board is required.`;
        }

        if (!row["Grade"]?.trim()) {
            return `Row ${rowNumber}: Grade is required.`;
        }

        if (!row["Subject"]?.trim()) {
            return `Row ${rowNumber}: Subject is required.`;
        }

        const boardId = findLookupId(
            boardList,
            row["Board"]
        );

        if (!boardId) {
            return `Row ${rowNumber}: Board "${row["Board"]}" was not found.`;
        }

        const gradeId = findLookupId(
            gradeList,
            row["Grade"]
        );

        if (!gradeId) {
            return `Row ${rowNumber}: Grade "${row["Grade"]}" was not found.`;
        }

        const subjects = String(row["Subject"])
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

        for (const subject of subjects) {
            const subjectId = findLookupId(
                subjectList,
                subject
            );

            if (!subjectId) {
                return `Row ${rowNumber}: Subject "${subject}" was not found.`;
            }
        }
    }

    return null;
};
const addTutorSkillSet = async (row, tutorId, userId) => {
    const boardId = findLookupId(
        boardList,
        row["Board"]
    );

    const gradeId = findLookupId(
        gradeList,
        row["Grade"]
    );

    const subjectNames = String(row["Subject"])
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    const subjectIds = subjectNames.map((subject) =>
        findLookupId(subjectList, subject)
    );

    const inputData = {
        boardId: boardId,
        gradeId: gradeId,
        SubjectIds: subjectIds,
        loggedInUserId: createdBy,
        userId: userId,
        tutorId: tutorId,
    };

    console.log(
        "BULK TUTOR SKILL DATA:",
        inputData
    );

    const response = await addUpdateTutorSkillset(
        inputData
    );

    if (!response?.succeeded) {
        throw new Error(
            response?.message ||
            "Failed to save tutor skill set."
        );
    }

    return response;
};
   const handleUpload = async () => {
    setError("");

    const validationError = validateRows();

    if (validationError) {
        setError(validationError);
        return;
    }

    setLoading(true);

    let successCount = 0;
    let failedCount = 0;

    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // --------------------------------
                // 1. Create Tutor
                // --------------------------------
                const tutorData = convertRowToTutor(row);

                console.log(
                    "BULK TUTOR DATA:",
                    tutorData
                );

                const tutorResponse =
                    await createTutor(tutorData);

                if (!tutorResponse?.succeeded) {
                    throw new Error(
                        tutorResponse?.message ||
                        "Tutor creation failed."
                    );
                }

                const tutorResult =
                    tutorResponse.data;

                const tutorId =
                    tutorResult?.id;

                const userId =
                    tutorResult?.userId ||
                    tutorData.userId;

                if (!tutorId) {
                    throw new Error(
                        "Tutor was created but Tutor ID was not returned."
                    );
                }

                // --------------------------------
                // 2. Add Skill Set
                // --------------------------------
                await addTutorSkillSet(
                    row,
                    tutorId,
                    userId
                );

                successCount++;

                console.log(
                    `Row ${i + 2} uploaded successfully`
                );
            } catch (err) {
                console.error(
                    `Tutor row ${i + 2} failed:`,
                    err
                );

                failedCount++;
            }
        }

        if (failedCount === 0) {
            toast.success(
                `${successCount} tutor(s) uploaded successfully with skill sets.`
            );

            setRows([]);
            setFileName("");
        } else {
            toast.warning(
                `${successCount} tutor(s) uploaded successfully. ${failedCount} tutor(s) failed.`
            );
        }
    } catch (err) {
        console.error(
            "Bulk upload error:",
            err
        );

        toast.error(
            "Bulk upload failed."
        );
    } finally {
        setLoading(false);
    }
};
    return (
        <React.Fragment>

            <Head title="Tutor Bulk Upload" />

            <Content>

                <BlockHead size="sm">

                    <BlockBetween>

                        <BlockHeadContent>

                            <BlockTitle tag="h3" page>
                                Bulk Upload Tutors
                            </BlockTitle>

                        </BlockHeadContent>

                    </BlockBetween>

                </BlockHead>

                <PreviewCard>

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <div>

                            <h5 className="title">
                                Tutor Bulk Upload
                            </h5>

                            <p className="text-soft">
                                Upload multiple tutors using an Excel file.
                            </p>

                        </div>

                        <Button
                            color="outline-primary"
                            onClick={downloadTemplate}
                        >
                            Download Excel Template
                        </Button>

                    </div>

                    <div className="form-group">

                        <label className="form-label">
                            Excel File
                        </label>

                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="form-control"
                            onChange={handleFileChange}
                        />

                    </div>

                    {fileName && !error && (
                        <div className="alert alert-success mt-3">
                            Selected file:{" "}
                            <strong>{fileName}</strong>
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger mt-3">
                            {error}
                        </div>
                    )}

                    {rows.length > 0 && (

                        <div className="mt-4">

                            <div className="d-flex justify-content-between mb-3">

                                <h5 className="title">
                                    Preview
                                </h5>

                                <span>
                                    {rows.length} tutor(s)
                                </span>

                            </div>

                            <div className="table-responsive">

                                <table className="table table-bordered">

                                    <thead>

                                        <tr>

                                            {REQUIRED_HEADERS.map(
                                                (header) => (
                                                    <th key={header}>
                                                        {header}
                                                    </th>
                                                )
                                            )}

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {rows.map(
                                            (row, index) => (

                                                <tr key={index}>

                                                    {REQUIRED_HEADERS.map(
                                                        (header) => (

                                                            <td key={header}>
                                                                {row[header] || "-"}
                                                            </td>

                                                        )
                                                    )}

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                            <div className="mt-3">

                                <Button
                                    color="primary"
                                    onClick={handleUpload}
                                    disabled={loading}
                                >

                                    {loading ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="mr-1"
                                            />

                                            Uploading...
                                        </>
                                    ) : (
                                        "Upload Tutors"
                                    )}

                                </Button>
                            </div>

                        </div>

                    )}

                </PreviewCard>

                <ToastContainer />

            </Content>

        </React.Fragment>
    );
};

export default TCTTutorBulkUpload;
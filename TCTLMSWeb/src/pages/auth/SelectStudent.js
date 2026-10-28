import React, { useEffect, useState } from "react";
import {
  Block,
  BlockHead,
  BlockTitle,
  Button,
  PreviewCard,
} from "../../components/Component";
import { Alert, Spinner } from "reactstrap";
import PageContainer from "../../layout/page-container/PageContainer";
import Head from "../../layout/head/Head";
import { CompleteStudentLogin, GetMenuByUser } from "../../apiservices/AuthenticateService";

const SelectStudent = () => {
  const [students, setStudents] = useState([]);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedStudents = localStorage.getItem("pendingStudentSelection");
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }
  }, []);

  const handleContinue = (student) => {
    const selectedUserId = student.userId || student.UserId;
    const loginEmail = localStorage.getItem("pendingLoginEmail") || "";

    if (!selectedUserId) {
      setError("Selected student is invalid.");
      return;
    }

    setLoadingId(selectedUserId);
    setError("");

    CompleteStudentLogin({ userId: selectedUserId, loginEmail })
      .then((responseResult) => {
        const token = responseResult?.token ?? responseResult?.Token;
        const userId = responseResult?.userId ?? responseResult?.UserId;
        const userName = responseResult?.userName ?? responseResult?.UserName;
        const email = responseResult?.email ?? responseResult?.Email;
        const role = responseResult?.role ?? responseResult?.Role;
        const roleId = responseResult?.roleId ?? responseResult?.RoleId;
        const nationality = responseResult?.nationality ?? responseResult?.Nationality;
        const message = responseResult?.message ?? responseResult?.Message;

        if (!token) {
          setLoadingId("");
          setError(message || "Unable to continue login.");
          return;
        }

        localStorage.removeItem("pendingStudentSelection");
        localStorage.removeItem("pendingLoginEmail");

        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshTokenExpiresAt", responseResult.refreshTokenExpiresAt || "");
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);
        localStorage.setItem("email", email);
        localStorage.setItem("userRole", role);
        localStorage.setItem("roleId", roleId);
        localStorage.setItem("nationality", nationality);

        GetMenuByUser(roleId).then((response) => {
          localStorage.setItem("MenuPermissions", JSON.stringify(response));
          window.location.href = `${process.env.PUBLIC_URL}/`;
        });
      })
      .catch((error) => {
        console.log("complete-student-login error:", error);
        setLoadingId("");
        setError("Something went wrong. Please try again.");
      });
  };

  return (
    <>
      <Head title="Select Student" />
      <PageContainer>
        <Block className="nk-block-middle nk-auth-body wide-md">
          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
            <BlockHead>
              <BlockTitle tag="h4">Select Student</BlockTitle>
              <p>We found multiple students linked to this email. Please choose a student to continue.</p>
            </BlockHead>

            {error && <Alert color="danger">{error}</Alert>}

            <div className="row g-3">
              {students.map((student, index) => {
                const studentId = student.userId || student.UserId;
                const studentName = student.studentName || student.StudentName;
                const userCode = student.userCode || student.UserCode;
                const className = student.className || student.ClassName;

                return (
                  <div className="col-md-6" key={studentId || index}>
                    <div className="border rounded p-3 h-100">
                      <h5 className="mb-2">{studentName}</h5>
                      <p className="mb-1">
                        <strong>User Code:</strong> {userCode}
                      </p>
                      <p className="mb-3">
                        <strong>Class:</strong> {className || "-"}
                      </p>

                      <Button
                        color="primary"
                        onClick={() => handleContinue(student)}
                        disabled={loadingId === studentId}
                      >
                        {loadingId === studentId ? <Spinner size="sm" /> : "Continue"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </PreviewCard>
        </Block>
      </PageContainer>
    </>
  );
};

export default SelectStudent;

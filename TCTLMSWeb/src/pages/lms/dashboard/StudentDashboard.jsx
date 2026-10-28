import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { 
  Card, 
  UncontrolledDropdown, 
  DropdownMenu, 
  DropdownItem, 
  DropdownToggle,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Alert,
  Spinner
} from "reactstrap";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  Row,
  Col,
  BlockBetween,
  RSelect,
} from "../../../components/Component";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  getCurrentStudentDashboard,
  submitTctLearningExperienceFeedback,
  hasStudentFeedbackToday,
  hasStudentCompletedFirstClass,
} from "../../../apiservices/DashboardService";

const StudentDashboard = () => {
  const [sm, updateSm] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumped by the Refresh button to re-run the existing dashboard load.
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);

  // TCT Feedback Modal States
  const [showTCTModal, setShowTCTModal] = useState(false);
  const [teacherQualityRating, setTeacherQualityRating] = useState("");
  const [overallExperienceRating, setOverallExperienceRating] = useState("");
  const [feedbackComments, setFeedbackComments] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [specificIssues, setSpecificIssues] = useState({
    teachingMethod: false,
    punctuality: false,
    communication: false,
    technicalIssues: false,
    other: false
  });

  // Get user ID - you may need to adjust this based on how you get the current user ID
  const userId = localStorage.getItem("userId");

  const checkDailyModal = async (isActive = () => true) => {
    if (!userId) return;
    try {
      const response = await hasStudentFeedbackToday(userId);
      if (isActive() && !response?.hasSubmitted) {
        setShowTCTModal(true);
      }
    } catch {
      if (isActive()) setShowTCTModal(true);
    }
  };

  const handleModalClose = () => {
    setShowTCTModal(false);
    setFeedbackSubmitted(false);
    setTeacherQualityRating("");
    setOverallExperienceRating("");
    setFeedbackComments("");
    setSpecificIssues({
      teachingMethod: false,
      punctuality: false,
      communication: false,
      technicalIssues: false,
      other: false
    });
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      userId: userId,
      teacherQualityRating,
      overallExperienceRating,
      issueTeachingMethod: specificIssues.teachingMethod,
      issuePunctuality: specificIssues.punctuality,
      issueCommunication: specificIssues.communication,
      issueTechnicalIssues: specificIssues.technicalIssues,
      issueOther: specificIssues.other,
      comments: feedbackComments,
    };

    setFeedbackSubmitting(true);
    try {
      await submitTctLearningExperienceFeedback(payload);
      setFeedbackSubmitted(true);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleIssueChange = (issueType) => {
    setSpecificIssues(prev => ({
      ...prev,
      [issueType]: !prev[issueType]
    }));
  };

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCurrentStudentDashboard();
        if (!active) return;
        
        if (response) {
          const courses = response.courses || [];
          const upcomingClasses = response.upcomingClasses || [];
          const attendanceRecords = response.attendance || [];
          const summary = response.summary || {};
          const subjectSummaries = courses.map((course) => {
            const upcoming = Number(course.upcomingClasses ?? course.UpcomingClasses) || 0;
            const completed = Number(course.completedClasses ?? course.CompletedClasses ?? course.classesToDate ?? course.ClassesToDate) || 0;
            const suppliedTotal = course.totalScheduledClasses ?? course.TotalScheduledClasses;
            const total = suppliedTotal == null ? completed + upcoming : Number(suppliedTotal) || 0;
            const courseSubjectId = course.subjectId ?? course.SubjectId;
            const courseName = course.courseName ?? course.CourseName;
            const classDates = attendanceRecords
              .filter((item) => {
                const attendanceSubjectId = item.subjectId ?? item.SubjectId;
                const attendanceSubjectName = item.subjectName ?? item.SubjectName;
                return (courseSubjectId && attendanceSubjectId === courseSubjectId)
                  || (!courseSubjectId && attendanceSubjectName === courseName);
              })
              .map((item) => item.classDate ?? item.ClassDate)
              .filter(Boolean)
              .map((value) => new Date(value))
              .filter((value) => !Number.isNaN(value.getTime()))
              .sort((left, right) => left - right);
            return {
              subjectName: courseName,
              completedClasses: completed,
              upcomingClasses: upcoming,
              totalScheduledClasses: total,
              studentAttendanceCount: Number(course.classesPresent ?? course.ClassesPresent) || 0,
              // The API returns no value when no attendance has been marked; keep it missing (null), not 0%.
              studentAttendancePercentage: (course.attendancePercent ?? course.AttendancePercent) == null
                ? null
                : Number(course.attendancePercent ?? course.AttendancePercent) || 0,
              completionPercentage: total > 0 ? (completed * 100) / total : 0,
              cancelledClassesByStudent: Number(course.cancelledClassesByStudent ?? course.CancelledClassesByStudent) || 0,
              currentMonthScheduledClasses: Number(course.currentMonthScheduledClasses ?? course.CurrentMonthScheduledClasses) || 0,
              currentMonthCompletedClasses: Number(course.currentMonthCompletedClasses ?? course.CurrentMonthCompletedClasses) || 0,
              currentMonthUpcomingClasses: Number(course.currentMonthUpcomingClasses ?? course.CurrentMonthUpcomingClasses) || 0,
              firstScheduleDate: course.firstScheduleDate ?? course.FirstScheduleDate ?? classDates[0],
              lastScheduleDate: course.lastScheduleDate ?? course.LastScheduleDate ?? classDates[classDates.length - 1],
            };
          });
          const overallSummary = {
            totalClassesScheduled: subjectSummaries.reduce((sum, item) => sum + item.totalScheduledClasses, 0),
            totalCompletedClasses: subjectSummaries.reduce((sum, item) => sum + item.completedClasses, 0),
            totalUpcomingClasses: Number(summary.upcomingClasses ?? summary.UpcomingClasses) || upcomingClasses.length,
            overallStudentAttendancePercentage: (summary.attendancePercent ?? summary.AttendancePercent) == null
              ? null
              : Number(summary.attendancePercent ?? summary.AttendancePercent) || 0,
            totalCancelledClassesByStudent: subjectSummaries.reduce((sum, item) => sum + item.cancelledClassesByStudent, 0),
            scheduledClassesForCurrentMonth: subjectSummaries.reduce((sum, item) => sum + item.currentMonthScheduledClasses, 0),
            completedClassesForCurrentMonth: subjectSummaries.reduce((sum, item) => sum + item.currentMonthCompletedClasses, 0),
            upcomingClassesForCurrentMonth: subjectSummaries.reduce((sum, item) => sum + item.currentMonthUpcomingClasses, 0),
            extraClassesForCurrentMonth: Number(summary.currentMonthExtraClasses ?? summary.CurrentMonthExtraClasses) || 0,
          };

          const eligibility = await hasStudentCompletedFirstClass(userId);
          if (!active) return;
          const canGiveFeedback = eligibility?.hasCompletedFirstClass === true;
          setDashboardData({
            ...response,
            overallSummary,
            subjectSummaries,
            showLearningExperienceFeedback: canGiveFeedback,
          });
          if (canGiveFeedback) checkDailyModal(() => active);
        } else {
          setDashboardData(null);
        }
      } catch (err) {
        if (active) setError('Failed to load dashboard data. Please try Refresh.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (userId) {
      fetchDashboardData();
    } else {
      setError("User ID not found. Please log in again.");
      setLoading(false);
    }
    return () => { active = false; };
  }, [userId, refreshKey]);

  // Extract overall summary and subject summaries from API response
  const overallSummary = dashboardData?.overallSummary || {};
  const subjectSummaries = dashboardData?.subjectSummaries || [];
  const upcomingClassRows = dashboardData?.upcomingClasses || [];
  const attendanceRows = dashboardData?.attendance || [];
  const monthlyAttendanceRows = dashboardData?.monthlyAttendance || [];
  const tutorRows = dashboardData?.tutors || [];
  const ratingRows = dashboardData?.ratings || [];
  const notificationRows = dashboardData?.notifications || [];
  const unreadNotificationSummary = dashboardData?.unreadNotificationCount || {};
  const messageSummary = dashboardData?.messageSummary || {};
  const conversationRows = dashboardData?.conversations || [];

  const valueOf = (item, camelName, pascalName) => item?.[camelName] ?? item?.[pascalName];
  const formatDashboardDate = (value, includeTime = false) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  };
  const formatDashboardTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // ✅ API flag – used to guard the modal
  const showLearningExperienceFeedback = dashboardData?.showLearningExperienceFeedback === true;

  // Calculate summary statistics from API data using overallSummary
  const summaryStats = {
    totalSubjects: subjectSummaries.length,
    totalScheduledClasses: parseInt(overallSummary.totalClassesScheduled) || 0,
    totalCompletedClasses: parseInt(overallSummary.totalCompletedClasses) || 0,
    totalUpcomingClasses: parseInt(overallSummary.totalUpcomingClasses) || 0,
    averageAttendance: overallSummary.overallStudentAttendancePercentage == null
      ? null
      : (parseFloat(overallSummary.overallStudentAttendancePercentage) || 0).toFixed(2),
    totalCancellations: parseInt(overallSummary.totalCancelledClassesByStudent) || 0,
    scheduledThisMonth: parseInt(overallSummary.scheduledClassesForCurrentMonth) || 0,
    completedThisMonth: parseInt(overallSummary.completedClassesForCurrentMonth) || 0,
    upcomingThisMonth: parseInt(overallSummary.upcomingClassesForCurrentMonth) || 0,
    extraThisMonth: parseInt(overallSummary.extraClassesForCurrentMonth) || 0
  };

  // Data for stacked bar chart using subjectSummaries
  const subjectComparisonData = subjectSummaries.map(item => ({
    subject: item.subjectName || item.SubjectName,
    completed: parseInt(item.completedClasses || item.CompletedClasses) || 0,
    upcoming: parseInt(item.upcomingClasses || item.UpcomingClasses) || 0,
    cancelled: parseInt(item.cancelledClassesByStudent || item.CancelledClassesByStudent) || 0,
    attendance: parseFloat(item.studentAttendancePercentage || item.StudentAttendancePercentage) || 0,
    completion: parseFloat(item.completionPercentage || item.CompletionPercentage) || 0,
    scheduledThisMonth: parseInt(item.currentMonthScheduledClasses || item.CurrentMonthScheduledClasses) || 0,
    completedThisMonth: parseInt(item.currentMonthCompletedClasses || item.CurrentMonthCompletedClasses) || 0,
    upcomingThisMonth: parseInt(item.currentMonthUpcomingClasses || item.CurrentMonthUpcomingClasses) || 0
  }));

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Attendance is "recorded" only when the API returned a value; missing stays missing.
  const hasAttendanceValue = (value) =>
    value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
  const formatAttendance = (value, digits = 1) =>
    hasAttendanceValue(value) ? `${Number(value).toFixed(digits)}%` : "Not recorded";

  // Notification messages arrive with HTML markup (e.g. <b>…</b>). Decode to plain text
  // without executing anything, then render it as normal React text.
  const toPlainText = (value) => {
    if (value === null || value === undefined) return "";
    try {
      const doc = new DOMParser().parseFromString(String(value), "text/html");
      return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    } catch {
      return String(value).replace(/<[^>]*>/g, "").trim();
    }
  };

  // Attendance data per subject (value is null when not recorded)
  const attendanceData = subjectSummaries.map((item, index) => {
    const rawValue = item.studentAttendancePercentage ?? item.StudentAttendancePercentage;
    return {
      name: item.subjectName || item.SubjectName,
      value: hasAttendanceValue(rawValue) ? Number(rawValue) : null,
      count: parseInt(item.studentAttendanceCount || item.StudentAttendanceCount) || 0,
      color: COLORS[index % COLORS.length]
    };
  });
  // Only subjects with recorded attendance are charted.
  const recordedAttendanceData = attendanceData.filter((item) => item.value !== null);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          style={{
            backgroundColor: '#2d3748',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            minWidth: '120px'
          }}
        >
          <div style={{ marginBottom: '4px', fontSize: '12px', opacity: '0.8' }}>
            {data.name}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {data.count} Classes ({data.value.toFixed(1)}%)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Stacked Bar Chart
  const StackedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          style={{
            backgroundColor: '#1a202c',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '160px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#e2e8f0' }}>
            {label}
          </div>
          {payload.map((entry, index) => (
            <div key={index} style={{ marginBottom: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: entry.color, 
                  marginRight: '8px',
                  display: 'inline-block'
                }}></span>
                {entry.name}:
              </span>
              <span style={{ fontWeight: '600', marginLeft: '8px' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Horizontal bar chart of recorded attendance % per subject (0–100).
  const AttendanceChart = () => {
    if (recordedAttendanceData.length === 0) {
      return (
        <div className="sd-empty">
          <Icon name="calendar-check" />
          <div>No attendance recorded yet</div>
          <small>Attendance will appear here once your classes are marked.</small>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={Math.max(140, recordedAttendanceData.length * 44 + 40)}>
        <BarChart data={recordedAttendanceData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f2" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#8094ae" }}
            axisLine={{ stroke: "#dbdfea" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: "#526484" }}
            axisLine={{ stroke: "#dbdfea" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(133, 79, 255, 0.06)" }} />
          <Bar dataKey="value" name="Attendance" radius={[0, 4, 4, 0]} barSize={18}>
            {recordedAttendanceData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Accent colours for stat cards (icon chip background / foreground).
  const STAT_ACCENTS = {
    blue: { bg: "rgba(85, 155, 251, 0.12)", fg: "#3b7fe0" },
    green: { bg: "rgba(30, 224, 172, 0.14)", fg: "#0fa37f" },
    teal: { bg: "rgba(9, 194, 222, 0.12)", fg: "#0899b0" },
    purple: { bg: "rgba(133, 79, 255, 0.12)", fg: "#854fff" },
  };

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, iconName, trend, accent = "purple" }) => {
    const colors = STAT_ACCENTS[accent] || STAT_ACCENTS.purple;
    return (
      <div className={`card card-bordered h-100 sd-stat sd-stat--${accent}`}>
        <div className="card-inner d-flex align-items-center">
          <div className="sd-stat-icon" style={{ background: colors.bg, color: colors.fg }}>
            <Icon name={iconName} />
          </div>
          <div className="sd-stat-body">
            <div className="sd-stat-title">{title}</div>
            <div className="sd-stat-value">
              {value}
              {subtitle && <span className="sd-stat-sub">{subtitle}</span>}
            </div>
            {trend && (
              <div className="sd-stat-sub">
                <span className="text-success">{trend}</span> vs last month
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Subject Card Component
  const SubjectCard = ({ subject, sectionTitle, headerControl, footer }) => (
    <div className="card card-bordered h-100 sd-subject-card">
      <div className="card-inner">
        {sectionTitle && (
          <div className="card-title-group align-start mb-3">
            <div className="card-title"><h6 className="title">{sectionTitle}</h6></div>
            {headerControl && <div className="card-tools sd-subject-select">{headerControl}</div>}
          </div>
        )}
        <div className="card-title-group align-start mb-2">
          <div className="card-title">
            <h6 className="title">{subject.subjectName || subject.SubjectName}</h6>
          </div>
          <div className="card-tools">
            <Icon name="book" className="text-primary" />
          </div>
        </div>
        
        <div className="row g-2 mb-3 sd-subject-stats">
          <div className="col-4">
            <div className="text-center">
              <span className="amount text-info">{parseInt(subject.completedClasses || subject.CompletedClasses) || 0}</span>
              <span className="sub-title d-block">Completed</span>
            </div>
          </div>
          <div className="col-4">
            <div className="text-center">
              <span className="amount text-success">{parseInt(subject.upcomingClasses || subject.UpcomingClasses) || 0}</span>
              <span className="sub-title d-block">Upcoming</span>
            </div>
          </div>
          <div className="col-4">
            <div className="text-center">
              <span className="amount text-warning">{parseInt(subject.totalScheduledClasses || subject.TotalScheduledClasses) || 0}</span>
              <span className="sub-title d-block">Total Scheduled</span>
            </div>
          </div>
        </div>

        <div className="progress-wrap mb-3">
          <div className="progress-text">
            <span>Attendance</span>
            <span className={hasAttendanceValue(subject.studentAttendancePercentage ?? subject.StudentAttendancePercentage) ? "" : "text-soft"}>
              {formatAttendance(subject.studentAttendancePercentage ?? subject.StudentAttendancePercentage)}
            </span>
          </div>
          <div className="progress progress-md">
            <div className="progress-bar bg-success" style={{ width: `${hasAttendanceValue(subject.studentAttendancePercentage ?? subject.StudentAttendancePercentage) ? Number(subject.studentAttendancePercentage ?? subject.StudentAttendancePercentage) : 0}%` }}></div>
          </div>
        </div>

        <div className="progress-wrap mb-3">
          <div className="progress-text">
            <span>Completion</span>
            <span>{(parseFloat(subject.completionPercentage || subject.CompletionPercentage) || 0).toFixed(1)}%</span>
          </div>
          <div className="progress progress-md">
            <div className="progress-bar bg-primary" style={{ width: `${parseFloat(subject.completionPercentage || subject.CompletionPercentage) || 0}%` }}></div>
          </div>
        </div>

        <div className="row g-3 text-sm">
          <div className="col-6">
            <span className="text-muted">Cancelled: {parseInt(subject.cancelledClassesByStudent || subject.CancelledClassesByStudent) || 0}</span>
          </div>
          <div className="col-6 text-end">
            <span className="text-muted">This Month: {parseInt(subject.currentMonthScheduledClasses || subject.CurrentMonthScheduledClasses) || 0}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted">
          <div>First Class: {(subject.firstScheduleDate || subject.FirstScheduleDate) ? new Date(subject.firstScheduleDate || subject.FirstScheduleDate).toLocaleDateString() : 'N/A'}</div>
          <div>Last Class: {(subject.lastScheduleDate || subject.LastScheduleDate) ? new Date(subject.lastScheduleDate || subject.LastScheduleDate).toLocaleDateString() : 'N/A'}</div>
        </div>
        {footer}
      </div>
    </div>
  );

  // Generate insights based on API data
  const generateInsights = () => {
    if (subjectSummaries.length === 0) return [];

    const insights = [];
    
    // Find subject with highest attendance
    const highestAttendance = subjectSummaries.reduce((prev, current) => 
      (parseFloat(prev.studentAttendancePercentage || prev.StudentAttendancePercentage) || 0) > 
      (parseFloat(current.studentAttendancePercentage || current.StudentAttendancePercentage) || 0) ? prev : current
    );
    
    // Find subject with most upcoming classes
    const mostUpcoming = subjectSummaries.reduce((prev, current) => 
      (parseInt(prev.upcomingClasses || prev.UpcomingClasses) || 0) > 
      (parseInt(current.upcomingClasses || current.UpcomingClasses) || 0) ? prev : current
    );
    
    // Find subject with most cancellations
    const mostCancellations = subjectSummaries.reduce((prev, current) => 
      (parseInt(prev.cancelledClassesByStudent || prev.CancelledClassesByStudent) || 0) > 
      (parseInt(current.cancelledClassesByStudent || current.CancelledClassesByStudent) || 0) ? prev : current
    );

    if (parseFloat(highestAttendance.studentAttendancePercentage || highestAttendance.StudentAttendancePercentage) > 0) {
      insights.push({
        type: 'success',
        title: 'Strong Performance',
        message: `${highestAttendance.subjectName || highestAttendance.SubjectName} shows highest attendance rate at ${(parseFloat(highestAttendance.studentAttendancePercentage || highestAttendance.StudentAttendancePercentage) || 0).toFixed(1)}%`
      });
    }

    if (parseInt(mostUpcoming.upcomingClasses || mostUpcoming.UpcomingClasses) > 0) {
      insights.push({
        type: 'info',
        title: 'Upcoming Focus',
        message: `${mostUpcoming.subjectName || mostUpcoming.SubjectName} has ${parseInt(mostUpcoming.upcomingClasses || mostUpcoming.UpcomingClasses)} upcoming classes`
      });
    }

    if (parseInt(mostCancellations.cancelledClassesByStudent || mostCancellations.CancelledClassesByStudent) > 0) {
      insights.push({
        type: 'warning',
        title: 'Improvement Area',
        message: `${mostCancellations.subjectName || mostCancellations.SubjectName} has the most cancellations (${parseInt(mostCancellations.cancelledClassesByStudent || mostCancellations.CancelledClassesByStudent)} classes)`
      });
    }

    // Overall attendance insight (only for a genuine recorded value)
    const overallAttendance = parseFloat(overallSummary.overallStudentAttendancePercentage) || 0;
    if (!hasAttendanceValue(overallSummary.overallStudentAttendancePercentage)) {
      insights.push({
        type: 'light',
        title: 'Attendance',
        message: 'Attendance has not been recorded yet.'
      });
    } else if (overallAttendance >= 90) {
      insights.push({
        type: 'success',
        title: 'Excellent Attendance',
        message: `Your overall attendance rate is ${overallAttendance.toFixed(1)}% - Keep it up!`
      });
    } else if (overallAttendance < 75) {
      insights.push({
        type: 'warning',
        title: 'Attendance Alert',
        message: `Your overall attendance is ${overallAttendance.toFixed(1)}% - Consider improving your attendance`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  // Debug information - remove this in production
  console.log("Current state:", {
    loading,
    error,
    dashboardData,
    overallSummary,
    subjectSummariesLength: subjectSummaries.length,
    summaryStats,
    userId,
    showLearningExperienceFeedback,
    showTCTModal,
  });

  return (
    <React.Fragment>
      {/* <style> sits inside <Content> so .nk-content stays the header's next sibling and
          the theme's fixed-header spacing (.nk-header-fixed + .nk-content) applies. */}
      <Content>
      <style>{`
        .student-dashboard-order { display: flex; flex-direction: column; }
        /* Heading + summary stats first (the subtitle and quick-link blocks now live in the heading). */
        .student-dashboard-order > :nth-child(-n+2) { order: -2; }
        .student-dashboard-order > .dashboard-operational-section { order: -1; }

        /* ---- Student Dashboard look (scoped to .student-dashboard) ---- */
        .student-dashboard .nk-block + .nk-block { padding-top: 18px; }

        /* Heading row: title/subtitle left, actions right; wraps on small screens */
        .student-dashboard .sd-head { padding-bottom: 16px; }
        .student-dashboard .sd-head-row { flex-wrap: wrap; gap: 12px; align-items: center; }
        .student-dashboard .sd-title { font-size: 22px; font-weight: 700; color: #364a63; margin-bottom: 2px; }
        .student-dashboard .sd-subtitle { font-size: 13px; color: #8094ae; margin-bottom: 0; }
        .student-dashboard .sd-head-actions { display: flex; align-items: center; gap: 8px; }
        .student-dashboard .sd-head-actions .btn-outline-primary { border-radius: 8px; font-weight: 600; white-space: nowrap; }
        .student-dashboard .sd-head-actions { flex-wrap: wrap; justify-content: flex-end; }
        .student-dashboard .sd-head-actions .sd-refresh-btn {
          border: 1px solid #dbdfea; border-radius: 8px; background: #fff;
          color: #526484; font-weight: 600; white-space: nowrap;
        }
        .student-dashboard .sd-head-actions .sd-refresh-btn:hover:not(:disabled) { border-color: #854fff; color: #854fff; background: #fff; }
        .student-dashboard .sd-head-actions .sd-refresh-btn:disabled { opacity: 0.75; cursor: progress; }

        /* Long lists/tables scroll inside their card instead of stretching the page */
        .student-dashboard .sd-scroll { max-height: 340px; overflow-y: auto; }
        .student-dashboard .sd-scroll thead th { position: sticky; top: 0; z-index: 1; }
        .student-dashboard .sd-list > .border-bottom:last-child { border-bottom: 0 !important; }
        .student-dashboard .sd-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .student-dashboard .sd-scroll::-webkit-scrollbar-thumb { background: #dbdfea; border-radius: 3px; }

        /* Badges and progress bars in the theme's softer style */
        .student-dashboard .badge { border-radius: 6px; font-weight: 600; }
        .student-dashboard .progress { background: #eef1f6; border-radius: 6px; }
        .student-dashboard .progress-bar { border-radius: 6px; }
        .student-dashboard .card:hover { box-shadow: 0 3px 10px rgba(31, 43, 58, 0.07); }
        .student-dashboard .card {
          border: 1px solid #e5e9f2;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05);
        }
        .student-dashboard .card-inner { padding: 16px 20px; }
        .student-dashboard .card .title { font-size: 15px; font-weight: 600; color: #364a63; }
        .student-dashboard .card .title .icon { color: #854fff; }
        .student-dashboard .card-title p.text-muted { font-size: 12px; margin-bottom: 0; }

        /* Compact stat cards */
        .student-dashboard .sd-stat .card-inner { padding: 14px 16px; gap: 14px; }
        .student-dashboard .sd-stat-icon {
          width: 42px; height: 42px; min-width: 42px;
          border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .student-dashboard .sd-stat-body { min-width: 0; }
        .student-dashboard .sd-stat-title { font-size: 12px; font-weight: 500; color: #8094ae; line-height: 1.3; }
        .student-dashboard .sd-stat-value {
          font-size: 22px; font-weight: 700; color: #364a63; line-height: 1.25;
          display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px;
        }
        .student-dashboard .sd-stat-sub { font-size: 12px; font-weight: 500; color: #8094ae; }

        /* Insights */
        .student-dashboard .alert { padding: 12px 16px; margin-bottom: 0; border-radius: 10px; }
        .student-dashboard .alert h6 { font-size: 14px; margin-bottom: 2px; }
        .student-dashboard .alert p { font-size: 13px; margin-bottom: 0; }

        /* Tables */
        .student-dashboard .table { margin-bottom: 0; }
        .student-dashboard .table th {
          font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
          color: #8094ae; background: #f5f6fa; border-top: 0; padding: 8px 12px; white-space: nowrap;
        }
        .student-dashboard .table td { font-size: 13px; color: #526484; padding: 9px 12px; vertical-align: middle; }

        /* Attendance chart legend */
        .student-dashboard .sd-attendance-legend { list-style: none; margin: 12px 0 0; padding: 0; }
        .student-dashboard .sd-attendance-legend li {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; border-bottom: 1px dashed #e5e9f2; font-size: 13px; color: #526484;
        }
        .student-dashboard .sd-attendance-legend li:last-child { border-bottom: 0; }
        .student-dashboard .sd-attendance-legend .dot { margin-right: 8px; }
        .student-dashboard .sd-attendance-legend .sd-value { font-weight: 600; color: #364a63; }
        .student-dashboard .sd-attendance-legend .sd-value.text-soft { font-weight: 500; }
        .student-dashboard .sd-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 28px 12px; text-align: center; color: #526484;
          background: #f5f6fa; border-radius: 10px;
        }
        .student-dashboard .sd-empty .icon { font-size: 24px; color: #09c2de; }
        .student-dashboard .sd-empty small { color: #8094ae; }

        /* Lists inside cards */
        .student-dashboard .border-bottom { border-color: #edf0f5 !important; }
        .student-dashboard .card-inner > .border-bottom:last-child { border-bottom: 0 !important; }

        /* Learning content tiles */
        .student-dashboard .sd-learning-tile { padding: 16px !important; border-color: #e5e9f2 !important; border-radius: 10px !important; }
        .student-dashboard .sd-learning-tile .icon { font-size: 22px !important; }
        .student-dashboard .sd-learning-tile p { font-size: 12px; }

        /* Subject Attendance Distribution: content-driven; empty state centred in spare height */
        .student-dashboard .sd-attendance-card .card-inner { display: flex; flex-direction: column; height: 100%; }
        .student-dashboard .sd-attendance-card .sd-empty { margin: auto 0; padding: 20px 12px; }

        /* Subject Details dropdown: react-select's value is absolutely positioned (no intrinsic
           width), so the shrink-to-fit header slot collapsed it. Give the slot a real width. */
        .student-dashboard .sd-subject-card .card-title-group { gap: 12px; align-items: center !important; }
        .student-dashboard .sd-subject-select {
          flex: 0 1 200px;
          width: 200px;
          min-width: 150px;
          max-width: 60%;
          margin-left: auto;
        }
        .student-dashboard .sd-subject-select .form-control-select,
        .student-dashboard .sd-subject-select .react-select-container { width: 100%; }
        .student-dashboard .sd-subject-select .react-select__value-container { flex-wrap: nowrap; padding: 2px 10px; }
        .student-dashboard .sd-subject-select .react-select__single-value { white-space: nowrap; }
        .student-dashboard .sd-subject-select .react-select__menu { min-width: 100%; }

        /* Subject Details: tighter vertical rhythm */
        .student-dashboard .sd-subject-card .card-title-group { margin-bottom: 10px !important; }
        .student-dashboard .sd-subject-card .sd-subject-stats { margin-bottom: 12px !important; }
        .student-dashboard .sd-subject-card .sd-subject-stats .amount { font-size: 22px; font-weight: 700; line-height: 1.2; }
        .student-dashboard .sd-subject-card .sd-subject-stats .sub-title { font-size: 12px; color: #8094ae; }
        .student-dashboard .sd-subject-card .progress-wrap { margin-bottom: 10px !important; }
        .student-dashboard .sd-subject-card .progress-text { font-size: 12px; color: #526484; margin-bottom: 4px; }
        .student-dashboard .sd-subject-card .progress-md { height: 6px; }
        .student-dashboard .sd-subject-card .text-sm { font-size: 12px; }
        .student-dashboard .sd-subject-card .mt-2.text-xs { margin-top: 4px !important; font-size: 12px; line-height: 1.6; }

        /* ===== Visual polish (colours only; layout and data unchanged) ===== */
        /* Heading banner */
        .student-dashboard .sd-head {
          padding: 18px 22px;
          margin-bottom: 18px;
          background: linear-gradient(120deg, #f3edff 0%, #eef3ff 60%, #e9f7fb 100%);
          border: 1px solid #e6defe;
          border-radius: 14px;
        }
        .student-dashboard .sd-title { color: #2c2257; }
        .student-dashboard .sd-subtitle { color: #6c6890; }

        /* Stat cards: thin top accent in the card's colour + gentle lift */
        .student-dashboard .sd-stat { border-top: 3px solid transparent; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .student-dashboard .sd-stat:hover { transform: translateY(-2px); }
        .student-dashboard .sd-stat--blue { border-top-color: #559bfb; }
        .student-dashboard .sd-stat--green { border-top-color: #1ee0ac; }
        .student-dashboard .sd-stat--teal { border-top-color: #09c2de; }
        .student-dashboard .sd-stat--purple { border-top-color: #854fff; }

        /* Section titles: icon in a tinted chip */
        .student-dashboard .card .title { display: flex; align-items: center; }
        .student-dashboard .card .title > .icon {
          width: 28px; height: 28px; min-width: 28px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 8px; background: rgba(133, 79, 255, 0.1);
          color: #854fff; font-size: 15px; margin-right: 10px !important;
        }

        /* Tables: soft row hover */
        .student-dashboard .table tbody tr { transition: background-color 0.12s ease; }
        .student-dashboard .table tbody tr:hover { background-color: #faf7ff; }
        .student-dashboard .table td a { color: #854fff; font-weight: 600; }

        /* Insights: coloured left accent per type */
        .student-dashboard .alert { border-left-width: 4px; }
        .student-dashboard .alert-info { border-left-color: #09c2de; }
        .student-dashboard .alert-light { border-left-color: #b7c2d0; background: #f8f9fc; }
        .student-dashboard .alert-warning { border-left-color: #f4bd0e; }
        .student-dashboard .alert-success { border-left-color: #1ee0ac; }

        /* Notifications: dot marker + soft hover on each item */
        .student-dashboard .sd-list > .border-bottom {
          position: relative; padding-left: 16px !important; border-radius: 6px; transition: background-color 0.12s ease;
        }
        .student-dashboard .sd-list > .border-bottom:hover { background-color: #faf7ff; }
        .student-dashboard .sd-list > .border-bottom::before {
          content: ""; position: absolute; left: 2px; top: 16px;
          width: 7px; height: 7px; border-radius: 50%; background: #854fff;
        }
        .student-dashboard .sd-list strong { color: #364a63; }

        /* Communication: tinted Sent / Received boxes */
        .student-dashboard .sd-comm-box { border-radius: 10px !important; }
        .student-dashboard .sd-comm-box h4 { font-size: 26px; font-weight: 700; margin: 2px 0 0; }
        .student-dashboard .sd-comm-sent { background: #f2f7ff; border-color: #d6e6fe !important; }
        .student-dashboard .sd-comm-sent h4 { color: #3b7fe0; }
        .student-dashboard .sd-comm-received { background: #effcf8; border-color: #c7f3e6 !important; }
        .student-dashboard .sd-comm-received h4 { color: #0fa37f; }

        /* Learning content: icon in a tinted circle, purple border on hover */
        .student-dashboard .sd-learning-tile { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .student-dashboard .sd-learning-tile:hover { border-color: #c9b5ff !important; box-shadow: 0 4px 14px rgba(133, 79, 255, 0.08); }
        .student-dashboard .sd-learning-tile .icon {
          width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 50%; background: rgba(133, 79, 255, 0.1);
        }
        .student-dashboard .sd-learning-tile h6 { color: #364a63; font-weight: 600; }
      `}</style>
        <div className="student-dashboard-order student-dashboard">
        {/* Heading: title + subtitle on the left, My Tests & Assessments on the right */}
        <BlockHead className="sd-head">
          <BlockBetween className="sd-head-row">
            <BlockHeadContent>
              <h3 className="sd-title">Student Dashboard</h3>
              <p className="sd-subtitle">Track your academic progress and performance</p>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="sd-head-actions">
                {error && !loading && <small className="text-danger">{error}</small>}
                <Link to={`${process.env.PUBLIC_URL}/lms/assessment/my-tests`} className="btn btn-outline-primary">
                  <Icon name="file-text" className="mr-1" />
                  My Tests &amp; Assessments
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-light btn-white sd-refresh-btn"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={loading}
                  title="Reload dashboard data"
                >
                  {loading ? <Spinner size="sm" className="mr-1" /> : <Icon name="reload" className="mr-1" />}
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                <div className="toggle-wrap nk-block-tools-toggle">
                  <Button
                    className={`btn-icon btn-trigger toggle-expand mr-n1 ${sm ? "active" : ""}`}
                    onClick={() => updateSm(!sm)}
                  >
                    <Icon name="more-v" />
                  </Button>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {/* Summary Statistics */}
        <Block>
          <Row className="g-3">
            <Col lg="3" sm="6">
              <StatCard
                title="Total Subjects"
                value={summaryStats.totalSubjects} 
                iconName="book"
                accent="blue"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard 
                title="Classes Completed" 
                value={summaryStats.totalCompletedClasses} 
                subtitle={`out of ${summaryStats.totalScheduledClasses}`}
                iconName="check-circle"
                accent="green"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard 
                title="Overall Attendance" 
                value={summaryStats.averageAttendance == null ? "Not recorded" : `${summaryStats.averageAttendance}%`} 
                iconName="target" 
                accent="teal"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard 
                title="Upcoming Classes" 
                value={summaryStats.totalUpcomingClasses} 
                iconName="calendar" 
                accent="purple"
              />
            </Col>
          </Row>
        </Block>

        {/* Current Month Stats */}
        <Block>
          <Row className="g-3">
            <Col lg="3" sm="6">
              <StatCard 
                title="This Month - Scheduled" 
                value={summaryStats.scheduledThisMonth} 
                iconName="calendar-booking"
                accent="blue"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard 
                title="This Month - Completed" 
                value={summaryStats.completedThisMonth} 
                iconName="check-round-cut"
                accent="green"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard
                title="This Month - Upcoming"
                value={summaryStats.upcomingThisMonth}
                iconName="clock"
                accent="purple"
              />
            </Col>
            <Col lg="3" sm="6">
              <StatCard
                title="This Month - Extra Classes"
                value={summaryStats.extraThisMonth}
                iconName="calendar-check"
              />
            </Col>
          </Row>
        </Block>

        {/* Insights Section */}
        {insights.length > 0 && (
          <Block>
            <Row>
              <Col lg="12">
                <div className="card card-bordered h-100">
                  <div className="card-inner">
                    <div className="card-title-group">
                      <div className="card-title">
                        <h6 className="title d-flex align-items-center">
                          <Icon name="award" className="text-warning me-2" style={{ fontSize: "22px" }} />
                          Insights
                        </h6>
                      </div>
                    </div>

                    <div className="nk-block">
                      <Row className="g-gs">
                        {insights.map((insight, index) => (
                          <Col key={index} md="6" lg="4">
                            <div className={`alert alert-${insight.type} h-100`}>
                              <div className="alert-cta d-flex flex-column">
                                <div className="alert-text">
                                  <h6>{insight.title}</h6>
                                  <p>{insight.message}</p>
                                </div>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Block>
        )}

        {/* Subject Performance Chart */}
        {subjectComparisonData.length > 0 && (
          <Block>
            <Row className="g-gs">
              <Col lg="4" md="12">
                <div className="card card-bordered h-100">
                  <div className="card-inner">
                    <div className="card-title-group">
                      <div className="card-title">
                        <h6 className="title">Subject Performance Overview</h6>
                        <p className="text-muted">Comprehensive view of class distribution</p>
                      </div>
                    </div>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <Tooltip content={<StackedTooltip />} />
                          <Legend />
                          <Bar 
                            dataKey="completed" 
                            stackId="a" 
                            fill="#10b981" 
                            name="Completed"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar 
                            dataKey="upcoming" 
                            stackId="a" 
                            fill="#3b82f6" 
                            name="Upcoming"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar 
                            dataKey="cancelled" 
                            stackId="a" 
                            fill="#ef4444" 
                            name="Cancelled"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Col>            

              <Col lg="4" md="12">
                <Card className="card-full overflow-hidden sd-attendance-card">
                  <div className="nk-ecwg nk-ecwg7 h-100">
                    <div className="card-inner flex-grow-1">
                      <div className="card-title-group mb-3">
                        <div className="card-title">
                          <h6 className="title">Subject Attendance Distribution</h6>
                          <p className="text-muted">Attendance % per subject (marked classes only)</p>
                        </div>
                      </div>
                      <AttendanceChart />
                      <ul className="sd-attendance-legend">
                        {attendanceData.map((item, index) => (
                          <li key={index}>
                            <span className="d-flex align-items-center">
                              <span className="dot dot-lg sq" style={{ background: item.color }}></span>
                              <span>{item.name}</span>
                            </span>
                            <span className={`sd-value ${item.value === null ? "text-soft" : ""}`}>
                              {formatAttendance(item.value)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col lg="4" md="12">
                <div className="h-100">
                  <div>
                    {subjectSummaries[selectedSubjectIndex] && (
                      <SubjectCard
                        subject={subjectSummaries[selectedSubjectIndex]}
                        sectionTitle="Subject Details"
                        headerControl={subjectSummaries.length > 1 ? (
                          // Existing RSelect (react-select): its option menu is page-rendered, so the
                          // student dropdown design applies (a native <select> list is drawn by the OS).
                          <RSelect
                            dataSource={subjectSummaries.map((subject, index) => ({
                              value: String(index),
                              label: subject.subjectName || subject.SubjectName || `Subject ${index + 1}`,
                            }))}
                            value1={String(selectedSubjectIndex)}
                            onChangeHandler={(option) => setSelectedSubjectIndex(Number(option.value))}
                            isSearchable={false}
                            aria-label="Select subject"
                          />
                        ) : null}
                        footer={subjectSummaries.length > 1 ? (
                          <div className="text-soft small text-center mt-2">
                            Showing {selectedSubjectIndex + 1} of {subjectSummaries.length} subjects
                          </div>
                        ) : null}
                      />
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Block>
        )}

        {/* Requirement 12 - Upcoming class details */}
        <Block className="dashboard-operational-section">
          <Card className="card-bordered">
            <div className="card-inner">
              <div className="card-title-group mb-3">
                <div className="card-title">
                  <h6 className="title"><Icon name="calendar" className="mr-2" />Upcoming Class Details</h6>
                </div>
                <div className="card-tools"><span className="badge badge-dim badge-primary">{upcomingClassRows.length} classes</span></div>
              </div>
              {upcomingClassRows.length > 0 ? (
                <div className="table-responsive sd-scroll">
                  <table className="table table-middle table-hover">
                    <thead><tr><th>Subject</th><th>Class</th><th>Date</th><th>Time</th><th>Tutor</th><th>Meeting</th></tr></thead>
                    <tbody>{upcomingClassRows.map((item, index) => (
                      <tr key={valueOf(item, "scheduleDetailsId", "ScheduleDetailsId") || index}>
                        <td>{valueOf(item, "subjectName", "SubjectName") || "N/A"}</td>
                        <td>{valueOf(item, "classTitle", "ClassTitle") || valueOf(item, "scheduleTitle", "ScheduleTitle") || "N/A"}</td>
                        <td>{formatDashboardDate(valueOf(item, "classDate", "ClassDate"))}</td>
                        <td>{formatDashboardTime(valueOf(item, "startTime", "StartTime"))}</td>
                        <td>{valueOf(item, "tutorName", "TutorName") || "N/A"}</td>
                        <td>{valueOf(item, "meetingLink", "MeetingLink") ? <a href={valueOf(item, "meetingLink", "MeetingLink")} target="_blank" rel="noreferrer">Join</a> : "Not available"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="text-center text-muted py-4"><Icon name="calendar-check" className="mr-2" />No upcoming classes.</div>}
            </div>
          </Card>
        </Block>

        {/* Requirement 13 - Attendance reports */}
        <Block className="dashboard-operational-section">
          <Row className="g-gs">
            <Col lg="7">
              <Card className="card-bordered h-100">
                <div className="card-inner">
                  <h6 className="title mb-3"><Icon name="check-circle" className="mr-2" />Attendance Details</h6>
                  {attendanceRows.length > 0 ? <div className="table-responsive sd-scroll">
                    <table className="table table-middle"><thead><tr><th>Subject</th><th>Date</th><th>Status</th><th>Late</th></tr></thead>
                      <tbody>{attendanceRows.map((item, index) => <tr key={valueOf(item, "scheduleDetailsId", "ScheduleDetailsId") || index}>
                        <td>{valueOf(item, "subjectName", "SubjectName") || "N/A"}</td>
                        <td>{formatDashboardDate(valueOf(item, "classDate", "ClassDate"))}</td>
                        <td><span className={`badge badge-dim ${valueOf(item, "isStudentPresent", "IsStudentPresent") === true ? "badge-success" : valueOf(item, "isStudentPresent", "IsStudentPresent") === false ? "badge-danger" : "badge-light"}`}>{valueOf(item, "attendanceStatus", "AttendanceStatus") || "Not marked"}</span></td>
                        <td>{Number(valueOf(item, "minutesLate", "MinutesLate")) > 0 ? `${valueOf(item, "minutesLate", "MinutesLate")} min` : "—"}</td>
                      </tr>)}</tbody>
                    </table>
                  </div> : <p className="text-muted mb-0">No attendance records available.</p>}
                </div>
              </Card>
            </Col>
            <Col lg="5">
              <Card className="card-bordered h-100">
                <div className="card-inner">
                  <h6 className="title mb-3"><Icon name="calender-date" className="mr-2" />Monthly Attendance</h6>
                  {monthlyAttendanceRows.length > 0 ? monthlyAttendanceRows.map((item, index) => (
                    <div className="d-flex justify-content-between align-items-center border-bottom py-2" key={index}>
                      <div><strong>{formatDashboardDate(valueOf(item, "monthStart", "MonthStart"))}</strong><div className="text-soft small">Present {valueOf(item, "presentCount", "PresentCount") || 0} · Absent {valueOf(item, "absentCount", "AbsentCount") || 0}</div></div>
                      <span className="badge badge-dim badge-info">{hasAttendanceValue(valueOf(item, "attendancePercent", "AttendancePercent")) ? `${Number(valueOf(item, "attendancePercent", "AttendancePercent")).toFixed(1)}%` : "—"}</span>
                    </div>
                  )) : <p className="text-muted mb-0">No monthly attendance data available.</p>}
                </div>
              </Card>
            </Col>
          </Row>
        </Block>

        {/* Requirement 14 - Tutors and ratings */}
        <Block className="dashboard-operational-section">
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered h-100"><div className="card-inner">
                <h6 className="title mb-3"><Icon name="user-list" className="mr-2" />Assigned Tutors</h6>
                {tutorRows.length > 0 ? tutorRows.map((item, index) => <div className="d-flex justify-content-between border-bottom py-2" key={valueOf(item, "tutorId", "TutorId") || index}>
                  <div><strong>{valueOf(item, "tutorName", "TutorName") || "N/A"}</strong><div className="text-soft small">{valueOf(item, "assignedCourseCount", "AssignedCourseCount") || 0} assigned course(s)</div></div>
                  <div className="text-right"><Icon name="star-fill" className="text-warning" /> {valueOf(item, "myAverageRating", "MyAverageRating") || "Not rated"}</div>
                </div>) : <p className="text-muted mb-0">No assigned tutors found.</p>}
              </div></Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered h-100"><div className="card-inner">
                <h6 className="title mb-3"><Icon name="star" className="mr-2" />My Tutor Ratings</h6>
                {ratingRows.length > 0 ? ratingRows.map((item, index) => <div className="border-bottom py-2" key={valueOf(item, "ratingId", "RatingId") || index}>
                  <div className="d-flex justify-content-between"><strong>{valueOf(item, "tutorName", "TutorName") || "Tutor"}</strong><span><Icon name="star-fill" className="text-warning" /> {valueOf(item, "rating", "Rating") || 0}/5</span></div>
                  <div className="text-soft small">{valueOf(item, "topic", "Topic") || "Class rating"} · {formatDashboardDate(valueOf(item, "ratedAt", "RatedAt"))}</div>
                  {valueOf(item, "feedback", "Feedback") && <div className="mt-1">{valueOf(item, "feedback", "Feedback")}</div>}
                </div>) : <p className="text-muted mb-0">You have not submitted tutor ratings yet.</p>}
              </div></Card>
            </Col>
          </Row>
        </Block>

        {/* Requirements 15 and 16 - Notifications and communication */}
        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered h-100"><div className="card-inner">
                <div className="card-title-group mb-3"><h6 className="title"><Icon name="bell" className="mr-2" />Notifications</h6><span className="badge badge-danger">{valueOf(unreadNotificationSummary, "unreadNotificationCount", "UnreadNotificationCount") || 0} unread</span></div>
                {notificationRows.length > 0 ? <div className="sd-scroll sd-list">{notificationRows.slice(0, 10).map((item, index) => <div className="border-bottom py-2" key={valueOf(item, "notificationId", "NotificationId") || index}>
                  <div className="d-flex justify-content-between"><strong>{valueOf(item, "notificationTypeName", "NotificationTypeName") || "Notification"}</strong><small className="text-soft">{formatDashboardDate(valueOf(item, "createdDate", "CreatedDate"), true)}</small></div>
                  <div>{toPlainText(valueOf(item, "message", "Message")) || "—"}</div>
                </div>)}</div> : <p className="text-muted mb-0">No notifications available.</p>}
              </div></Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered h-100"><div className="card-inner">
                <h6 className="title mb-3"><Icon name="chat" className="mr-2" />Communication</h6>
                <Row className="g-3 mb-3"><Col sm="6"><div className="border rounded p-3 sd-comm-box sd-comm-sent"><div className="text-soft">Sent</div><h4>{valueOf(messageSummary, "sentCount", "SentCount") || 0}</h4></div></Col><Col sm="6"><div className="border rounded p-3 sd-comm-box sd-comm-received"><div className="text-soft">Received</div><h4>{valueOf(messageSummary, "receivedCount", "ReceivedCount") || 0}</h4></div></Col></Row>
                {conversationRows.length > 0 ? conversationRows.slice(0, 8).map((item, index) => <div className="border-bottom py-2" key={valueOf(item, "otherUserId", "OtherUserId") || index}>
                  <div className="d-flex justify-content-between"><strong>{valueOf(item, "otherUserName", "OtherUserName") || "User"}</strong><small>{valueOf(item, "messageCount", "MessageCount") || 0} messages</small></div>
                  <div className="text-soft text-truncate">{valueOf(item, "lastMessage", "LastMessage") || "No message text"}</div>
                </div>) : <p className="text-muted mb-0">No conversations available.</p>}
              </div></Card>
            </Col>
          </Row>
        </Block>

        {/* Requirement 18 - Schema-dependent learning content */}
        <Block>
          <Card className="card-bordered"><div className="card-inner">
            <h6 className="title mb-3"><Icon name="book-read" className="mr-2" />Learning Content</h6>
            <Row className="g-gs">
              {[{ title: "Chapters", icon: "list-index" }, { title: "Assessments", icon: "file-check" }, { title: "Study Materials", icon: "folder-list" }].map((item) => <Col md="4" key={item.title}>
                <div className="border rounded text-center p-4 h-100 sd-learning-tile"><Icon name={item.icon} className="text-primary" style={{ fontSize: "28px" }} /><h6 className="mt-2">{item.title}</h6><p className="text-muted mb-0">No records available. This section will populate when its database schema is introduced.</p></div>
              </Col>)}
            </Row>
          </div></Card>
        </Block>

        {/* No Data State */}
        {subjectSummaries.length === 0 && !loading && !error && (
          <Block>
            <div className="text-center">
              <Icon name="inbox" style={{ fontSize: '48px' }} className="text-muted mb-3" />
              <h5>No Data Available</h5>
              <p className="text-muted">No subject data found for your account.</p>
              <Button type="button" color="primary" onClick={() => setRefreshKey(key => key + 1)}>
                Refresh Data
              </Button>
            </div>
          </Block>
        )}

        {/* TCT Student Feedback Modal */}
<Modal
  isOpen={showLearningExperienceFeedback && showTCTModal}
  toggle={feedbackSubmitted ? handleModalClose : undefined}
  size="lg"
  backdrop="static"
>

  {/* Header: show close (X) ONLY after submit */}
  <ModalHeader
    className="bg-success text-white"
    toggle={feedbackSubmitted ? handleModalClose : undefined}
  >
    <Icon name="smile" className="mr-2" />
    TCT Learning Experience Feedback
  </ModalHeader>

  <ModalBody>
    {/* BEFORE SUBMIT: Show Feedback Form */}
    {!feedbackSubmitted ? (
      <>
        <Alert color="success" className="mb-4">
          <h6 className="alert-heading">
            <Icon name="heart" className="mr-2" />
            How are you feeling with TCT today?
          </h6>
          <hr />
          <p className="mb-2">
            We value your learning experience and want to ensure you're getting the best education possible.
          </p>
          <p className="mb-0">
            <Icon name="users" className="mr-2 text-success" />
            <strong>Your feedback helps us improve and maintain the quality of our teaching.</strong>
          </p>
        </Alert>

        <div className="border-top pt-4">
          <Form onSubmit={handleFeedbackSubmit}>

            {/* Teacher Quality Rating */}
            <FormGroup className="mb-4">
              <h6 className="mb-3">
                <Icon name="award" className="mr-2 text-primary" />
                Do you feel the teachers are qualified and doing their job correctly?
              </h6>

              <Row>
                {["poor", "average", "good", "excellent"].map((value, idx) => (
                  <Col sm="6" md="3" key={idx}>
                    <div className="custom-control custom-radio mb-2">
                      <Input
                        type="radio"
                        id={`teacher-${value}`}
                        name="teacherRating"
                        value={value}
                        checked={teacherQualityRating === value}
                        onChange={(e) => setTeacherQualityRating(e.target.value)}
                        className="custom-control-input"
                      />
                      <label className="custom-control-label" htmlFor={`teacher-${value}`}>
                        <Icon
                          name={value === "poor" ? "frown" :
                                value === "average" ? "meh" :
                                "smile"}
                          className={`mr-1 ${
                            value === "poor" ? "text-danger" :
                            value === "average" ? "text-warning" :
                            value === "good" ? "text-info" : "text-success"
                          }`}
                        />
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </label>
                    </div>
                  </Col>
                ))}
              </Row>
            </FormGroup>

            {/* Overall Experience Rating */}
            <FormGroup className="mb-4">
              <h6 className="mb-3">
                <Icon name="star" className="mr-2 text-warning" />
                Overall satisfaction with TCT:
              </h6>

              <Row>
                {["poor", "average", "good", "excellent"].map((value, idx) => (
                  <Col sm="6" md="3" key={idx}>
                    <div className="custom-control custom-radio mb-2">
                      <Input
                        type="radio"
                        id={`overall-${value}`}
                        name="overallRating"
                        value={value}
                        checked={overallExperienceRating === value}
                        onChange={(e) => setOverallExperienceRating(e.target.value)}
                        className="custom-control-input"
                      />
                      <label className="custom-control-label" htmlFor={`overall-${value}`}>
                        <Icon
                          name={value === "poor" ? "frown" :
                                value === "average" ? "meh" :
                                "smile"}
                          className={`mr-1 ${
                            value === "poor" ? "text-danger" :
                            value === "average" ? "text-warning" :
                            value === "good" ? "text-info" : "text-success"
                          }`}
                        />
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </label>
                    </div>
                  </Col>
                ))}
              </Row>
            </FormGroup>

            {/* Issues Section */}
            {(teacherQualityRating === "poor" || teacherQualityRating === "average" ||
              overallExperienceRating === "poor" || overallExperienceRating === "average") && (
              <FormGroup className="mb-4">
                <h6 className="mb-3">
                  <Icon name="alert-triangle" className="mr-2 text-warning" />
                  Any specific issues? (Select all that apply)
                </h6>
                <Row>
                  {[
                    { key: "teachingMethod", label: "Teaching method/style" },
                    { key: "punctuality", label: "Teacher punctuality" },
                    { key: "communication", label: "Communication clarity" },
                    { key: "technicalIssues", label: "Technical issues" },
                    { key: "other", label: "Other issues" }
                  ].map((issue, idx) => (
                    <Col md="6" key={idx}>
                      <div className="custom-control custom-checkbox mb-2">
                        <Input
                          type="checkbox"
                          id={`issue-${issue.key}`}
                          checked={specificIssues[issue.key]}
                          onChange={() => handleIssueChange(issue.key)}
                          className="custom-control-input"
                        />
                        <label className="custom-control-label" htmlFor={`issue-${issue.key}`}>
                          {issue.label}
                        </label>
                      </div>
                    </Col>
                  ))}
                </Row>
              </FormGroup>
            )}

            {/* Comments */}
            <FormGroup className="mb-4">
              <label htmlFor="student-feedback-comments" className="form-label">
                <Icon name="message-circle" className="mr-2" />
                Additional Comments (Optional)
              </label>
              <Input
                type="textarea"
                id="student-feedback-comments"
                placeholder="Share any thoughts to help us improve..."
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                rows="4"
              />
            </FormGroup>

            {/* Poor Rating Alert */}
            {(teacherQualityRating === "poor" || overallExperienceRating === "poor") && (
              <Alert color="warning" className="mb-4">
                <Icon name="alert-circle" className="mr-2" />
                <strong>We're sorry to hear about your experience!</strong>  
                Your feedback will be reviewed immediately.
              </Alert>
            )}

            {/* Submit Button */}
            <div className="d-flex justify-content-end">
              <Button color="success" type="submit" disabled={feedbackSubmitting}>
                {feedbackSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-1" /> Submitting...
                  </>
                ) : (
                  <>
                    <Icon name="check" className="mr-1" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>

          </Form>
        </div>
      </>
    ) : (
      /* AFTER SUBMIT: Show Thank-you + Close Button */
      <div className="text-center py-4">
        <Icon name="check-circle" className="text-success" style={{ fontSize: '48px' }} />
        <h5 className="mt-3 text-success">Thank You for Your Feedback!</h5>
        <p className="text-muted">
          Your input helps us maintain and improve the quality of education at TCT.
        </p>

        <div className="mt-3">
          <Icon name="smile" className="text-warning" style={{ fontSize: '32px' }} />
          <p className="mt-2 text-muted small">Keep learning and growing with TCT!</p>
        </div>

        <div className="mt-4 d-flex justify-content-center">
          <Button color="success" onClick={handleModalClose}>
            <Icon name="x" className="mr-1" />
            Close
          </Button>
        </div>
      </div>
    )}
  </ModalBody>
</Modal>

        </div>
      </Content>
    </React.Fragment>
  );
};

export default StudentDashboard;

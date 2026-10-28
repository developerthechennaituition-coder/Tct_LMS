import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Calendar, BookOpen, Clock, TrendingUp, Award, AlertCircle,
  CheckCircle, Users, Target
} from 'lucide-react';

const StudentDashboard1 = () => {
  const [dashboardData] = useState([
    {
      SalesDetailsId: '1',
      SubjectName: 'Mathematics',
      CurrentMonthScheduledClasses: 12,
      CurrentMonthCompletedClasses: 10,
      CurrentMonthUpcomingClasses: 2,
      TotalScheduledClasses: 45,
      CompletedClasses: 38,
      UpcomingClasses: 7,
      StudentAttendanceCount: 40,
      StudentAttendancePercentage: 88.89,
      CancelledClassesByStudent: 5,
      CancelledByStudentPercentage: 11.11,
      FirstScheduleDate: '2024-01-15',
      LastScheduleDate: '2024-12-30',
      CompletionPercentage: 84.44
    },
    {
      SalesDetailsId: '2',
      SubjectName: 'Physics',
      CurrentMonthScheduledClasses: 8,
      CurrentMonthCompletedClasses: 7,
      CurrentMonthUpcomingClasses: 1,
      TotalScheduledClasses: 32,
      CompletedClasses: 28,
      UpcomingClasses: 4,
      StudentAttendanceCount: 30,
      StudentAttendancePercentage: 93.75,
      CancelledClassesByStudent: 2,
      CancelledByStudentPercentage: 6.25,
      FirstScheduleDate: '2024-02-01',
      LastScheduleDate: '2024-12-28',
      CompletionPercentage: 87.5
    },
    {
      SalesDetailsId: '3',
      SubjectName: 'Chemistry',
      CurrentMonthScheduledClasses: 10,
      CurrentMonthCompletedClasses: 8,
      CurrentMonthUpcomingClasses: 2,
      TotalScheduledClasses: 38,
      CompletedClasses: 32,
      UpcomingClasses: 6,
      StudentAttendanceCount: 34,
      StudentAttendancePercentage: 89.47,
      CancelledClassesByStudent: 4,
      CancelledByStudentPercentage: 10.53,
      FirstScheduleDate: '2024-01-20',
      LastScheduleDate: '2024-12-25',
      CompletionPercentage: 84.21
    }
  ]);

  const summaryStats = {
    totalSubjects: dashboardData.length,
    totalScheduledClasses: dashboardData.reduce((sum, item) => sum + item.TotalScheduledClasses, 0),
    totalCompletedClasses: dashboardData.reduce((sum, item) => sum + item.CompletedClasses, 0),
    totalUpcomingClasses: dashboardData.reduce((sum, item) => sum + item.UpcomingClasses, 0),
    averageAttendance: (
      dashboardData.reduce((sum, item) => sum + item.StudentAttendancePercentage, 0) / dashboardData.length
    ).toFixed(2),
    totalCancellations: dashboardData.reduce((sum, item) => sum + item.CancelledClassesByStudent, 0)
  };

  const subjectComparisonData = dashboardData.map(item => ({
    subject: item.SubjectName,
    scheduled: item.TotalScheduledClasses,
    completed: item.CompletedClasses,
    upcoming: item.UpcomingClasses,
    attendance: item.StudentAttendancePercentage,
    completion: item.CompletionPercentage
  }));

  const monthlyProgressData = dashboardData.map(item => ({
    subject: item.SubjectName,
    scheduled: item.CurrentMonthScheduledClasses,
    completed: item.CurrentMonthCompletedClasses,
    upcoming: item.CurrentMonthUpcomingClasses
  }));

  const attendanceData = dashboardData.map(item => ({
    name: item.SubjectName,
    value: item.StudentAttendancePercentage,
    count: item.StudentAttendanceCount
  }));

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 flex-1" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center">
          <Icon className="h-8 w-8" style={{ color }} />
          {trend && (
            <div className="ml-2 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 ml-1">{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SubjectCard = ({ subject }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{subject.SubjectName}</h3>
        <BookOpen className="h-6 w-6 text-purple-600" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{subject.CompletedClasses}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{subject.UpcomingClasses}</p>
          <p className="text-sm text-gray-600">Upcoming</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Attendance</span>
          <span className="text-sm font-semibold text-green-600">{subject.StudentAttendancePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${subject.StudentAttendancePercentage}%` }}></div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Completion</span>
          <span className="text-sm font-semibold text-purple-600">{subject.CompletionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${subject.CompletionPercentage}%` }}></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-4">
          <span>Cancelled: {subject.CancelledClassesByStudent}</span>
          <span>Total: {subject.TotalScheduledClasses}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
        <p className="text-gray-600 mb-8">Track your academic progress and performance</p>

          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <StatCard title="Total Subjects" value={summaryStats.totalSubjects} icon={BookOpen} color="#8b5cf6" />
            <StatCard title="Classes Completed" value={summaryStats.totalCompletedClasses} subtitle={`out of ${summaryStats.totalScheduledClasses}`} icon={CheckCircle} color="#10b981" trend="+12%" />
            <StatCard title="Average Attendance" value={`${summaryStats.averageAttendance}%`} icon={Target} color="#06b6d4" />
            <StatCard title="Upcoming Classes" value={summaryStats.totalUpcomingClasses} icon={Calendar} color="#f59e0b" />
          </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="upcoming" fill="#f59e0b" name="Upcoming" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Month Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="scheduled" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Scheduled" />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#10b981" fill="#10b981" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance by Subject</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={attendanceData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="count" label={({ name, value }) => `${name}: ${value}`}>
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Subject Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {dashboardData.map((subject, index) => (
                <SubjectCard key={index} subject={subject} />
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 text-yellow-500 mr-2" />
                Performance Insights
              </h3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Strong Performance</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">Physics shows highest attendance rate at 93.75%</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Upcoming Focus</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">Chemistry has 6 upcoming classes this month</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">Improvement Area</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">Mathematics has the most cancellations (5 classes)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard1;

using DocumentFormat.OpenXml.InkML;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Dashboard;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class DashboardRepository : IDashboardRepository
    {
        public readonly ApplicationDbContext _dbContext;

        public DashboardRepository(ApplicationDbContext dbContext)
        {
              _dbContext = dbContext;
        }
        public async Task<AccountDashboardDto> GetAccountsSummaryAsync(Guid userId)
        {
            var result = new AccountDashboardDto();            

            var conn = _dbContext.Database.GetDbConnection();

            await using (conn)
            {
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                using (var command = conn.CreateCommand())
                {
                    command.CommandText = "GetAccountDashboarSummary"; 
                    command.CommandType = CommandType.StoredProcedure;

                    //var param = command.CreateParameter();
                    //param.ParameterName = "@UserId";
                    //param.Value = userId;
                    //param.DbType = DbType.Guid;
                    //command.Parameters.Add(param);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync()) // assuming summary is in first result set
                        {
                            result.OverallSummary = new AccountsOverallSummaryDto
                            {
                                TotalStudent = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0)),
                                TotalTutor = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1)),
                            };
                        }
                    }
                }

            }

            return result;
        }

        public async Task<List<StudentAccountStatusDto>> GetStudentAccountStatusAsync()
        {
            var query = @"
                SELECT    
                    SLS.StudentId,
                    USR.Id AS UserId,
                    (USR.FirstName + ' ' + USR.LastName) AS StudentName, 
                    (TCB.TypeCodeName + ' - ' + TCG.TypeCodeName) AS BoardAndGrade, 
                    USR.Phone,
                    CASE 
                        WHEN MAX(CASE WHEN SDS.StudentRiskStatus = 'C9A5F45B-8C40-4D23-B2F3-4B80F7C6F0A9' 
                                      THEN 1 ELSE 0 END) = 1 
                            THEN 'High Risk'
                        ELSE 'Low Risk'
                    END AS Category,
                    SUM(ISNULL(STI.TotalInvoiceAmount,0)) AS PaymentTillDate,
                    SDT.IsActive
                FROM Student SDT  
                INNER JOIN [User] USR ON SDT.UserId = USR.Id 
                INNER JOIN Sales SLS ON SLS.StudentId = SDT.Id 
                INNER JOIN SalesDetails SDS ON SLS.Id = SDS.SalesId 
                INNER JOIN Type_Code TCB ON TCB.Id = SLS.BoardId 
                INNER JOIN Type_Code TCG ON TCG.ID = SLS.GradeId  
                LEFT JOIN StudentInvoice STI ON SDT.Id = STI.StudentId
                GROUP BY     
                    SLS.StudentId,     
                    USR.Id,
                    USR.FirstName,     
                    USR.LastName,     
                    SDT.IsActive,     
                    USR.Phone,     
                    TCB.TypeCodeName,     
                    TCG.TypeCodeName;";

            return await _dbContext.StudentAccountStatusDtos
                .FromSqlRaw(query)
                .AsNoTracking()
                .ToListAsync(); ;
        }

        public async Task<List<AccountsScheduleDto>> GetStudentScheduleSummaryById(Guid studentId, string month = null, int? year = null)
        {
            var query = @"
SELECT DISTINCT
    US.Id AS UserId,
    SH.StudentId,
    ISNULL(UT.FullName, '') AS TutorName,
    ISNULL(CONCAT(US.FirstName, ' ', US.LastName), '') AS StudentName,
    ISNULL(ST.ParentName, '') AS ParentName,
    ISNULL(CG.TypeCodeName, '') AS Grade,
    ISNULL(CB.TypeCodeName, '') AS Board,
    ISNULL(CS.TypeCodeName, '') AS Subject,
    YEAR(SD.Date) AS Year,
    MONTH(SD.Date) AS Month,
    ISNULL(DATENAME(MONTH, SD.Date), '') AS MonthName,
    ISNULL(SA.ParentPayment, 0) AS ParentPayment,
    SD.ScheduleType,
    CAST(SD.Date AS DATE) AS ScheduleDate,
    SD.StartTime,
    SD.EndTime,
    SD.StudentStartTime,
    SD.StudentEndTime,
    SD.TutorStartTime,
    SD.TutorEndTime,
    SD.OperationStartTime,
    SD.OperationEndTime,
    SI.InvoiceNumber,
    ISNULL(SI.TotalInvoiceAmount, 0) AS TotalInvoiceAmount,
    ISNULL(SR.FeesPerHour, 0) AS AgreedFeesPerHour,
    0 AS NumberOfClasses,
    0.0 AS TotalParentPayment,
    0.0 AS TotalHours,
    0.0 AS TutorHours,
    0.0 AS StudentHours,
    SD.ScheduleDetailsId,
    SD.ScheduleId
FROM Schedule SH
INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId
INNER JOIN Student ST ON SH.StudentId = ST.Id
INNER JOIN [User] US ON US.Id = ST.UserId
INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
-- SalesDetails.TutorId holds either the Tutor.Id or the tutor's User.Id; resolve both.
LEFT JOIN Tutor TT ON TT.Id = SA.TutorId
LEFT JOIN [User] UT ON UT.Id = COALESCE(TT.UserId, SA.TutorId)
INNER JOIN Sales SS ON SS.Id = SA.SalesId
LEFT JOIN StudentRegistration SR ON SR.StudentId = SS.StudentId
INNER JOIN Type_Code CG ON SS.GradeId = CG.Id
INNER JOIN Type_Code CB ON SS.BoardId = CB.Id
INNER JOIN Type_Code CS ON SA.SubjectId = CS.Id
LEFT JOIN StudentInvoice SI 
    ON SH.ScheduleId = SI.ScheduleId
   AND MONTH(SD.Date) = SI.Month
   AND YEAR(SD.Date) = SI.Year
WHERE 
    SH.StudentId = @studentId
    AND SD.IsActive = 1
    AND SA.IsActive = 1";

            if (!string.IsNullOrEmpty(month))
            {
                query += " AND DATENAME(MONTH, SD.Date) = @month";
            }
            if (year.HasValue)
            {
                query += " AND YEAR(SD.Date) = @year";
            }

            query += @"
ORDER BY 
    StudentName,
    YEAR(SD.Date),
    MONTH(SD.Date),
    SD.StartTime";

            var parameters = new List<SqlParameter>
    {
        new SqlParameter("@studentId", studentId)
    };

            if (!string.IsNullOrEmpty(month))
            {
                parameters.Add(new SqlParameter("@month", month));
            }
            if (year.HasValue)
            {
                parameters.Add(new SqlParameter("@year", year.Value));
            }

            try
            {
                var result = await _dbContext.AccountsScheduleDtos
                    .FromSqlRaw(query, parameters.ToArray())
                    .AsNoTracking()
                    .ToListAsync();
                return result;
            }
            catch (Exception)
            {
                // Log the exception to see which specific column is causing the issue
                //_logger.LogError(ex, "Error executing GetStudentScheduleSummaryById query for studentId: {StudentId}", studentId);
                throw;
            }
        }


        //    public async Task<List<AccountsScheduleDto>> GetStudentScheduleSummaryById(Guid studentId, string month = null, int? year = null)
        //    {
        //        var query = @"
        //    WITH HoursCTE AS (
        //        SELECT 
        //            SH.StudentId,
        //            YEAR(SD.Date) AS Year,
        //            MONTH(SD.Date) AS Month,
        //            DATENAME(MONTH, SD.Date) AS MonthName,
        //            COUNT(DISTINCT SD.ScheduleDetailsId) AS NumberOfClasses,
        //            -- Total Hours from StartTime & EndTime
        //            --SUM(DATEDIFF(MINUTE, SD.StartTime, SD.EndTime)) / 60.0 AS TotalHours,
        //            -- Tutor Hours from TutorStartTime & TutorEndTime
        //            --SUM(DATEDIFF(MINUTE, SD.TutorStartTime, SD.TutorEndTime)) / 60.0 AS TutorHours,
        //            -- Student Hours from StudentStartTime & StudentEndTime
        //            --SUM(DATEDIFF(MINUTE, SD.StudentStartTime, SD.StudentEndTime)) / 60.0 AS StudentHours,
        //            -- Operation Hours from StudentStartTime & StudentEndTime
        //            --SUM(DATEDIFF(MINUTE, SD.OperationStartTime, SD.OperationEndTime)) / 60.0 AS OperationHours
        //        FROM Schedule SH
        //        INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId 
        //        WHERE SH.StudentId = @studentId
        //          AND SD.IsActive = 1";

        //        // Add month filter to CTE if provided
        //        if (!string.IsNullOrEmpty(month))
        //        {
        //            query += " AND DATENAME(MONTH, SD.Date) = @month";
        //        }

        //        // Add year filter to CTE if provided
        //        if (year.HasValue)
        //        {
        //            query += " AND YEAR(SD.Date) = @year";
        //        }

        //        query += @"
        //        GROUP BY 
        //            SH.StudentId,
        //            YEAR(SD.Date),
        //            MONTH(SD.Date),
        //            DATENAME(MONTH, SD.Date)
        //    )
        //    SELECT 
        //        US.Id AS UserId,
        //        SH.StudentId,
        //        ISNULL(UT.FullName, '') AS TutorName,
        //        ISNULL(CONCAT(US.FirstName, ' ', US.LastName), '') AS StudentName,
        //        ISNULL(ST.ParentName, '') AS ParentName,
        //        ISNULL(CG.TypeCodeName, '') AS Grade,
        //        ISNULL(CB.TypeCodeName, '') AS Board,
        //        ISNULL(CS.TypeCodeName, '') AS Subject,
        //        H.Year,
        //        H.Month,
        //        ISNULL(H.MonthName, '') AS MonthName,
        //        ISNULL(MIN(SA.ParentPayment), 0) AS ParentPayment,
        //        ISNULL(H.NumberOfClasses, 0) AS NumberOfClasses,
        //        ISNULL((MIN(SA.ParentPayment) * H.TutorHours), 0) AS TotalParentPayment,
        //        ISNULL(SD.ScheduleType, '') AS ScheduleType,
        //        ISNULL(MAX(SI.InvoiceNumber), '') AS InvoiceNumber,
        //        ISNULL(SUM(SI.TotalInvoiceAmount), 0) AS TotalInvoiceAmount,
        //        ISNULL(MAX(SR.FeesPerHour), 0) AS FeesPerHour,
        //        ISNULL(H.TotalHours, 0) AS TotalHours,
        //        ISNULL(H.TutorHours, 0) AS TutorHours,
        //        ISNULL(H.StudentHours, 0) AS StudentHours,
        //        ISNULL(H.OperationHours, 0) AS OperationHours
        //    FROM HoursCTE H
        //    INNER JOIN Schedule SH ON SH.StudentId = H.StudentId
        //    INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId 
        //    INNER JOIN Student ST ON SH.StudentId = ST.Id
        //    INNER JOIN [User] US ON US.Id = ST.UserId
        //    INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
        //    INNER JOIN [User] UT ON UT.Id = SA.TutorId
        //    INNER JOIN Sales SS ON SS.Id = SA.SalesId
        //    LEFT JOIN StudentRegistration SR ON SR.StudentId = SS.StudentId 
        //    INNER JOIN Type_Code CG ON SS.GradeId = CG.Id
        //    INNER JOIN Type_Code CB ON SS.BoardId = CB.Id
        //    INNER JOIN Type_Code CS ON SA.SubjectId = CS.Id
        //    LEFT JOIN StudentInvoice SI 
        //        ON SH.ScheduleId = SI.ScheduleId
        //       AND H.Month = SI.Month
        //       AND H.Year = SI.Year
        //    WHERE SA.IsActive = 1
        //      AND SD.IsActive = 1";

        //        // Add additional filters to main query if needed (optional since CTE already filters)
        //        if (!string.IsNullOrEmpty(month))
        //        {
        //            query += " AND H.MonthName = @month";
        //        }

        //        if (year.HasValue)
        //        {
        //            query += " AND H.Year = @year";
        //        }

        //        // Add date filters for ScheduleDetails consistency
        //        if (!string.IsNullOrEmpty(month))
        //        {
        //            query += " AND DATENAME(MONTH, SD.Date) = @month";
        //        }

        //        if (year.HasValue)
        //        {
        //            query += " AND YEAR(SD.Date) = @year";
        //        }

        //        query += @"
        //    --GROUP BY 
        //       -- US.Id,
        //       -- US.FirstName,
        //       -- US.LastName,
        //       -- ST.ParentName,
        //       --CG.TypeCodeName,
        //       --CB.TypeCodeName,
        //       --CS.TypeCodeName,
        //       -- H.Year,
        //       -- H.Month,
        //       -- H.MonthName,
        //       -- SD.ScheduleType,
        //       -- SH.StudentId,
        //       -- UT.FullName,
        //       -- H.NumberOfClasses,
        //       -- H.TotalHours,
        //       -- H.TutorHours,
        //       -- H.StudentHours,
        //       -- H.OperationHours
        //    ORDER BY StudentName, H.Year, H.Month";

        //        // Build dynamic parameters list
        //        var parameters = new List<SqlParameter>
        //{
        //    new SqlParameter("@studentId", studentId)
        //};

        //        // Add month parameter if provided
        //        if (!string.IsNullOrEmpty(month))
        //        {
        //            parameters.Add(new SqlParameter("@month", month));
        //        }

        //        // Add year parameter if provided
        //        if (year.HasValue)
        //        {
        //            parameters.Add(new SqlParameter("@year", year.Value));
        //        }

        //        try
        //        {
        //            var result = await _dbContext.AccountsScheduleDtos
        //                .FromSqlRaw(query, parameters.ToArray())
        //                .AsNoTracking()
        //                .ToListAsync();
        //            return result;
        //        }
        //        catch (Exception ex)
        //        {
        //            // Log the exception to see which specific column is causing the issue
        //            //_logger.LogError(ex, "Error executing GetStudentScheduleSummaryById query for studentId: {StudentId}", studentId);
        //            throw;
        //        }
        //    }

        public async Task<List<TutorAccountStatusDto>> GetTutorAccountStatusAsync()
        {
            var query = @"
                SELECT    
                    DISTINCT
	                TUT.Id AS TutorId,
                    (USR.FirstName + ' ' + USR.LastName) AS TutorName, 
                    USR.Phone,
                    SUM(ISNULL(TUI.TutorTotalPayment,0)) AS PaymentTillDate,
                    TUT.IsActive
                FROM Tutor TUT  
                INNER JOIN [User] USR ON TUT.UserId = USR.Id 
                LEFT JOIN SalesDetails SDS ON USR.Id = SDS.TutorId 
                LEFT JOIN Sales SLS ON SDS.SalesId = SLS.Id 
                LEFT JOIN Type_Code TCB ON TCB.Id = SLS.BoardId 
                LEFT JOIN Type_Code TCG ON TCG.ID = SLS.GradeId  
                LEFT JOIN TutorInvoice TUI ON TUT.Id = TUI.TutorId
                GROUP BY     
                    TUT.Id,     
                    USR.FirstName,     
                    USR.LastName,     
                    TUT.IsActive,     
                    USR.Phone,     
                    TCB.TypeCodeName,     
                    TCG.TypeCodeName;";

            return await _dbContext.TutorAccountStatusDto
                .FromSqlRaw(query)
                .AsNoTracking()
                .ToListAsync(); ;
        }

        public async Task<List<AccountsScheduleDto>> GetTutorScheduleSummaryById(Guid tutorId, string? month = null, int? year = null)
        {
            var query = @"
    ;WITH StudentHoursCTE AS (
        SELECT 
            TR.Id AS TutorId,
            SH.StudentId,
            SA.SubjectId,
            YEAR(SD.Date) AS Year,
            MONTH(SD.Date) AS Month,
            DATENAME(MONTH, SD.Date) AS MonthName,
            COUNT(DISTINCT SD.ScheduleDetailsId) AS NumberOfClasses,
            -- Total Hours from StartTime & EndTime
            SUM(DATEDIFF(MINUTE, SD.StartTime, SD.EndTime)) / 60.0 AS TotalHours,
            -- Tutor Hours from TutorStartTime & TutorEndTime
            SUM(DATEDIFF(MINUTE, SD.TutorStartTime, SD.TutorEndTime)) / 60.0 AS TutorHours,
            -- Student Hours from StudentStartTime & StudentEndTime
            SUM(DATEDIFF(MINUTE, SD.StudentStartTime, SD.StudentEndTime)) / 60.0 AS StudentHours
        FROM Schedule SH
        INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId 
        INNER JOIN Tutor TR ON SH.TutorId = TR.Id
        INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
        WHERE TR.Id = @tutorId
          AND SD.IsActive = 1
          AND SA.IsActive = 1";

            // Add month filter to CTE if provided
            if (!string.IsNullOrEmpty(month))
            {
                query += " AND DATENAME(MONTH, SD.Date) = @month";
            }

            // Add year filter to CTE if provided
            if (year.HasValue)
            {
                query += " AND YEAR(SD.Date) = @year";
            }

            query += @"
        GROUP BY 
            TR.Id,
            SH.StudentId,
            SA.SubjectId,
            YEAR(SD.Date),
            MONTH(SD.Date),
            DATENAME(MONTH, SD.Date)
    )
    SELECT 
        UT.Id AS UserId,
        SH.StudentId,
        ISNULL(UT.FullName, '') AS TutorName,
        ISNULL(CONCAT(US.FirstName, ' ', US.LastName), '') AS StudentName,
        ISNULL(ST.ParentName, '') AS ParentName,
        ISNULL(CG.TypeCodeName, '') AS Grade,
        ISNULL(CB.TypeCodeName, '') AS Board,
        ISNULL(CS.TypeCodeName, '') AS Subject,
        H.Year,
        H.Month,
        ISNULL(H.MonthName, '') AS MonthName,
        ISNULL(MIN(SA.TutorPayment), 0) AS ParentPayment,
        ISNULL(H.NumberOfClasses, 0) AS NumberOfClasses,
        ISNULL((MIN(SA.TutorPayment) * H.TutorHours), 0) AS TotalParentPayment,
        ISNULL(SD.ScheduleType, '') AS ScheduleType,
        ISNULL(MAX(TI.InvoiceNumber), '') AS InvoiceNumber,
        ISNULL(MAX(TI.TutorTotalPayment), 0) AS TotalInvoiceAmount,
        ISNULL(MIN(SA.TutorPayment), 0) AS AgreedFeesPerHour,
        ISNULL(H.TotalHours, 0) AS TotalHours,
        ISNULL(H.TutorHours, 0) AS TutorHours,
        ISNULL(H.StudentHours, 0) AS StudentHours,
        CAST(NULL AS datetime2) AS ScheduleDate,
        CAST(NULL AS datetime2) AS StartTime,
        CAST(NULL AS datetime2) AS EndTime,
        CAST(NULL AS datetime2) AS StudentStartTime,
        CAST(NULL AS datetime2) AS StudentEndTime,
        CAST(NULL AS datetime2) AS TutorStartTime,
        CAST(NULL AS datetime2) AS TutorEndTime,
        CAST(NULL AS datetime2) AS OperationStartTime,
        CAST(NULL AS datetime2) AS OperationEndTime,
        CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier) AS ScheduleDetailsId,
        CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier) AS ScheduleId
    FROM StudentHoursCTE H
    INNER JOIN Tutor TR ON TR.Id = H.TutorId
    INNER JOIN Schedule SH ON SH.TutorId = TR.Id AND SH.StudentId = H.StudentId
    INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId 
    INNER JOIN [User] UT ON UT.Id = TR.UserId
    INNER JOIN Student ST ON SH.StudentId = ST.Id
    INNER JOIN [User] US ON US.Id = ST.UserId
    INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId AND SA.SubjectId = H.SubjectId
    INNER JOIN Sales SS ON SS.Id = SA.SalesId
    INNER JOIN Type_Code CG ON SS.GradeId = CG.Id
    INNER JOIN Type_Code CB ON SS.BoardId = CB.Id
    INNER JOIN Type_Code CS ON SA.SubjectId = CS.Id
    LEFT JOIN TutorInvoice TI
        ON TI.TutorId = TR.Id
       AND TI.Year = H.Year
       AND TI.IsActive = 1
       AND (TI.Month = H.MonthName OR TRY_CONVERT(int, TI.Month) = H.Month)
    WHERE SA.IsActive = 1
      AND SD.IsActive = 1";

            // Add additional filters to main query if needed
            if (!string.IsNullOrEmpty(month))
            {
                query += " AND H.MonthName = @month";
            }

            if (year.HasValue)
            {
                query += " AND H.Year = @year";
            }

            // Add date filters for ScheduleDetails consistency
            if (!string.IsNullOrEmpty(month))
            {
                query += " AND DATENAME(MONTH, SD.Date) = @month";
            }

            if (year.HasValue)
            {
                query += " AND YEAR(SD.Date) = @year";
            }

            query += @"
    GROUP BY 
        UT.Id,
        US.FirstName,
        US.LastName,
        ST.ParentName,
        CG.TypeCodeName,
        CB.TypeCodeName,
        CS.TypeCodeName,
        H.Year,
        H.Month,
        H.MonthName,
        SD.ScheduleType,
        SH.StudentId,
        UT.FullName,
        H.NumberOfClasses,
        H.TotalHours,
        H.TutorHours,
        H.StudentHours
    ORDER BY StudentName, H.Year, H.Month";

            // Build dynamic parameters list
            var parameters = new List<SqlParameter>
    {
        new SqlParameter("@tutorId", tutorId)
    };

            // Add month parameter if provided
            if (!string.IsNullOrEmpty(month))
            {
                parameters.Add(new SqlParameter("@month", month));
            }

            // Add year parameter if provided
            if (year.HasValue)
            {
                parameters.Add(new SqlParameter("@year", year.Value));
            }

            return await _dbContext.AccountsScheduleDtos
                .FromSqlRaw(query, parameters.ToArray())
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task AddLearningExperienceFeedbackAsync(TctLearningExperienceFeedback feedback)
        {
            await _dbContext.TctLearningExperienceFeedback.AddAsync(feedback);
            await _dbContext.SaveChangesAsync();
        }

        public async Task AddTutorDailyFeedbackAsync(TctTutorDailyFeedback feedback)
        {
            await _dbContext.TctTutorDailyFeedback.AddAsync(feedback);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<bool> HasStudentFeedbackTodayAsync(Guid userId)
        {
            var todayUtc = DateTime.UtcNow.Date;
            return await _dbContext.TctLearningExperienceFeedback
                .AnyAsync(f => f.UserId == userId && f.CreatedOnUtc >= todayUtc);
        }

        public async Task<bool> HasTutorFeedbackTodayAsync(Guid userId)
        {
            var todayUtc = DateTime.UtcNow.Date;
            return await _dbContext.TctTutorDailyFeedback
                .AnyAsync(f => f.UserId == userId && f.CreatedOnUtc >= todayUtc);
        }

        public async Task<bool> HasStudentCompletedFirstClassAsync(Guid userId)
        {
            // ClassCompleted TypeCodeValue = 20020 - regular classes only, not demos.
            var firstCompletedDate = await (
                from sd in _dbContext.ScheduleDetails
                join s in _dbContext.Schedule on sd.ScheduleId equals s.ScheduleId
                join st in _dbContext.Student on s.StudentId equals st.Id
                join tc in _dbContext.Type_Code on sd.StudentScheduleStatus equals tc.Id
                where st.UserId == userId && sd.ScheduleType == "Class" && tc.TypeCodeValue == 20020
                select (DateTime?)sd.Date
            ).MinAsync();

            return firstCompletedDate.HasValue && DateTime.UtcNow.Date >= firstCompletedDate.Value.Date;
        }

        public async Task<bool> HasTutorCompletedFirstClassAsync(Guid userId)
        {
            // ClassCompleted TypeCodeValue = 20020 - checks across all students assigned to this tutor.
            var firstCompletedDate = await (
                from sd in _dbContext.ScheduleDetails
                join s in _dbContext.Schedule on sd.ScheduleId equals s.ScheduleId
                join t in _dbContext.Tutor on s.TutorId equals t.Id
                join tc in _dbContext.Type_Code on sd.TutorScheduleStatus equals tc.Id
                where t.UserId == userId && sd.ScheduleType == "Class" && tc.TypeCodeValue == 20020
                select (DateTime?)sd.Date
            ).MinAsync();

            return firstCompletedDate.HasValue && DateTime.UtcNow.Date >= firstCompletedDate.Value.Date;
        }

        public async Task<bool> HasTutorMappedStudentsAsync(Guid userId)
        {
            return await (
                from s in _dbContext.Schedule
                join t in _dbContext.Tutor on s.TutorId equals t.Id
                join sd in _dbContext.ScheduleDetails on s.ScheduleId equals sd.ScheduleId
                where t.UserId == userId && s.IsActive && sd.ScheduleType == "Class"
                select sd.ScheduleDetailsId
            ).AnyAsync();
        }
    }
}

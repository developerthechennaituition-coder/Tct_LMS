using Azure.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;


namespace TCT.LMS.Infrastructure.Repositories
{
    public class ScheduleDetailsRepository : GenericRepository<ScheduleDetails>, IScheduleDetailsRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public ScheduleDetailsRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<List<ClassScheduleLegendDto>> GetClassDetailsByLegend(string status, DateTime fromDate, DateTime toDate)
        {
            throw new NotImplementedException();
        }

        public async Task<Response<List<ClassScheduleReportDto>>> GetScheduledStudentList(ScheduleReportQueryParams input)
        {
            var response = new Response<List<ClassScheduleReportDto>>();

            var query =
                from sa in _dbContext.Sales
                join st in _dbContext.Student on sa.StudentId equals st.Id
                join us in _dbContext.User on st.UserId equals us.Id
                join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                join sh in _dbContext.Schedule on sd.Id equals sh.SalesDetailsId
                join hs in _dbContext.ScheduleDetails on sh.ScheduleId equals hs.ScheduleId
                where hs.ScheduleType == "Class"

                    && (!input.OperationId.HasValue
                        || sa.Ownership == input.OperationId)

                    && (!input.StudentId.HasValue
                        || sa.StudentId == input.StudentId)

                    && (!input.OperationStatus.HasValue
                        || hs.OperationScheduleStatus == input.OperationStatus)

                    && (!input.FromDate.HasValue
                        || hs.Date >= input.FromDate.Value.Date)

                    && (!input.ToDate.HasValue
                        || hs.Date < input.ToDate.Value.Date.AddDays(1))

                select new ClassScheduleReportDto
                {
                    StudentId = sa.StudentId.Value,
                    StudentUserId = st.UserId.Value,
                    StudentName = us.FirstName + " " + us.LastName
                };

            var result = await query
                .Distinct()
                .OrderBy(x => x.StudentName)
                .AsNoTracking()
                .ToListAsync();

            response.Data = result;
            response.Succeeded = true;
            response.Message = "Data retrieved successfully.";

            return response;
        }

        public async Task<Response<List<ClassScheduleTutorReportDto>>> GetScheduledTutorList(ScheduleReportQueryParams input)
        {
            var response = new Response<List<ClassScheduleTutorReportDto>>();

            var query =
                from sa in _dbContext.Sales
                
                join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                join sh in _dbContext.Schedule on sd.Id equals sh.SalesDetailsId
                join hs in _dbContext.ScheduleDetails on sh.ScheduleId equals hs.ScheduleId
                join ta in _dbContext.TutorStudentAllocations on sd.Id equals ta.SalesDetailsId 
                join tu in _dbContext.Tutor on ta.TutorId equals tu.Id
                join us in _dbContext.User on tu.UserId equals us.Id
                where hs.ScheduleType == "Class" && ta.IsActive == true

                    && (!input.OperationId.HasValue
                        || sa.Ownership == input.OperationId)

                    && (!input.StudentId.HasValue
                        || ta.TutorId == input.TutorId)

                    && (!input.OperationStatus.HasValue
                        || hs.OperationScheduleStatus == input.OperationStatus)

                    && (!input.FromDate.HasValue
                        || hs.Date >= input.FromDate.Value.Date)

                    && (!input.ToDate.HasValue
                        || hs.Date < input.ToDate.Value.Date.AddDays(1))

                select new ClassScheduleTutorReportDto
                {
                    TutorId = sd.TutorId.Value,
                    TutorUserId = tu.UserId,
                    TutorName = us.FirstName + " " + us.LastName
                };

            var result = await query
                .Distinct()
                .OrderBy(x => x.TutorName)
                .AsNoTracking()
                .ToListAsync();

            response.Data = result;
            response.Succeeded = true;
            response.Message = "Data retrieved successfully.";

            return response;
        }

        public async Task<Response<List<ClassScheduleTutorReportDto>>> GetScheduledTutorList1(ScheduleReportQueryParams input)
        {
            var response = new Response<List<ClassScheduleTutorReportDto>>();

            var query =
                from sa in _dbContext.Sales
                join sd in _dbContext.SalesDetails on sa.Id equals sd.SalesId
                join tt in _dbContext.Tutor on sd.TutorId equals tt.Id
                join ut in _dbContext.User on tt.UserId equals ut.Id
                join sh in _dbContext.Schedule on sd.Id equals sh.SalesDetailsId
                join hs in _dbContext.ScheduleDetails on sh.ScheduleId equals hs.ScheduleId
                where hs.ScheduleType == "Class"

                    && (!input.OperationId.HasValue
                        || sa.Ownership == input.OperationId)

                    && (!input.OperationStatus.HasValue
                        || hs.OperationScheduleStatus == input.OperationStatus)

                    && (!input.FromDate.HasValue
                        || hs.Date >= input.FromDate.Value.Date)

                    && (!input.ToDate.HasValue
                        || hs.Date < input.ToDate.Value.Date.AddDays(1))

                select new ClassScheduleTutorReportDto
                {
                    TutorId = sd.TutorId.Value,
                    TutorUserId = tt.UserId,
                    TutorName = ut.FirstName + " " + ut.LastName
                };

            var result = await query
                .Distinct()
                .OrderBy(x => x.TutorName)
                .AsNoTracking()
                .ToListAsync();

            response.Data = result;
            response.Succeeded = true;
            response.Message = "Data retrieved successfully.";

            return response;
        }
        public async Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime? fromDate, DateTime? toDate, Guid? studentId = null, Guid? operationId = null)
        {
            string query = @"SELECT HS.OperationScheduleStatus AS StatusId,TC.TypeCodeValue AS Value,TC.TypeCodeName AS StatusName, COUNT(*) AS Count

                        FROM ScheduleDetails AS HS
                        INNER JOIN Schedule AS SH ON HS.ScheduleId = SH.ScheduleId 
                        INNER JOIN SalesDetails AS SD ON SH.SalesDetailsId = SD.Id 
                        INNER JOIN Sales AS SA ON SD.SalesId = SA.Id 
                        INNER JOIN Type_Code AS TC ON HS.OperationScheduleStatus = TC.Id 
                        WHERE HS.ScheduleType = 'Class' AND HS.IsActive = 1 
                            AND (@OperationId IS NULL OR SA.[Ownership] = @OperationId)
                            AND (@StudentId IS NULL OR SA.StudentId = @StudentId)
                            AND (@fromDate IS NULL OR HS.[Date] >= CAST(@fromDate AS DATE))
                            AND (@toDate IS NULL OR HS.[Date] < DATEADD(DAY, 1, CAST(@toDate AS DATE))) 
                        GROUP BY
                            HS.OperationScheduleStatus,
                            TC.TypeCodeValue,
                            TC.TypeCodeName 
                        ORDER BY TC.TypeCodeName";

            var studentIdParam = new SqlParameter("@StudentId", (object?)studentId ?? DBNull.Value);
            var operationIdParam = new SqlParameter("@OperationId", (object?)operationId ?? DBNull.Value);
            var fromDateParam = new SqlParameter("@fromDate", fromDate.HasValue ? fromDate.Value.Date : DBNull.Value);
            var toDateParam = new SqlParameter("@toDate", toDate.HasValue ? toDate.Value.Date : DBNull.Value);
            var result = await _dbContext.Set<ScheduleStatusCountDto>().FromSqlRaw(query, studentIdParam, operationIdParam, fromDateParam, toDateParam)
                .AsNoTracking()
                .ToListAsync();
            var output = new ClassStatusSummaryResponseDto()
            {
                TotalCount = 0,
                StatusSummary = result
            };
            return output;
        }
        public async Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime fromDate, DateTime toDate, Guid? operationId = null)
        {
            var _from = fromDate.Date;
            var to = toDate.Date.AddDays(1);

            var result = await (
                from sd in _dbContext.ScheduleDetails
                join tc in _dbContext.Type_Code
                    on sd.TutorScheduleStatus equals tc.Id

                where sd.Date >= _from &&
                      sd.Date < to &&
                      sd.IsActive

                group sd by new
                {
                    sd.TutorScheduleStatus,
                    tc.TypeCodeValue,
                    tc.TypeCodeName
                }
                into g

                select new ScheduleStatusCountDto()
                {
                    StatusId = g.Key.TutorScheduleStatus,
                    Value = g.Key.TypeCodeValue,
                    StatusName = g.Key.TypeCodeName,
                    Count = g.Count()
                })
                .OrderBy(x => x.StatusName)
                .ToListAsync();

            var output = new ClassStatusSummaryResponseDto
            {
                TotalCount = result.Sum(x => x.Count),
                StatusSummary = result
            };
            return output;
        }
    }
}


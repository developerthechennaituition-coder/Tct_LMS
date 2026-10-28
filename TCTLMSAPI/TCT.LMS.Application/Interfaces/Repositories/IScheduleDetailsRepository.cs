using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;


namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IScheduleDetailsRepository : IGenericRepository<ScheduleDetails>
    {
        Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime? fromDate, DateTime? toDate, Guid? studentId = null, Guid? operationId = null);
        Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime fromDate, DateTime toDate, Guid? operationId = null);
        Task<List<ClassScheduleLegendDto>> GetClassDetailsByLegend(string status, DateTime fromDate, DateTime toDate);
        Task<Response<List<ClassScheduleReportDto>>> GetScheduledStudentList(ScheduleReportQueryParams input);
        Task<Response<List<ClassScheduleTutorReportDto>>> GetScheduledTutorList(ScheduleReportQueryParams input);
    }
}

using DocumentFormat.OpenXml.InkML;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;


namespace TCT.LMS.Application.Services
{
    public class ClassOperationsService : IClassOperationsService
    {

        private readonly IScheduleRepository _repository;
        private readonly IScheduleDetailsRepository _scheduleDetails;
        private readonly ISalesRepository _salesRepository;
        private readonly IMasterDetailRepository _masterDetailRepository;
        public ClassOperationsService(IScheduleRepository scheduleRepository, IScheduleDetailsRepository scheduleDetailsRepository, ISalesRepository salesRepository,
            IMasterDetailRepository masterDetailRepository)
        {
            _repository = scheduleRepository;
            _scheduleDetails = scheduleDetailsRepository;
            _salesRepository = salesRepository;
            _masterDetailRepository = masterDetailRepository;
        }
        public async Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime fromDate, DateTime toDate, Guid? operationId = null)
        {
            var result = await _scheduleDetails.GetClassStatusSummary(fromDate, toDate);
            return result;
        }
        public async Task<ClassStatusSummaryResponseDto> GetClassStatusSummary(DateTime? fromDate, DateTime? toDate, Guid? studentId = null, Guid? operationId = null)
        {
            var result = await _scheduleDetails.GetClassStatusSummary(fromDate, toDate, studentId, operationId);
            return result;
        }

        public Task<List<ClassScheduleLegendDto>> GetClassDetailsByLegend(string status, DateTime fromDate, DateTime toDate)
        {
            throw new NotImplementedException();
        }

        public async Task<Response<List<ClassScheduleReportDto>>> GetScheduledStudentList(ScheduleReportQueryParams input)
        {
            var result = await _scheduleDetails.GetScheduledStudentList(input);
            return result;
        }

        public async Task<Response<List<ClassScheduleTutorReportDto>>> GetScheduledTutorList(ScheduleReportQueryParams input)
        {
            var result = await _scheduleDetails.GetScheduledTutorList(input);
            return result;
        }
    }
}

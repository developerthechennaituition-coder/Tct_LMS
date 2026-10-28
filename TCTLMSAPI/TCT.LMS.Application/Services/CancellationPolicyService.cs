using Common;
using DocumentFormat.OpenXml.Office2010.CustomUI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class CancellationPolicyService : ICancellationPolicyService
    {
        private readonly ITutorStudentAllocationRepository _allocationRepository;
        private readonly IScheduleDetailsRepository _scheduleDetailsRepository;
        private readonly IScheduleRepository _scheduleRepository;
        private readonly IMasterDetailRepository _masterDetailRepository;
        private readonly IThresholdRepository _thresholdRepository;
        private readonly ICurrentUserService _currentUserService;

        public CancellationPolicyService(ITutorStudentAllocationRepository allocationRepository,
            IScheduleDetailsRepository scheduleDetailsRepository,
            IScheduleRepository scheduleRepository,
            IMasterDetailRepository masterDetailRepository,
            IThresholdRepository thresholdRepository,
            ICurrentUserService currentUserService)
        {
            _allocationRepository = allocationRepository;
            _scheduleDetailsRepository = scheduleDetailsRepository;
            _scheduleRepository = scheduleRepository;
            _masterDetailRepository = masterDetailRepository;
            _thresholdRepository = thresholdRepository;
            _currentUserService = currentUserService;
        }
        public CancellationResult ValidateScheduleStatusChange(Guid salesDetailsId, string newStatus, string userRole)
        {
            //var schedule = await _scheduleRepository.FindAll(s => s.SalesDetailsId == salesDetailsId);
            //var scheduleIds = schedule.Select(s => s.ScheduleId).ToList();
            //var firstClassDate = scheduleDetails.Min(x => x.Date).Date;
            //var daysFromStart = (DateTime.UtcNow.Date - firstClassDate).TotalDays;

            //var isNewStudent = daysFromStart < 30;

            //// ❌ Block student during demo
            //if (isNewStudent && newStatus == "Completed" && userRole == "Student")
            //{
            //    return new CancellationResult
            //    {
            //        IsAllowed = false,
            //        StatusCode = 0,
            //        Message = "During demo period, only coordinator can mark class as completed."
            //    };
            //}

            return new CancellationResult
            {
                IsAllowed = true,
                StatusCode = 1,
                Message = "Allowed"
            };
        }
        public async Task<Response<string>> ValidateTutorCancellationAsync(Guid salesDetailsId, CancellationToken cancellationToken)
        {
            var currentUser = _currentUserService.GetUser();
            var response = new Response<string>();
            var cancellationData = await ValiateAsync(salesDetailsId, new CancellationToken());

            if (!cancellationData.IsAllowed)
            {
                response.Data = cancellationData.Message;
                return response;
            }
            var totalClasses = cancellationData.TotalCalss;
            var cancelledClasses = cancellationData.CancelCount;

            // 3. Get threshold
            var threshold = await _thresholdRepository.GetThresholdByNameAsync("CancelClassRatio");

            if (threshold?.Value == null || totalClasses == 0)
            {
                response.Data = "Threshold not configured or no classes available.";
                return response;
            }

            // 4. Calculate allowed cancels
            var allowedCancels = (int)Math.Floor((threshold.Value.Value / 100m) * cancelledClasses);

            // Safety check: ensure minimum of 0
            allowedCancels = Math.Max(0, allowedCancels);

            // 5. Prepare response
            string message;
            if (allowedCancels == 0)
            {
                message = "Cancellations are not allowed for this month. Please reschedule the class instead.";
            }
            else if (cancelledClasses == 0)
            {
                message = $"You have not cancelled any classes yet.The maximum allowed is {allowedCancels}. " +
                "You can cancel classes within this limit. Alternatively, you can choose to reschedule the class.";
            }
            else if (cancelledClasses >= allowedCancels)
            {
                message = $"You have reached the maximum cancellation limit of {allowedCancels} classes. " +
              "You cannot cancel any more classes. If you proceed with cancellation, your invoice amount will be reduced. " +
              "Please reschedule the class instead.";
            }
            else
            {
                var remainingCancels = allowedCancels - cancelledClasses;
                message = $"You have already cancelled {cancelledClasses} class(es). The maximum allowed is {allowedCancels}. " +
               $"You can still cancel {remainingCancels} more class(es). Alternatively, you can choose to reschedule the class.";
            }

            response.Data = message;
            return response;

        }
        public async Task<CancellationResult> ValiateAsync(Guid salesDetailsId, CancellationToken cancellationToken)
        {
            var allocation = await _allocationRepository.FindAsync(i => i.IsActive && i.SalesDetailsId == salesDetailsId);
            var schedule = await _scheduleRepository.FindAll(s => s.SalesDetailsId == salesDetailsId);
            var scheduleIds = schedule.Select(s => s.ScheduleId).ToList();
            if (schedule == null)
                throw new BusinessRuleException("No schedule found.");

            var scheduleDetails = await _scheduleDetailsRepository.FindAll(s => scheduleIds.Contains(s.ScheduleId) && s.IsActive);

            if (scheduleDetails == null || !scheduleDetails.Any())
                throw new BusinessRuleException("No active class schedule found.");

            var result = await ValidateCancellationAsync(scheduleDetails.ToList(), allocation.PaymentAmount);
            result.TotalCalss = scheduleDetails.Count();
            return result;
        }
        private async Task<CancellationResult> ValidateCancellationAsync(List<ScheduleDetails> scheduleDetails, decimal perSessionAmount)
        {
            var today = DateTime.UtcNow.Date;

            var firstClassDate = scheduleDetails.Min(x => x.Date).Date;

            var totalDays = (today - firstClassDate).TotalDays;

            //Rule 1: First 30 days → No cancellation
            if (totalDays < 30)
            {
                return new CancellationResult
                {
                    IsAllowed = false,
                    StatusCode = 0,
                    Message = "Cancellation not allowed in first 30 days"
                };
            }

            var classCancelTypeCode = await _masterDetailRepository.FindAsync(f => f.TypeCodeValue == (int)ClassStatusType.ClassCancelled);
            // Current 30-day cycle
            var currentCycle = (int)(totalDays / 30);

            var cancelCount = scheduleDetails.Count(x =>
            {
                if (x.TutorScheduleStatus != classCancelTypeCode.Id) return false;

                var daysFromStart = (x.Date.Date - firstClassDate).TotalDays;
                var cycle = (int)(daysFromStart / 30);

                return cycle == currentCycle;
            });

            //First cancellation → FREE
            if (cancelCount == 0)
            {
                return new CancellationResult
                {
                    IsAllowed = true,
                    StatusCode = 1,
                    Message = "First cancellation - no penalty",
                    PenaltyAmount = 0
                };
            }

            //Beyond limit → 70% penalty
            var chargeableCount = cancelCount;
            var penalty = chargeableCount * perSessionAmount * 0.7m;

            return new CancellationResult
            {
                IsAllowed = true,
                StatusCode = 2,
                Message = $"Penalty applied: ₹{penalty}",
                PenaltyAmount = penalty,
                CancelCount = cancelCount
            };
        }
    }
}

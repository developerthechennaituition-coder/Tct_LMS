using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Sales;

namespace TCT.LMS.Application.Services
{
    public class PaymentPercentageService : IPaymentPercentageService
    {
        private readonly IPaymentPercentageRepository _paymentPercentageRepository;
        public PaymentPercentageService(IPaymentPercentageRepository paymentPercentageRepository)
        {
            _paymentPercentageRepository = paymentPercentageRepository;
        }
        public async Task<PaymentPercentageDto> GetPaymentPercentageAsync(Guid boardId, Guid gradeId, Guid subjectId, decimal parentPayment)
        {
            PaymentPercentageDto output = new PaymentPercentageDto();
            var result = await _paymentPercentageRepository.GetPaymentPercentageAsync(boardId, gradeId, subjectId);
            if (result != null)
            {
                output = new PaymentPercentageDto()
                {
                    BoardId = result.Board,
                    GradeId = result.Grade,
                    SubjectId = result.Subject,
                    TCTPercentage = result.TCTPercentage,
                    TutorPercentage = result.TutorPercentage,
                    TutorPayment = CalculateTutorShare(parentPayment, result.TutorPercentage.Value)
                };
            }
            else
            {
                output = new PaymentPercentageDto()
                {
                    BoardId = boardId,
                    GradeId = gradeId,
                    SubjectId = subjectId,
                    TCTPercentage = 0,
                    TutorPercentage = 0
                };
            }
            return output;
        }

        public decimal CalculateTutorShare(decimal parentPayment, decimal percentage)
        {
            if (percentage < 0 || percentage > 100) throw new ArgumentOutOfRangeException(nameof(percentage));
            decimal result = parentPayment * percentage / 100m;
            return Math.Round(result, 2, MidpointRounding.AwayFromZero);
        }

    }
}

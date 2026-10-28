using TCT.LMS.DTOs.Payroll;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface ITutorPaySlipPdfService
    {
        byte[] GeneratePaySlipPdf(List<PayrollRequestDto> invoiceData);
    }
}

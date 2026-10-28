namespace TCT.LMS.DTOs.Payroll;

public class StudentInvoiceDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; }
    public decimal StudentTotalPayment { get; set; }
    public string Month { get; set; }
    public string InvoicePeriod { get; set; }
    public int Year { get; set; }

    public IEnumerable<StudentInvoiceDetailsDto> Details { get; set; }
}

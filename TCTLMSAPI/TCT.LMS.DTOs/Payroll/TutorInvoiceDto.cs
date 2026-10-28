namespace TCT.LMS.DTOs.Payroll;

public class TutorInvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; }
    public decimal TutorTotalPayment { get; set; }
    public string Month { get; set; }
    public int Year { get; set; }
}

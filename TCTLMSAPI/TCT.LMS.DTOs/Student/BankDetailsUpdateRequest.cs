namespace TCT.LMS.DTOs.Student
{
    public class BankDetailsUpdateRequest
    {
        public Guid UserId { get; set; }
        public Guid StudentId { get; set; }
        public Guid BankDetailId { get; set; }
        public int? GSTPercentage { get; set; }
        public int? VATPercentage { get; set; }
        public string? Currency { get; set; }
        public string? ClientGST { get; set; }
        public string? ClientPAN { get; set; }
        public string? ClientGSTStateCode { get; set; }
        public string? ClientCountryCode { get; set; }
    }
}

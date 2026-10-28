using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Payroll;

namespace TCT.LMS.Infrastructure.Common
{
    public class TutorPaySlipPdfService : ITutorPaySlipPdfService
    {
        private static readonly byte[]? _logoBytes = LoadLogo();

        private static byte[]? LoadLogo()
        {
            var logoPath = Path.Combine(AppContext.BaseDirectory, "Uploads", "tctlogo.png");
            return File.Exists(logoPath) ? File.ReadAllBytes(logoPath) : null;
        }

        public byte[] GeneratePaySlipPdf(List<PayrollRequestDto> invoiceData)
        {
            if (invoiceData == null || invoiceData.Count == 0)
                throw new ArgumentException("No invoice data available", nameof(invoiceData));

            var d = invoiceData[0];

            var tutorName    = d.TutorName    ?? "N/A";
            var tutorPhone   = d.TutorPhone   ?? "-";
            var tutorCode    = d.TutorUserCode ?? "-";
            var monthYear    = $"{d.ScheduleMonthName} {d.ScheduleYear}";
            var payDate      = d.CreatedDate?.ToString("dd-MM-yyyy") ?? "-";
            var tctTitle     = string.IsNullOrWhiteSpace(d.TctTitle) ? "THE CHENNAI TUITION" : d.TctTitle.ToUpper();
            var tctPhone     = d.TctPhone  ?? "+91-9042171782";
            var tctAddressL1 = BuildAddress(d.TctAddress1, d.TctAddress2);
            var tctAddressL2 = BuildAddress(d.TctCity, d.TctState, d.TctZip, d.TctCountry);
            var tctEmail     = d.TctEmail  ?? "accounts@thechennaituition.com";

            var totalPayment   = d.TotalTutorPayment ?? 0m;
            var ci             = new CultureInfo("en-IN");
            var formattedTotal = totalPayment.ToString("N2", ci) + " INR";

            var logoBytes = _logoBytes;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(15, Unit.Millimetre);
                    page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10).FontColor("#333333"));

                    page.Content().Column(col =>
                    {
                        // ── Header: logo + org details ───────────────────────
                        col.Item().Row(row =>
                        {
                            row.ConstantItem(60).Column(logoCol =>
                            {
                                if (logoBytes != null)
                                {
                                    logoCol.Item()
                                        .Width(55).Height(55)
                                        .Image(logoBytes, ImageScaling.FitArea);
                                }
                                else
                                {
                                    logoCol.Item()
                                        .Border(2).BorderColor("#333333")
                                        .Width(50).Height(50)
                                        .AlignCenter().AlignMiddle()
                                        .Text("TCT").FontSize(11).Bold();
                                }
                            });

                            row.ConstantItem(8);

                            row.RelativeItem().Column(org =>
                            {
                                org.Item().Text(tctTitle).FontSize(13).Bold();
                                if (!string.IsNullOrWhiteSpace(tctAddressL1))
                                    org.Item().Text(tctAddressL1).FontSize(8).FontColor("#555555");
                                if (!string.IsNullOrWhiteSpace(tctAddressL2))
                                    org.Item().Text(tctAddressL2).FontSize(8).FontColor("#555555");
                                org.Item().Text($"Contact : {tctPhone}").FontSize(8);
                                if (!string.IsNullOrWhiteSpace(tctEmail))
                                    org.Item().Text(tctEmail).FontSize(8).FontColor("#555555");
                            });
                        });

                        col.Item().PaddingTop(8).LineHorizontal(0.75f).LineColor("#333333");

                        // ── Pay slip title ────────────────────────────────────
                        col.Item().PaddingVertical(6).AlignCenter().Text("Pay slip").FontSize(13).Bold();

                        col.Item().LineHorizontal(0.75f).LineColor("#333333");

                        // ── Employee details ──────────────────────────────────
                        col.Item().PaddingVertical(8).Row(row =>
                        {
                            row.RelativeItem().Text(text =>
                            {
                                text.Span("Name : ");
                                text.Span(tutorName).Bold();
                            });
                            row.RelativeItem().AlignRight().Text($"Phone number : {tutorPhone}");
                        });

                        col.Item().LineHorizontal(0.75f).LineColor("#333333");

                        col.Item().PaddingVertical(8).Row(row =>
                        {
                            row.RelativeItem().Text("Designation : Online Tutor");
                            row.RelativeItem().AlignRight().Text("Employee Type : Freelance");
                        });

                        col.Item().LineHorizontal(0.75f).LineColor("#333333");

                        col.Item().PaddingTop(14);

                        // ── Salary calculations ───────────────────────────────
                        col.Item().Text("Salary calculations :").FontSize(10);
                        col.Item().PaddingTop(6).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(2);
                            });

                            TwoColRow(table, "Net salary",       formattedTotal, header: true);
                            TwoColRow(table, "Paid amount",      formattedTotal);
                            TwoColRow(table, "Total Deductions", "NA");
                        });

                        col.Item().PaddingTop(12).LineHorizontal(0.75f).LineColor("#333333");

                        // ── Attendance summary ────────────────────────────────
                        col.Item().PaddingTop(8).Text("Attendance summary :").FontSize(10);
                        col.Item().PaddingTop(6).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                for (int i = 0; i < 5; i++) cols.RelativeColumn();
                            });

                            AttendanceHeader(table, "Present");
                            AttendanceHeader(table, "Absent");
                            AttendanceHeader(table, "Half days");
                            AttendanceHeader(table, "Paid leaves");
                            AttendanceHeader(table, "LOP");

                            for (int i = 0; i < 5; i++) AttendanceData(table, "-");

                            AttendanceHeader(table, "Double present");
                            AttendanceHeader(table, "Week off");
                            AttendanceHeader(table, "Holidays");
                            AttendanceHeader(table, "Hours worked");
                            AttendanceHeader(table, "OT");

                            for (int i = 0; i < 5; i++) AttendanceData(table, "-");
                        });

                        col.Item().PaddingTop(12).LineHorizontal(0.75f).LineColor("#333333");

                        // ── Paid amount breakdown ─────────────────────────────
                        col.Item().PaddingTop(8).Text("Paid amount Breakdown :").FontSize(10);
                        col.Item().PaddingTop(6).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn();
                                cols.RelativeColumn();
                                cols.RelativeColumn();
                            });

                            ThreeColHeader(table, "Employee ID", "Pay period", "Pay Date");
                            ThreeColData(table, tutorCode, monthYear, payDate);
                        });

                        col.Item().PaddingTop(12).LineHorizontal(0.75f).LineColor("#333333");

                        // ── Footer ────────────────────────────────────────────
                        col.Item().PaddingTop(12).AlignCenter()
                           .Text("*This is a computer generated payslip and does not require signature and stamp.")
                           .FontSize(9).Bold().Italic();
                    });
                });
            });

            return document.GeneratePdf();
        }

        private static void TwoColRow(TableDescriptor table, string label, string value, bool header = false)
        {
            var bg = header ? "#f8f9fa" : "#ffffff";
            table.Cell().Border(0.5f).BorderColor("#333333").Background(bg).Padding(6).Text(label);
            table.Cell().Border(0.5f).BorderColor("#333333").Background(bg).Padding(6).Text(value);
        }

        private static void AttendanceHeader(TableDescriptor table, string text)
        {
            table.Cell().Border(0.5f).BorderColor("#333333").Background("#f8f9fa").Padding(5).AlignCenter().Text(text).FontSize(9).Bold();
        }

        private static void AttendanceData(TableDescriptor table, string text)
        {
            table.Cell().Border(0.5f).BorderColor("#333333").Padding(5).AlignCenter().Text(text).FontSize(9);
        }

        private static void ThreeColHeader(TableDescriptor table, string c1, string c2, string c3)
        {
            table.Cell().Border(0.5f).BorderColor("#333333").Background("#f8f9fa").Padding(6).AlignCenter().Text(c1).FontSize(9).Bold();
            table.Cell().Border(0.5f).BorderColor("#333333").Background("#f8f9fa").Padding(6).AlignCenter().Text(c2).FontSize(9).Bold();
            table.Cell().Border(0.5f).BorderColor("#333333").Background("#f8f9fa").Padding(6).AlignCenter().Text(c3).FontSize(9).Bold();
        }

        private static void ThreeColData(TableDescriptor table, string c1, string c2, string c3)
        {
            table.Cell().Border(0.5f).BorderColor("#333333").Padding(6).AlignCenter().Text(c1).FontSize(9);
            table.Cell().Border(0.5f).BorderColor("#333333").Padding(6).AlignCenter().Text(c2).FontSize(9);
            table.Cell().Border(0.5f).BorderColor("#333333").Padding(6).AlignCenter().Text(c3).FontSize(9);
        }

        private static string BuildAddress(params string?[] parts)
        {
            var segments = parts
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!.Trim().TrimEnd(','));
            return string.Join(", ", segments);
        }
    }
}

using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QRCoder;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Common
{
    public interface IInvoicePdfService
    {
        byte[] GenerateInvoicePdf(InvoiceEmailData data);
    }

    public class InvoicePdfService : IInvoicePdfService
    {
        private static readonly string GreenHex = "#7CB342";

        public byte[] GenerateInvoicePdf(InvoiceEmailData data)
        {
            byte[]? qrBytes = null;
            if (!string.IsNullOrEmpty(data.PaymentUrl))
            {
                using var qrGenerator = new QRCodeGenerator();
                var qrData = qrGenerator.CreateQrCode(data.PaymentUrl, QRCodeGenerator.ECCLevel.H);
                var qrCode = new PngByteQRCode(qrData);
                qrBytes = qrCode.GetGraphic(5);
            }

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(10, Unit.Millimetre);
                    page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10).FontColor("#333333"));

                    page.Content().Column(col =>
                    {
                        // Header
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("INVOICE").FontSize(28).FontColor(GreenHex).Light();
                                left.Item().Text("THE CHENNAI TUITION").FontSize(12).FontColor(GreenHex).Bold();
                            });
                            row.ConstantItem(220).Column(right =>
                            {
                                right.Item().AlignRight().Row(r =>
                                {
                                    r.RelativeItem().Text("INVOICE #").FontSize(9).FontColor("#777777");
                                    r.ConstantItem(140).AlignRight().Text(data.InvoiceNumber).Bold().FontSize(9);
                                });
                                right.Item().AlignRight().Row(r =>
                                {
                                    r.RelativeItem().Text("Period").FontSize(9).FontColor("#777777");
                                    r.ConstantItem(140).AlignRight().Text(data.MonthYear).Bold().FontSize(9);
                                });
                                right.Item().AlignRight().Row(r =>
                                {
                                    r.RelativeItem().Text("Due Date").FontSize(9).FontColor("#777777");
                                    r.ConstantItem(140).AlignRight().Text(data.DueDate.ToString("dd-MMM-yyyy")).Bold().FontSize(9);
                                });
                            });
                        });

                        col.Item().PaddingTop(10).LineHorizontal(0.5f).LineColor("#eeeeee");
                        col.Item().PaddingVertical(12);

                        // Billing cards
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Border(0.5f).BorderColor("#eeeeee").Background("#f9f9f9").Padding(12).Column(b =>
                            {
                                b.Item().Text("Billed By").FontColor(GreenHex).Bold().FontSize(10);
                                b.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor("#e0e0e0");
                                b.Item().PaddingTop(4).Text("THE CHENNAI TUITION").Bold();
                                b.Item().Text("Plot No.14, Door No.9/147, Madha Nagar Main Road").FontSize(9).FontColor("#666666");
                                b.Item().Text("Moulivakkam, Chennai, Tamil Nadu - 600125").FontSize(9).FontColor("#666666");
                                b.Item().Text("GSTIN: 33FDDPM2936J1ZG | PAN: FDDPM2936J").FontSize(9).FontColor("#666666");
                                b.Item().Text("Email: accounts@thechennaituition.com").FontSize(9).FontColor("#666666");
                                b.Item().Text("Phone: +91 90421 71782").FontSize(9).FontColor("#666666");
                            });
                            row.ConstantItem(10);
                            row.RelativeItem().Border(0.5f).BorderColor("#eeeeee").Background("#f9f9f9").Padding(12).Column(b =>
                            {
                                b.Item().Text("Billed To").FontColor(GreenHex).Bold().FontSize(10);
                                b.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor("#e0e0e0");
                                b.Item().PaddingTop(4).Text(data.StudentName).Bold();
                                b.Item().Text($"Grade: {data.Grade} | Board: {data.Board}").FontSize(9).FontColor("#666666");
                                b.Item().Text($"Parent: {data.ParentName}").FontSize(9).FontColor("#666666");
                                b.Item().Text("Student Invoice Reference").FontSize(9).FontColor("#888888").Italic();
                            });
                        });

                        col.Item().PaddingVertical(12);

                        // Items table
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(4);
                                cols.RelativeColumn(1);
                                cols.RelativeColumn(1.5f);
                                cols.RelativeColumn(1.5f);
                            });
                            table.Header(header =>
                            {
                                header.Cell().Background(GreenHex).Padding(10).Text("Item Description").FontColor(Colors.White).Bold();
                                header.Cell().Background(GreenHex).Padding(10).AlignCenter().Text("Qty").FontColor(Colors.White).Bold();
                                header.Cell().Background(GreenHex).Padding(10).AlignRight().Text("Rate").FontColor(Colors.White).Bold();
                                header.Cell().Background(GreenHex).Padding(10).AlignRight().Text("Amount").FontColor(Colors.White).Bold();
                            });
                            foreach (var (item, index) in data.LineItems.Select((x, i) => (x, i)))
                            {
                                var bg = index % 2 == 0 ? "#ffffff" : "#f9f9f9";
                                table.Cell().Background(bg).Padding(10).Column(c =>
                                {
                                    c.Item().Text($"{index + 1}. {item.Subject.ToUpper()} FEES DETAILS").Bold();
                                    c.Item().Text($"Date: {item.StartDate}  |  Tutor: {item.TutorName}  |  Classes: {item.NumberOfClasses}").FontSize(9).FontColor("#666666");
                                    c.Item().PaddingTop(5).Text($"{item.PreviousMonthPeriod} billed classes: {item.PreviousMonthTotalClasses}").FontSize(9).FontColor("#666666");
                                    c.Item().Text($"{item.PreviousMonthPeriod} completed classes: {Math.Max(0, item.PreviousMonthTotalClasses - item.PreviousMonthPendingClasses)}").FontSize(9).FontColor("#666666");
                                    c.Item().Text($"{data.MonthYear} scheduled classes: {item.NumberOfClasses}").FontSize(9).FontColor("#666666");
                                    c.Item().Text($"Previous-month adjustment: -₹{item.PreviousMonthAdjustment:N2}").FontSize(9).FontColor("#666666");
                                });
                                table.Cell().Background(bg).Padding(10).AlignCenter().Text(item.NumberOfClasses.ToString());
                                table.Cell().Background(bg).Padding(10).AlignRight().Text($"₹{item.ParentPayment:N2}");
                                table.Cell().Background(bg).Padding(10).AlignRight().Text($"₹{item.TotalAmount:N2}").Bold();
                            }
                        });

                        col.Item().PaddingVertical(12);

                        // Footer
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Border(0.5f).BorderColor("#eeeeee").Background("#f9f9f9").Padding(12).Column(bank =>
                                {
                                    bank.Item().Text("Payment Details").FontColor(GreenHex).Bold();
                                    bank.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor("#e0e0e0");
                                    bank.Item().PaddingTop(4).Text("Account Name: Cambridge Enterprises").FontSize(9);
                                    bank.Item().Text("Account Number: 50200103194651").FontSize(9);
                                    bank.Item().Text("IFSC Code: HDFC0000206").FontSize(9);
                                    bank.Item().Text("Bank: HDFC - MS | Type: Current").FontSize(9);
                                });
                                left.Item().PaddingTop(8).Border(0.5f).BorderColor("#eeeeee").Background("#f9f9f9").Padding(12).Column(terms =>
                                {
                                    terms.Item().Text("Terms & Conditions").FontColor(GreenHex).Bold().FontSize(9);
                                    terms.Item().PaddingTop(4).Text("1. Please pay within Due Date to avoid overdue interest @ 18%.").FontSize(8).FontColor("#777777");
                                    terms.Item().Text("2. Mention the invoice number and student name in payment remarks.").FontSize(8).FontColor("#777777");
                                    terms.Item().Text("3. For International Transactions, please use SWIFT Payment.").FontSize(8).FontColor("#777777");
                                    terms.Item().Text("4. Classes must be cancelled at least 4 hours in advance to avoid billing.").FontSize(8).FontColor("#777777");
                                });
                            });
                            row.ConstantItem(10);
                            row.ConstantItem(180).Column(right =>
                            {
                                right.Item().Background(GreenHex).Padding(14).AlignCenter()
                                     .Text($"Total: ₹{data.TotalAmount:N2}").FontColor(Colors.White).Bold().FontSize(14);
                                right.Item().PaddingTop(10).AlignCenter().Width(85).Height(85)
                                 .Border(2).BorderColor(GreenHex)
                                 .AlignMiddle().AlignCenter()
                                 .Text("TCT\nCHENNAI\nTUITION")
                                 .FontColor(GreenHex).Bold().FontSize(8).LineHeight(1.4f);
                                right.Item().PaddingTop(6).AlignCenter().Text("Authorised Signatory").Bold().FontSize(10);
                                if (qrBytes != null)
                                {
                                    right.Item().PaddingTop(10).AlignCenter().Text("Scan to Pay").FontColor(GreenHex).Bold().FontSize(9);
                                    right.Item().PaddingTop(4).AlignCenter().Border(1.5f).BorderColor(GreenHex).Padding(4).Width(100).Height(100).Image(qrBytes);
                                    right.Item().PaddingTop(4).AlignCenter().Text("Powered by Stripe").FontSize(8).FontColor("#aaaaaa").Italic();
                                }
                            });
                        });

                        col.Item().PaddingTop(20).AlignCenter().Text("Happy to work with you!").FontSize(11).FontColor("#888888").Italic();
                    });
                });
            });

            return document.GeneratePdf();
        }
    }
}

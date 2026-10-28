using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using System.ComponentModel;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly IUserService _userService;
        public ReportsController(IStudentService studentService, IUserService userService) { 
            _studentService = studentService;
            _userService = userService;
        }


        [HttpGet("ExportToExcelUserList")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> ExportToExcelUserList(
            int? roleId,
            string? filterText,
            Guid? managerId = null,
            [FromQuery] int[]? roleIds = null)
        {
            if (roleId == -1)
            {
                roleId = null;
            }
            List<UserDTO> result = new List<UserDTO>();
            try
            {
                var users = await _userService.GetAllUser(roleId, filterText, managerId, roleIds);
                result = users.ToList();
                
                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("TCT Users");

                    worksheet.Cell(1, 1).Value = "TCT User List Report";
                    worksheet.Range(1, 1, 1, 4).Merge().Style.Font.Bold = true;
                    worksheet.Range(1, 1, 1, 4).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

                    worksheet.Cell(2, 1).Value = "Role:";
                    worksheet.Cell(2, 2).Value = filterText;
                    worksheet.Range(2, 2, 2, 4).Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);

                    worksheet.Cell(3, 1).Value = "Report Date";
                    worksheet.Cell(3, 2).Value = DateTime.Now;
                    worksheet.Cell(3, 2).Style.DateFormat.Format = "dd-MM-yyyy HH:mm";
                    worksheet.Range(3, 2, 3, 4).Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);

                    worksheet.Cell(4, 1).Value = "User Name";
                    worksheet.Cell(4, 2).Value = "Email";
                    worksheet.Cell(4, 3).Value = "Mobile";
                    worksheet.Cell(4, 4).Value = "Role";
                    worksheet.Row(4).Style.Font.Bold = true;
                    worksheet.Range(4, 1, 4, 4).Style.Fill.BackgroundColor = XLColor.DarkBlue;
                    worksheet.Range(4, 1, 4, 4).Style.Font.FontColor = XLColor.White;

                    // Insert Data
                    int row = 5;
                    foreach (var item in result)
                    {
                        worksheet.Cell(row, 1).Value = item.FullName;
                        worksheet.Cell(row, 2).Value = item.Email;
                        worksheet.Cell(row, 3).Value = item.Phone;
                        worksheet.Cell(row, 4).Value = item.Role;
                        row++;
                    }

                    // Auto-adjust columns
                    worksheet.Columns().AdjustToContents();

                    worksheet.Range(1, 1, row - 1, 5).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    worksheet.Range(1, 1, row - 1, 5).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                    // Generate Excel File
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        var content = stream.ToArray();
                        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "BoardOfferedCourseReport.xlsx");
                    }
                };
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to generate report.");
            }
        }



        [HttpGet("boardvisesubjectreport")]
        public IActionResult GetBoardViseStudentListForReport(Guid? boardId, Guid? gradeId, Guid? subjectId, string boardName) {
            try
            {
                var result = _studentService.GetBoardViseStudentListForReport(boardId, gradeId, subjectId);
                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("Students");
                    // Add Title (Merged)
                    worksheet.Cell(1, 1).Value = "TCT Board Offered Course Report";
                    worksheet.Range(1, 1, 1, 7).Merge().Style.Font.Bold = true;
                    worksheet.Range(1, 1, 1, 7).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

                    worksheet.Cell(2, 1).Value = "Board Name";
                    worksheet.Cell(2, 2).Value = boardName;
                    worksheet.Range(2, 2, 2, 7).Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);

                    worksheet.Cell(3, 1).Value = "Report Date";
                    worksheet.Cell(3, 2).Value = DateTime.Now;
                    worksheet.Cell(3, 2).Style.DateFormat.Format = "dd-MM-yyyy HH:mm";
                    worksheet.Range(3, 2, 3, 7).Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);

                    worksheet.Cell(4, 1).Value = "Student Name";
                    worksheet.Cell(4, 2).Value = "Board";
                    worksheet.Cell(4, 3).Value = "Grade";
                    worksheet.Cell(4, 4).Value = "Subject";
                    worksheet.Cell(4, 5).Value = "Phone";
                    worksheet.Cell(4, 6).Value = "Enroll Date";
                    worksheet.Cell(4, 7).Value = "Status";
                    worksheet.Row(4).Style.Font.Bold = true;
                    worksheet.Range(4, 1, 4, 7).Style.Fill.BackgroundColor = XLColor.DarkBlue;
                    worksheet.Range(4, 1, 4, 7).Style.Font.FontColor = XLColor.White;


                    // Insert Data
                    int row = 5;
                    foreach (var item in result)
                    {
                        worksheet.Cell(row, 1).Value = item.FullName;
                        worksheet.Cell(row, 2).Value = item.Board;
                        worksheet.Cell(row, 3).Value = item.Grade;
                        worksheet.Cell(row, 4).Value = item.EnrolledCourse;
                        worksheet.Cell(row, 5).Value = item.MobileNumber;
                        worksheet.Cell(row, 6).Value = item.EnrollmentDate;
                        worksheet.Cell(row, 7).Value = item.Status;
                        row++;
                    }

                    // Auto-adjust columns
                    worksheet.Columns().AdjustToContents();

                    worksheet.Range(1, 1, row - 1, 7).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    worksheet.Range(1, 1, row - 1, 7).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                    // Generate Excel File
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        var content = stream.ToArray();
                        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "BoardOfferedCourseReport.xlsx");
                    }
                };
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to generate report.");
            }
        }

        [HttpGet("download-excel")]
        public IActionResult DownloadExcel1()
        {
            
            try
            {
                // Sample Data
                var students = new List<dynamic>
            {
                new { Name = "Arul Chezhian", Course = "English", Grade = "Grade 5", Phone = "+917894123567", EnrollDate = "24-02-2025", Status = "Active" },
                new { Name = "Anthony Daasan", Course = "Tamil", Grade = "Grade 5", Phone = "+917891234560", EnrollDate = "24-02-2025", Status = "Active" }
            };

                using (var workbook = new XLWorkbook())
                {
                    var worksheet = workbook.Worksheets.Add("Students");

                    // Add Title (Merged)
                    worksheet.Cell(1, 1).Value = "Student Report";
                    worksheet.Range(1, 1, 1, 6).Merge().Style.Font.Bold = true;

                    // Add Headers
                    worksheet.Cell(2, 1).Value = "Student Name";
                    worksheet.Cell(2, 2).Value = "Course";
                    worksheet.Cell(2, 3).Value = "Grade";
                    worksheet.Cell(2, 4).Value = "Phone";
                    worksheet.Cell(2, 5).Value = "Enroll Date";
                    worksheet.Cell(2, 6).Value = "Status";

                    worksheet.Row(2).Style.Font.Bold = true; // Make headers bold

                    // Insert Data
                    int row = 3;
                    foreach (var student in students)
                    {
                        worksheet.Cell(row, 1).Value = student.Name;
                        worksheet.Cell(row, 2).Value = student.Course;
                        worksheet.Cell(row, 3).Value = student.Grade;
                        worksheet.Cell(row, 4).Value = student.Phone;
                        worksheet.Cell(row, 5).Value = student.EnrollDate;
                        worksheet.Cell(row, 6).Value = student.Status;
                        row++;
                    }

                    // Auto-adjust columns
                    worksheet.Columns().AdjustToContents();
                     
                    // Generate Excel File
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        var content = stream.ToArray();

                        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "StudentReport.xlsx");
                    }
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error generating Excel: {ex.Message}");
            }
        }

        [HttpGet("download")]
        public IActionResult DownloadExcel()
        {
            byte[] fileContents;
            try
            {
                // Set the license context for EPPlus
                ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial; // Change to Commercial if you have a license

                // Create a memory stream to hold the Excel package
                var stream = new MemoryStream();

                using (var package = new ExcelPackage())
                {
                    // Add a worksheet
                    var worksheet = package.Workbook.Worksheets.Add("Sample Data");

                    // Add headers
                    worksheet.Cells[1, 1].Value = "ID";
                    worksheet.Cells[1, 2].Value = "Name";
                    worksheet.Cells[1, 3].Value = "Date";
                    worksheet.Cells[1, 4].Value = "Amount";

                    // Add some sample data
                    for (int i = 2; i <= 10; i++)
                    {
                        worksheet.Cells[i, 1].Value = i - 1;
                        worksheet.Cells[i, 2].Value = $"Item {i - 1}";
                        worksheet.Cells[i, 3].Value = DateTime.Now.AddDays(-(i - 1));
                        worksheet.Cells[i, 4].Value = (i - 1) * 10.5;
                    }

                    // Style the headers
                    using (var range = worksheet.Cells[1, 1, 1, 4])
                    {
                        range.Style.Font.Bold = true;
                        range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                        range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                    }

                    // Auto-fit columns
                    worksheet.Cells.AutoFitColumns();

                    // Save to the memory stream
                    package.SaveAs(stream);

                    // Important: Reset the position to the beginning
                    stream.Position = 0;
                    fileContents = package.GetAsByteArray();
                }

                // Return the stream with the correct content type and a suggested filename
                return File(
                    fileContents,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "SampleData.xlsx"
                );
            }
            catch (Exception ex)
            {
                // Log the exception
                Console.WriteLine($"Error generating Excel: {ex.Message}");
                return StatusCode(500, $"Error generating Excel: {ex.Message}");
            }
        }
    }
}

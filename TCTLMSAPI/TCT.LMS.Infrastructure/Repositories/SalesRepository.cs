using Common;
using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Policy;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public class SalesRepository : GenericRepository<Sales>, ISalesRepository
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    #region Public Methods

    public SalesRepository(ApplicationDbContext dbContext, IPasswordHasher<User> passwordHasher) : base(dbContext)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }
    public async Task<IEnumerable<Sales>> GetAllSales(bool hideInActive, bool hideIsPrimary)
    {
        var query = _dbContext.Sales
        .Include(s => s.Student)
        .Include(s => s.SalesDetails)
        .AsNoTracking();

        //if (hideIsPrimary)
        //{
        //    query = query.Include(s => s.Student.StudentAddresses.Where(a => a.IsPrimary.Value));
        //}
        //else
        //{
        //    query = query.Include(s => s.Student.StudentAddresses);
        //}

        if (hideInActive)
        {
            query = query.Where(a => a.IsActive == true);
        }
        return await query.ToListAsync();
    }
    public async Task<SalesRequestDto?> GetSalesById(Guid id)
    {
        var sales = await _dbContext.Sales
            .Include(s => s.Student)
            .Include(s => s.SalesDetails)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sales == null)
            return null;
        var user = await _dbContext.User.FindAsync(sales.Student.UserId);
        var output = new SalesRequestDto
        {
            Id = sales.Id,
            Ownership = sales.Ownership ?? Guid.Empty,
            StudentId = sales.StudentId ?? Guid.Empty,
            BoardId = sales.BoardId,
            GradeId = sales.GradeId,
            PreviousBoardId = sales.PreviousBoardId,
            PreviousMarks = sales.PreviousMarks,
            ExamSeries = sales.ExamSeries,
            CustomerConnectedDate = sales.CustomerConnectedDate,
            LevelOfDemonstration = sales.LevelOfDemonstration,
            TutorPreference = sales.TutorPreference,
            GenderPreference = sales.GenderPreference,
            ParentsInterestedLevel = sales.ParentsInterestedLevel,
            StudentCurrentLocationAndSchool = sales.StudentCurrentLocationAndSchool,
            GradeGroupId = sales.GradeGroupId,
            Student = sales.Student == null
                ? null
                : new StudentRequestDto
                {
                    Id = sales.Student.Id,
                    Code = sales.Student.Code,
                    ParentName = sales.Student.ParentName,
                    UserId = sales.Student.UserId,
                    BoardId = sales.Student.BoardId,
                    GradeId = sales.Student.GradeId,
                    IsActive = sales.Student.IsActive,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    MobileNumber = user.Phone,
                    EmailAddress = user.Email,
                    Gender = user.Gender,

                    CreatedBy = sales.Student.CreatedBy,
                    CreatedDate = sales.Student.CreatedDate,
                    ModifiedBy = sales.Student.ModifiedBy,
                    ModifiedDate = sales.Student.ModifiedDate
                },
            SalesDetailRequest = sales.SalesDetails?
                .Select(sd => new SalesDetailsRequestDto
                {
                    Id = sd.Id,
                    SalesId = sd.SalesId,
                    Coordinator = sd.Coordinator,
                    SubjectId = sd.SubjectId,
                    StatusId = sd.Status,
                    ParentPayment = sd.ParentPayment,
                    TutorId = sd.TutorId,
                    TutorPayment = sd.TutorPayment,
                    NoOfSessionPerWeek = sd.NoOfSessionPerWeek,
                    SubjectCode = sd.SubjectCode,
                    AuthorBookDetails = sd.AuthorBookDetails,
                    //FollowUpDate = sd.FollowUpDate,
                    //StudentRiskStatus = sd.StudentRiskStatus,
                    IsActive = sd.IsActive,
                    CreatedBy = sd.CreatedBy,
                    CreatedDate = sd.CreatedDate,
                    ModifiedBy = sd.ModifiedBy,
                    ModifiedDate = sd.ModifiedDate
                })
                .ToList()
        };

        return output;
    }

    private async Task<Student> UpdateStudentAsync(StudentRequestDto studentDto, Guid modifiedBy)
    {
        try
        {
            var student = await _dbContext.Student.FindAsync(studentDto.Id);

            if (student == null)
                throw new Exception("Student not found");

            var user = _dbContext.User.Find(student.UserId);
            if (user != null)
            {
                user.FirstName = studentDto.FirstName;
                user.LastName = studentDto.LastName;
                user.FullName = $"{studentDto.FirstName} {studentDto.LastName}";
                user.Email = studentDto.EmailAddress;
                user.Phone = studentDto.MobileNumber;
                user.Gender = studentDto.Gender;
                user.DOB = studentDto.DOB;
                user.ModifiedBy = modifiedBy;
                user.ModifiedDate = DateTime.UtcNow;
            }

            // Update Student
            student.ParentName = studentDto.ParentName;
            student.BoardId = studentDto.BoardId.Value;
            student.GradeId = studentDto.GradeId.Value;
            student.ModifiedBy = modifiedBy;
            student.ModifiedDate = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return student;
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }
    public async Task<SalesRequestDto> CreateSales(SalesRequestDto salesDto)
    {
        Console.WriteLine("========== CreateSales CALLED ==========");

        var connection = _dbContext.Database.GetDbConnection();

        Console.WriteLine("========== DATABASE CHECK ==========");
        Console.WriteLine($"DATABASE : {connection.Database}");
        Console.WriteLine($"SERVER   : {connection.DataSource}");
        Console.WriteLine("====================================");
        if (salesDto == null)
        {
            Console.WriteLine("salesDto IS NULL");
            throw new ArgumentNullException(nameof(salesDto));
        }
        Console.WriteLine($"Sales Id       : {salesDto.Id}");
        Console.WriteLine($"CreatedBy      : {salesDto.CreatedBy}");
        Console.WriteLine($"Student Id     : {salesDto.Student?.Id}");
        Console.WriteLine($"Student Name   : {salesDto.Student?.FirstName}");
        Console.WriteLine($"Parent Name    : {salesDto.Student?.ParentName}");
        Console.WriteLine($"Email          : {salesDto.Student?.EmailAddress}");
        Console.WriteLine($"Phone          : {salesDto.Student?.MobileNumber}");
        Console.WriteLine($"Board Id       : {salesDto.Student?.BoardId}");
        Console.WriteLine($"Grade Id       : {salesDto.Student?.GradeId}");
        Console.WriteLine($"Ownership      : {salesDto.Student?.Ownership}");

        Console.WriteLine("========================================");
        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            Student studentDetails;
            Sales sales;

            bool isEdit = salesDto.Id != Guid.Empty;

            if (isEdit)
            {
                sales = await _dbContext.Sales.Include(x => x.SalesDetails).FirstOrDefaultAsync(x => x.Id == salesDto.Id);

                if (sales == null)
                    throw new Exception("Sales record not found");

                // Update Student
                studentDetails = await UpdateStudentAsync(salesDto.Student, salesDto.CreatedBy);

                // Update Sales
                sales.Ownership = salesDto.Student.Ownership;
                sales.BoardId = salesDto.BoardId;
                sales.BoardDuringRegistration = salesDto.BoardId;
                sales.GradeId = salesDto.GradeId;
                sales.GradeDuringRegistration = salesDto.GradeId;
                sales.PreviousBoardId = salesDto.PreviousBoardId;
                sales.PreviousMarks = salesDto.PreviousMarks;
                sales.ExamSeries = salesDto.ExamSeries;
                sales.CustomerConnectedDate = salesDto.CustomerConnectedDate;
                sales.LevelOfDemonstration = salesDto.LevelOfDemonstration;
                sales.TutorPreference = salesDto.TutorPreference;
                sales.GenderPreference = salesDto.GenderPreference;
                sales.ParentsInterestedLevel = salesDto.ParentsInterestedLevel;
                sales.StudentCurrentLocationAndSchool = salesDto.StudentCurrentLocationAndSchool;
                sales.GradeGroupId = salesDto.GradeGroupId;
                sales.ModifiedBy = salesDto.CreatedBy;
                sales.ModifiedDate = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();
            }
            else
            { 
                // Create Student
                string studentGeneratedPassword = string.Empty;
                if (salesDto.Student?.Id == null || salesDto.Student?.Id == Guid.Empty)
                {
                    Console.WriteLine("========== CREATE STUDENT PATH ==========");
                    (studentDetails, studentGeneratedPassword) = await CreateStudentAsync(salesDto.Student, salesDto.CreatedBy);
                    Console.WriteLine("========== STUDENT CREATED ==========");
                    Console.WriteLine($"Student Id   : {studentDetails.Id}");
                    Console.WriteLine($"Student Code : {studentDetails.Code}");
                    Console.WriteLine($"User Id      : {studentDetails.UserId}");
                    sales = new Sales
                    {
                        Ownership = salesDto.Student.Ownership,
                        CreatedBy = salesDto.CreatedBy,
                        CreatedDate = DateTime.UtcNow,
                        StudentId = studentDetails.Id,
                        BoardId = salesDto.BoardId,
                        BoardDuringRegistration = salesDto.BoardId,
                        GradeId = salesDto.GradeId,
                        GradeDuringRegistration = salesDto.GradeId,
                        IsActive = true,
                        PreviousBoardId = salesDto.PreviousBoardId,
                        PreviousMarks = salesDto.PreviousMarks,
                        ExamSeries = salesDto.ExamSeries,
                        CustomerConnectedDate = salesDto.CustomerConnectedDate,
                        LevelOfDemonstration = salesDto.LevelOfDemonstration,
                        TutorPreference = salesDto.TutorPreference,
                        GenderPreference = salesDto.GenderPreference,
                        ParentsInterestedLevel = salesDto.ParentsInterestedLevel,
                        StudentCurrentLocationAndSchool = salesDto.StudentCurrentLocationAndSchool,
                        GradeGroupId = salesDto.GradeGroupId
                    };
                    _dbContext.Sales.Add(sales);
                    await _dbContext.SaveChangesAsync();

                    await CreateSalesDetailsAsync(sales.Id, salesDto.SalesDetailRequest, salesDto.CreatedBy);
                    salesDto.Id = sales.Id;
                    salesDto.Student.Id = studentDetails.Id;
                    salesDto.Student.UserId = studentDetails.UserId;
                    salesDto.Student.GeneratedPassword = studentGeneratedPassword;
                }
                else
                {
                    Console.WriteLine("========== CREATE STUDENT SKIPPED ==========");
                    Console.WriteLine($"Received Student Id: {salesDto.Student.Id}");
                }
            } 
            await transaction.CommitAsync(); 
            return salesDto;
        }
        catch(Exception ex)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    public async Task<SalesRequestDto> UpdateSales(Guid salesId, SalesRequestDto salesDto)
    {
        if (string.IsNullOrWhiteSpace(salesId.ToString()))
        {
            throw new ArgumentException("Invalid sales ID", nameof(salesId));
        }

        if (salesDto == null)
        {
            throw new ArgumentNullException(nameof(salesDto));
        }

        if (string.IsNullOrWhiteSpace(salesDto.CreatedBy.ToString()))
        {
            throw new ArgumentException("ModifiedBy cannot be null or empty", nameof(salesDto.CreatedBy));
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var existingSales = await _dbContext.Sales
                .Include(s => s.SalesDetails)
                .FirstOrDefaultAsync(s => s.Id == salesId);

            if (existingSales == null)
            {
                throw new KeyNotFoundException($"Sales with ID {salesId} not found.");
            }

            // Update Sales properties
            existingSales.Ownership = salesDto.Ownership;
            existingSales.ModifiedBy = salesDto.CreatedBy; // Assuming CreatedBy in DTO is used as ModifiedBy for updates
            existingSales.ModifiedDate = DateTime.UtcNow;

            // Update Student if provided
            if (salesDto.Student != null)
            {
                await UpdateStudentAsync(existingSales.StudentId.Value, salesDto.Student, salesDto.CreatedBy);
            }

            // Update SalesDetails
            await UpdateSalesDetailsAsync(existingSales, salesDto.SalesDetailRequest, salesDto.CreatedBy);

            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            // Refresh the sales object to get the updated data
            await _dbContext.Entry(existingSales).ReloadAsync();

            // Map the updated sales back to DTO
            salesDto.Id = existingSales.Id;
            // Map other properties as needed

            return salesDto;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    public async Task DeleteSales(Guid salesId)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var existingSales = await _dbContext.Sales
                .Include(s => s.Student)
                //.ThenInclude(st => st.StudentAddresses)
                .Include(s => s.Student)
                .Include(s => s.SalesDetails)
                .FirstOrDefaultAsync(s => s.Id == salesId);

            if (existingSales == null)
            {
                throw new KeyNotFoundException("Sales record not found.");
            }

            foreach (var item in existingSales.SalesDetails)
            {
                item.IsActive = false;
                item.ModifiedDate = DateTime.Now;
                _dbContext.SalesDetails.Update(item);
            }


            existingSales.IsActive = false;
            existingSales.ModifiedDate = DateTime.Now;
            _dbContext.Sales.Update(existingSales);

            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    #endregion

    #region Private Methods

    private async Task<(Student student, string generatedPassword)> CreateStudentAsync(StudentRequestDto studentDto, Guid createdBy)
    {
        if (studentDto == null)
        {
            throw new ArgumentNullException(nameof(studentDto));
        }

        if (string.IsNullOrWhiteSpace(createdBy.ToString()))
        {
            throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
        }
        var email = studentDto.EmailAddress?.Trim();

        if (!string.IsNullOrWhiteSpace(email) &&
            !email.Equals(
                "NewSale Need to update",
                StringComparison.OrdinalIgnoreCase))
        {
            var normalizedEmail = email.ToLowerInvariant();

            var emailExists = await (
                from s in _dbContext.Student
                join u in _dbContext.User
                    on s.UserId equals u.Id
                where u.Email != null
                    && u.Email.Trim().ToLower() == normalizedEmail
                select s.Id
            ).AnyAsync();

            if (emailExists)
            {
                throw new InvalidOperationException(
                    $"DUPLICATE_STUDENT: Student with email '{email}' already exists.");
            }
        }
        var totalUser = await _dbContext.User.CountAsync() + 1;
        var code = Util.GetNextNumber(totalUser);
        var studentUserTypeId = await _dbContext.Type_Code
            .Where(c => c.TypeCodeValue == 10001)
            .Select(c => c.Id)
            .FirstOrDefaultAsync();
        var user = new User()
        {
            UserType = studentUserTypeId,
            FirstName = studentDto.FirstName,
            LastName = studentDto.LastName,
            FullName = $"{studentDto.FirstName} {studentDto.LastName}",
            UserCode = $"STD{code}",
            Email = (studentDto.EmailAddress == null) ? "NewSale Need to update" : studentDto.EmailAddress,
            Phone = studentDto.MobileNumber,
            Gender = studentDto.Gender,
            DOB = studentDto.DOB,
            IsSystemUser = false,
            IsActive = true,
            IsAdminUser = false,
            Location = "Chennai",
            CreatedBy = studentDto.CreatedBy,
            CreatedDate = DateTime.UtcNow,
            JoiningDate = DateTime.UtcNow
        };

        var plainPassword = TCT.LMS.Application.Common.PasswordGenerator.Generate();
        user.PasswordHash = _passwordHasher.HashPassword(user, plainPassword);
        _dbContext.User.Add(user);
        _dbContext.UserRole.Add(new UserRole()
        {
            UserId = user.Id,
            RoleId = (int)UserRoleEnum.Student,
            IsActive = true,
            CreatedBy = studentDto.CreatedBy,
            CreatedDate = DateTime.UtcNow,
        });
        // Save User + UserRole first so the FK from Student.UserId → User.Id is satisfied.
        // EF has no navigation property between Student and User, so it cannot order the
        // inserts automatically; splitting into two SaveChanges calls guarantees correct order.
        await _dbContext.SaveChangesAsync();

        var student = new Student
        {
            ParentName = studentDto.ParentName == null ? studentDto.LastName : studentDto.ParentName,
            UserId = user.Id,
            Code = $"STD{code}",
            BoardId = studentDto.BoardId ?? throw new ArgumentNullException(nameof(studentDto.BoardId)),
            GradeId = studentDto.GradeId ?? throw new ArgumentNullException(nameof(studentDto.GradeId)),
            CreatedBy = createdBy,
            CreatedDate = DateTime.UtcNow,
            IsActive = true
        };

        _dbContext.Student.Add(student);
        await _dbContext.SaveChangesAsync();

        if (studentDto.StudentAddresses != null && studentDto.StudentAddresses.Count > 0)
        {
            await CreateStudentAddressesAsync(user.Id, studentDto.StudentAddresses, createdBy);
        }

        //if (studentDto.StudentElectronicAddresses.Count > 0)
        //{
        //    await CreateStudentElectronicAddressesAsync(user.Id, studentDto.StudentElectronicAddresses, createdBy);
        //}

        return (student, plainPassword);
    }
    private async Task CreateStudentAddressesAsync(Guid studentId, IEnumerable<StudentAddressRequestDto> addresses, Guid createdBy)
    {
        try
        {
            if (studentId == Guid.Empty)
            {
                throw new ArgumentException("Invalid student ID", nameof(studentId));
            }

            if (string.IsNullOrWhiteSpace(createdBy.ToString()))
            {
                throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
            }

            if (addresses == null || !addresses.Any()) return;

            var studentAddresses = addresses.Select(address =>
            {
                if (address == null)
                {
                    throw new ArgumentNullException(nameof(address), "Address cannot be null");
                }

                return new Address
                {
                    UserId = studentId,
                    City = address.City ?? throw new ArgumentNullException(nameof(address.City)),
                    State = address.State ?? throw new ArgumentNullException(nameof(address.State)),
                    ZipCode = address.ZipCode ?? throw new ArgumentNullException(nameof(address.ZipCode)),
                    Country = address.Country ?? throw new ArgumentNullException(nameof(address.Country)),
                    IsActive = true,
                    IsPrimary = address.IsPrimary,
                    CreatedBy = createdBy,
                    CreatedDate = DateTime.UtcNow
                };
            }).ToList();

            _dbContext.Address.AddRange(studentAddresses);
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
        }
    }
    //private async Task CreateStudentElectronicAddressesAsync(Guid studentId, IEnumerable<StudentElectronicAddressRequestDto> electronicAddresses, Guid createdBy)
    //{
    //    if (studentId == Guid.Empty)
    //    {
    //        throw new ArgumentException("Invalid student ID", nameof(studentId));
    //    }

    //    if (string.IsNullOrWhiteSpace(createdBy.ToString()))
    //    {
    //        throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
    //    }

    //    if (electronicAddresses == null || !electronicAddresses.Any()) return;

    //    var studentEAddresses = electronicAddresses.Select(eAddress =>
    //    {
    //        if (eAddress == null)
    //        {
    //            throw new ArgumentNullException(nameof(eAddress), "Electronic address cannot be null");
    //        }

    //        return new ElectronicAddress
    //        {
    //            EmailAddress = eAddress.EmailAddress ?? throw new ArgumentNullException(nameof(eAddress.EmailAddress)),
    //            UserId = studentId,
    //            MobileNumber = eAddress.MobileNumber ?? throw new ArgumentNullException(nameof(eAddress.MobileNumber)),
    //            IsActive = true,
    //            IsPrimary = eAddress.IsPrimary,
    //            CreatedBy = createdBy,
    //            CreatedDate = DateTime.UtcNow
    //        };
    //    }).ToList();

    //    _dbContext.ElectronicAddress.AddRange(studentEAddresses);
    //    await _dbContext.SaveChangesAsync();
    //}
    private async Task CreateSalesDetailsAsync(Guid salesId, IEnumerable<SalesDetailsRequestDto> salesDetails, Guid createdBy)
    {
        if (salesId == Guid.Empty)
        {
            throw new ArgumentException("Invalid sales ID", nameof(salesId));
        }

        if (string.IsNullOrWhiteSpace(createdBy.ToString()))
        {
            throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
        }

        if (salesDetails == null || !salesDetails.Any()) return;

        // Fetch once async before the select — avoids one synchronous DB hit per item.
        var typeCode = await _dbContext.Type_Code
            .Where(s => s.TypeCodeValue == 20001 /*DemoPendingTutorNotAssigned*/)
            .FirstOrDefaultAsync();

        var salesDetailsEntities = salesDetails
            .Select(item =>
            {
                if (item == null)
                {
                    throw new ArgumentNullException(nameof(item), "Sales detail item cannot be null");
                }
                return new SalesDetails
                {
                    SalesId = salesId,
                    Coordinator = item.Coordinator != Guid.Empty ? item.Coordinator : throw new ArgumentNullException(nameof(item.Coordinator)),//new Guid("71A30B32-5038-4246-2B6B-08DCD28159A5"),//
                    ParentPayment = item.ParentPayment.Value,
                    Status = typeCode.Id,
                    SubjectId = item.SubjectId != Guid.Empty ? item.SubjectId : throw new ArgumentException("Invalid SubjectId", nameof(item.SubjectId)),
                    TutorId = item.TutorId,
                    TutorPayment = item.TutorPayment,
                    NoOfSessionPerWeek = item.NoOfSessionPerWeek,
                    SubjectCode = item.SubjectCode,
                    AuthorBookDetails = item.AuthorBookDetails,
                    DemoDate = item.DemoDate?.Date,
                    IsPaidDemo = item.IsPaidDemo,
                    CreatedBy = createdBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
            }).ToList();

        _dbContext.SalesDetails.AddRange(salesDetailsEntities);
        /*
        var notificationDetails = salesDetails
            .Select(item =>
            {
                if (item == null)
                {
                    throw new ArgumentNullException(nameof(item), "Sales detail item cannot be null");
                }
                var userName = _dbContext.User
                                .Where(u => u.Id == item.UserId)
                                .Select(n => n.FirstName + " " + n.LastName)
                                .FirstOrDefault();

                var stuent = (from user in _dbContext.User
                              join student in _dbContext.Student on user.Id equals student.UserId
                              join sales in _dbContext.Sales on student.Id equals sales.StudentId
                              where sales.Id == salesId
                              select user).FirstOrDefault();

                var _sales = _dbContext.Sales.Find(salesId);
                var subject = _dbContext.Type_Code.Find(item.SubjectId);
                var grade = _dbContext.Type_Code.Find(_sales.GradeId);
                var board = _dbContext.Type_Code.Find(_sales.BoardId);

                //"A new sale for CBSE Grade 10 Mathematics has been registered for John Doe by[Creator's Name].💡";
                return new Notification
                {
                    SalesId = salesId,
                    SalesDetailsId = salesDetailsEntities[0].Id,
                    FromUserId = item.UserId.Value,
                    ToUserId = item.Coordinator,
                    Message = $"New Sales created for student {stuent.FirstName} {stuent.LastName} for {item.SubjectId}  and assigned to you. Sales created by {userName}",
                    CreatedBy = item.UserId.Value,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
            }).ToList();
        _dbContext.Notification.AddRange(notificationDetails);
        */
        await _dbContext.SaveChangesAsync();
    }
    private async Task UpdateStudentAsync(Guid studentId, StudentRequestDto studentDto, Guid modifiedBy)
    {
        var student = await _dbContext.Student.FindAsync(studentId);
        if (student == null)
        {
            throw new KeyNotFoundException($"Student with ID {studentId} not found.");
        }

        // Update student properties

        student.ParentName = studentDto.ParentName ?? studentDto.LastName;
        student.BoardId = studentDto.BoardId ?? student.BoardId;
        student.GradeId = studentDto.GradeId ?? student.GradeId;
        student.ModifiedBy = modifiedBy;
        student.ModifiedDate = DateTime.UtcNow;

        _dbContext.Update(student);

    }
    private async Task UpdateStudentAddressesAsync(Guid studentId, IEnumerable<StudentAddressRequestDto> addresses, Guid modifiedBy)
    {
        var existingAddresses = await _dbContext.Address
            .Where(a => a.UserId == studentId)
            .ToListAsync();

        foreach (var addressDto in addresses)
        {
            var existingAddress = existingAddresses.FirstOrDefault(a => a.Id == addressDto.Id);

            if (existingAddress != null)
            {
                existingAddress.City = addressDto.City ?? existingAddress.City;
                existingAddress.State = addressDto.State ?? existingAddress.State;
                existingAddress.ZipCode = addressDto.ZipCode ?? existingAddress.ZipCode;
                existingAddress.Country = addressDto.Country ?? existingAddress.Country;
                existingAddress.IsPrimary = addressDto.IsPrimary;
                existingAddress.ModifiedBy = modifiedBy;
                existingAddress.ModifiedDate = DateTime.UtcNow;
            }
            else
            {

                var newAddress = new Address
                {
                    UserId = studentId,
                    City = addressDto.City,
                    State = addressDto.State,
                    ZipCode = addressDto.ZipCode,
                    Country = addressDto.Country,
                    IsActive = true,
                    IsPrimary = addressDto.IsPrimary,
                    CreatedBy = modifiedBy,
                    CreatedDate = DateTime.UtcNow
                };
                _dbContext.Address.Add(newAddress);
            }
        }
    }
    //private async Task UpdateStudentElectronicAddressesAsync(Guid studentId, IEnumerable<StudentElectronicAddressRequestDto> electronicAddresses, Guid modifiedBy)
    //{
    //    var existingEAddresses = await _dbContext.StudentElectronicAddress
    //        .Where(e => e.StudentId == studentId)
    //        .ToListAsync();

    //    foreach (var eAddressDto in electronicAddresses)
    //    {
    //        var existingEAddress = existingEAddresses.FirstOrDefault(e => e.Id == eAddressDto.Id);

    //        if (existingEAddress != null)
    //        {
    //            // Update existing electronic address
    //            existingEAddress.EmailAddress = eAddressDto.EmailAddress ?? existingEAddress.EmailAddress;
    //            existingEAddress.MobileNumber = eAddressDto.MobileNumber ?? existingEAddress.MobileNumber;
    //            existingEAddress.UserType = eAddressDto.UserType ?? existingEAddress.UserType;
    //            existingEAddress.IsPrimary = eAddressDto.IsPrimary;
    //            existingEAddress.ModifiedBy = modifiedBy;
    //            existingEAddress.ModifiedDate = DateTime.UtcNow;
    //        }
    //        else
    //        {
    //            // Add new electronic address
    //            var newEAddress = new StudentElectronicAddress
    //            {
    //                StudentId = studentId,
    //                EmailAddress = eAddressDto.EmailAddress,
    //                MobileNumber = eAddressDto.MobileNumber,
    //                UserType = eAddressDto.UserType,
    //                IsActive = true,
    //                IsPrimary = eAddressDto.IsPrimary,
    //                CreatedBy = modifiedBy,
    //                CreatedDate = DateTime.UtcNow
    //            };
    //            _dbContext.StudentElectronicAddress.Add(newEAddress);
    //        }
    //    }
    //}
    private async Task UpdateSalesDetailsAsync(Sales existingSales, IEnumerable<SalesDetailsRequestDto> salesDetails, Guid modifiedBy)
    {
        if (salesDetails == null || !salesDetails.Any()) return;

        // Remove existing sales details not present in the update request
        var detailIdsToKeep = salesDetails.Where(sd => !string.IsNullOrEmpty(sd.Id.ToString())).Select(sd => sd.Id).ToList();
        var detailsToRemove = existingSales.SalesDetails.Where(sd => !detailIdsToKeep.Contains(sd.Id)).ToList();
        foreach (var detailToRemove in detailsToRemove)
        {
            detailToRemove.IsActive = false;
            detailToRemove.ModifiedBy = modifiedBy;
            detailToRemove.ModifiedDate = DateTime.UtcNow;
        }

        foreach (var detailDto in salesDetails)
        {
            if (string.IsNullOrEmpty(detailDto.Id.ToString()))
            {
                // Add new sales detail
                var newDetail = new SalesDetails
                {
                    SalesId = existingSales.Id,
                    Coordinator = detailDto.Coordinator,
                    ParentPayment = detailDto.ParentPayment.Value,
                    SubjectId = detailDto.SubjectId,
                    TutorPayment = detailDto.TutorPayment,
                    CreatedBy = modifiedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                    //PreviousBoardId = detailDto.PreviousBoardId,
                    //PreviousMarks = detailDto.PreviousMarks,
                    //ExamSeries = detailDto.ExamSeries,
                    //CustomerConnectedDate = detailDto.CustomerConnectedDate,
                    //AuthorBookDetails = detailDto.AuthorBookDetails,
                    //LevelOfDemonstration = detailDto.LevelOfDemonstration,
                    //TutorPreference = detailDto.TutorPreference,
                    //SubjectCode = detailDto.SubjectCode,
                    //GenderPreference = detailDto.GenderPreference,
                    //ParentsInterestedLevel = detailDto.ParentsInterestedLevel,
                    //StudentCurrentLocationAndSchool = detailDto.StudentCurrentLocationAndSchool,
                    //NoOfSessionPerWeek = detailDto.NoOfSessionPerWeek,
                };
                existingSales.SalesDetails.Add(newDetail);
            }
            else
            {
                // Update existing sales detail
                var existingDetail = existingSales.SalesDetails.FirstOrDefault(sd => sd.Id == detailDto.Id);
                if (existingDetail != null)
                {
                    existingDetail.Coordinator = detailDto.Coordinator != Guid.Empty ? detailDto.Coordinator : throw new ArgumentNullException(nameof(detailDto.Coordinator));
                    existingDetail.ParentPayment = detailDto.ParentPayment.Value;
                    existingDetail.SubjectId = detailDto.SubjectId != Guid.Empty ? existingDetail.SubjectId : throw new ArgumentNullException(nameof(detailDto.SubjectId));
                    existingDetail.TutorPayment = detailDto.TutorPayment;
                    existingDetail.ModifiedBy = modifiedBy;
                    existingDetail.ModifiedDate = DateTime.UtcNow;
                    //existingDetail.PreviousBoardId = detailDto.PreviousBoardId;
                    //existingDetail.PreviousMarks = detailDto.PreviousMarks;
                    //existingDetail.ExamSeries = detailDto.ExamSeries;
                    //existingDetail.CustomerConnectedDate = detailDto.CustomerConnectedDate;
                    //existingDetail.AuthorBookDetails = detailDto.AuthorBookDetails;
                    //existingDetail.LevelOfDemonstration = detailDto.LevelOfDemonstration;
                    //existingDetail.TutorPreference = detailDto.TutorPreference;
                    //existingDetail.SubjectCode = detailDto.SubjectCode;
                    //existingDetail.GenderPreference = detailDto.GenderPreference;
                    //existingDetail.ParentsInterestedLevel = detailDto.ParentsInterestedLevel;
                    //existingDetail.StudentCurrentLocationAndSchool = detailDto.StudentCurrentLocationAndSchool;
                    //existingDetail.NoOfSessionPerWeek = detailDto.NoOfSessionPerWeek;
                }
            }
        }
    }

    public async Task<List<EnrolledCourse>> GetSubjectList(Guid studentId, Guid coordinatorId)
    {
        List<EnrolledCourse> enrolledCouses = new List<EnrolledCourse>();
        try
        {
            var sales = await _dbContext.Sales.Where(s => s.StudentId == studentId).FirstOrDefaultAsync();
            var details = _dbContext.SalesDetails.Where(s => s.Coordinator == coordinatorId && s.IsActive == true && s.SalesId == sales.Id && s.TutorId != Guid.Empty && s.TutorId != null)
                .Select(s => new EnrolledCourse()
                {
                    SubjectId = s.SubjectId,
                    SalesId = s.SalesId,
                    SaleDetailsId = s.Id,
                    TutorId = s.TutorId
                }).ToList();
            foreach (var item in details)
            {
                item.SubjectName = _dbContext.Type_Code.Find(item.SubjectId).TypeCodeName;
                var usr = _dbContext.User.Find(item.TutorId);
                if (usr != null)
                {
                    item.TutorName = usr.FirstName + " " + usr.LastName;
                }
            }
            return details;
        }
        catch (Exception ex)
        {
        }
        return enrolledCouses;
    }

    public async Task<IEnumerable<EnrolledCourse>> GetCoursesByCoordinatorId(Guid studentId, Guid coordinatorId)
    {
        List<EnrolledCourse> enrolledCouses = new List<EnrolledCourse>();
        var query = from sale in _dbContext.Sales
                    join saleDetail in _dbContext.SalesDetails on sale.Id equals saleDetail.SalesId
                    join subject in _dbContext.Type_Code on saleDetail.SubjectId equals subject.Id into subjectGroup
                    from subject in subjectGroup.DefaultIfEmpty()
                    join grade in _dbContext.Type_Code on sale.GradeId equals grade.Id into gradeGroup
                    from grade in gradeGroup.DefaultIfEmpty()
                    join board in _dbContext.Type_Code on sale.BoardId equals board.Id into boardGroup
                    from board in boardGroup.DefaultIfEmpty()
                    where sale.StudentId == studentId && saleDetail.Coordinator == coordinatorId && saleDetail.IsActive
                    orderby saleDetail.CreatedDate descending
                    select new EnrolledCourse
                    {
                        SalesId = sale.Id,
                        Id = saleDetail.Id,
                        SalesDetailsId = saleDetail.Id,
                        ModifiedBy = saleDetail.ModifiedBy,
                        StudentId = sale.StudentId,
                        SaleDetailsId = saleDetail.Id,
                        ParentPayment = saleDetail.ParentPayment,
                        CreatedDate = saleDetail.CreatedDate,
                        ModifiedDate = saleDetail.ModifiedDate,
                        CoordinatorId = saleDetail.Coordinator,
                        SubjectId = saleDetail.SubjectId,
                        SubjectName = subject != null ? subject.TypeCodeName : string.Empty,
                        Grade = grade != null ? grade.TypeCodeName : string.Empty,
                        Board = board != null ? board.TypeCodeName : string.Empty,
                        TutorId = saleDetail.TutorId,


                        IsActive = saleDetail.IsActive,
                        StatusId = saleDetail.Status,
                        //StatusName = (saleDetail.Status != null && saleDetail.Status != Guid.Empty)
                        //             ? _dbContext.Type_Code
                        //                 .Where(t => t.Id == saleDetail.Status)
                        //                 .Select(t => t.TypeCodeName)
                        //                 .FirstOrDefault()
                        //             : string.Empty
                    };

        var result = query.ToList();

        var _query = _dbContext.TypeGroup.Join(_dbContext.Type_Code,
            grp => grp.Id, code => code.TypeGroupId, (grp, code) => new { TypeGroupCode = grp.TypeGroupCode, TypeCodeId = code.Id, ShortCode = code.TypeCodeValue, TypeCodeName = code.TypeCodeName }).Where(s => s.TypeGroupCode == 200).ToList();

        foreach (var item in result)
        {
            var alloation = _dbContext.TutorStudentAllocations.Where(t => t.SalesDetailsId == item.SalesDetailsId).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (alloation != null)
            {
                var _tutor = await _dbContext.Tutor.FindAsync(alloation.TutorId);
                if (item.TutorId != null)
                {
                    var tutor = _dbContext.User.Where(t => t.Id == _tutor.Id || t.Id == _tutor.UserId).FirstOrDefault();
                    item.TutorName = tutor?.FullName;
                    item.TutorUserId = tutor.Id;
                    item.TutorPhone = tutor?.Phone;
                }
            }
            if (_query != null)
            {
                var _typeCode = _dbContext.Type_Code.Find(item.StatusId);
                item.ShortCode = _typeCode?.TypeCodeValue;
                item.StatusName = _typeCode?.TypeCodeName;
            }
            // Only the schedule identifier is needed here. Projecting it avoids loading
            // optional Schedule columns that may not exist in older deployed databases.
            var scheduler = _dbContext.Schedule
                .Where(s => s.SalesDetailsId == item.SalesDetailsId && s.IsActive == true)
                .Select(s => new { s.ScheduleId })
                .FirstOrDefault();
            if (scheduler != null)
            {
                item.ScheduleId = scheduler.ScheduleId;
                item.IsClassScheduled = true;
            }
            var student = _dbContext.Student.Find(item.StudentId);
            var _user = _dbContext.User.Find(student?.UserId);
            if (_user != null)
            {
                item.StdUserId = _user.Id;
                item.StudentName = $"{_user.FirstName} {_user.LastName}";
            }
            if (item.CoordinatorId != null && item.CoordinatorId != Guid.Empty)
            {
                var user = _dbContext.User.Find(item.CoordinatorId);
                item.CoordinatorName = user?.FullName;
            }
            if (item.ModifiedBy != Guid.Empty && item.ModifiedBy != null)
            {
                var user = _dbContext.User.Find(item.ModifiedBy);
                item.ModifiedByUser = user?.FullName;
            }
        }
        return result;
    }

    public async Task<IEnumerable<EnrolledCourse>> GetEnrolledCousesById(Guid studentId)
    {
        List<EnrolledCourse> enrolledCouses = new List<EnrolledCourse>();
        var query = from sale in _dbContext.Sales
                    join saleDetail in _dbContext.SalesDetails on sale.Id equals saleDetail.SalesId
                    join subject in _dbContext.Type_Code on saleDetail.SubjectId equals subject.Id into subjectGroup
                    from subject in subjectGroup.DefaultIfEmpty()
                    join grade in _dbContext.Type_Code on sale.GradeId equals grade.Id into gradeGroup
                    from grade in gradeGroup.DefaultIfEmpty()
                    join board in _dbContext.Type_Code on sale.BoardId equals board.Id into boardGroup
                    from board in boardGroup.DefaultIfEmpty()
                    where sale.StudentId == studentId && saleDetail.IsActive
                    orderby saleDetail.CreatedDate descending
                    select new EnrolledCourse
                    {
                        SalesId = sale.Id,
                        Id = sale.Id,
                        SalesDetailsId = saleDetail.Id,
                        ModifiedBy = saleDetail.ModifiedBy,
                        StudentId = sale.StudentId,
                        SaleDetailsId = saleDetail.Id,
                        ParentPayment = saleDetail.ParentPayment,
                        CreatedDate = saleDetail.CreatedDate,
                        ModifiedDate = saleDetail.ModifiedDate,
                        CoordinatorId = saleDetail.Coordinator,
                        SubjectId = saleDetail.SubjectId,
                        SubjectName = subject != null ? subject.TypeCodeName : string.Empty,
                        Grade = grade != null ? grade.TypeCodeName : string.Empty,
                        Board = board != null ? board.TypeCodeName : string.Empty,
                        TutorId = saleDetail.TutorId,
                        TutorName = saleDetail.TutorId != null ? _dbContext.User.Where(t => t.Id == saleDetail.TutorId).FirstOrDefault().FullName : "NA",
                        IsActive = saleDetail.IsActive,
                        StatusId = saleDetail.Status,
                        NoOfSessionPerWeek = saleDetail.NoOfSessionPerWeek,
                        SubjectCode = saleDetail.SubjectCode,
                        AuthorBookDetails = saleDetail.AuthorBookDetails,
                        //StatusName = (saleDetail.Status != null && saleDetail.Status != Guid.Empty)
                        //             ? _dbContext.Type_Code
                        //                 .Where(t => t.Id == saleDetail.Status)
                        //                 .Select(t => t.TypeCodeName)
                        //                 .FirstOrDefault()
                        //             : string.Empty
                    };

        var result = query.ToList();

        var _query = _dbContext.TypeGroup.Join(_dbContext.Type_Code,
            grp => grp.Id, code => code.TypeGroupId, (grp, code) => new { TypeGroupCode = grp.TypeGroupCode, TypeCodeId = code.Id, ShortCode = code.TypeCodeValue, TypeCodeName = code.TypeCodeName }).Where(s => s.TypeGroupCode == 200).ToList();

        foreach (var item in result)
        {
            var alloation = _dbContext.TutorStudentAllocations.Where(t => t.SalesDetailsId == item.SalesDetailsId).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (alloation != null)
            {
                var _tutor = await _dbContext.Tutor.FindAsync(alloation.TutorId);
                if (item.TutorId != null)
                {
                    var tutor = _dbContext.User.Where(t => t.Id == _tutor.Id || t.Id == _tutor.UserId).FirstOrDefault();
                    item.TutorName = tutor?.FullName;
                    item.TutorPhone = tutor?.Phone;
                    item.TutorUserId = _tutor.UserId;
                }
            }
            else
            {
                item.TutorName = "NA";
            }
            if (_query != null)
            {
                var _typeCode = _query.Where(s => s.TypeCodeId == item.StatusId).FirstOrDefault();
                if (_typeCode != null)
                {
                    item.ShortCode = _typeCode.ShortCode;
                    item.StatusName = _typeCode.TypeCodeName;
                }
            }
            // Only the schedule identifier is needed here. Avoid materializing the
            // complete Schedule entity against databases without optional columns.
            var scheduler = _dbContext.Schedule
                .Where(s => s.SalesDetailsId == item.SalesDetailsId && s.IsActive == true)
                .Select(s => new { s.ScheduleId })
                .FirstOrDefault();
            if (scheduler != null)
            {
                item.ScheduleId = scheduler.ScheduleId;
                item.IsClassScheduled = true;
            }
            var student = _dbContext.Student.Find(item.StudentId);
            var _user = _dbContext.User.Find(student?.UserId);
            if (_user != null)
            {
                item.StdUserId = _user.Id;
                item.StudentName = $"{_user.FirstName} {_user.LastName}";
            }
            if (item.CoordinatorId != null && item.CoordinatorId != Guid.Empty)
            {
                var user = _dbContext.User.Find(item.CoordinatorId);
                item.CoordinatorName = user?.FullName;
            }
            if (item.ModifiedBy != Guid.Empty && item.ModifiedBy != null)
            {
                var user = _dbContext.User.Find(item.ModifiedBy);
                item.ModifiedByUser = user?.FullName;
            }
        }
        return result;
    }

    public async Task<bool> EnrollCouse(SalesDetailsRequestDto input)
    {
        var sales = _dbContext.Sales.Where(s => s.StudentId == input.StudentId).FirstOrDefault();
        if (sales == null)
        {
            throw new ArgumentException("Invalid sales ID", nameof(input.SalesId));
        }
        input.SalesId = sales.Id;
        if (input.SalesId == Guid.Empty)
        {
            throw new ArgumentException("Invalid sales ID", nameof(input.SalesId));
        }

        var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 20001/*DemoPendingTutorNotAssigned*/).FirstOrDefault();
        var salesDetails = new SalesDetails
        {
            SalesId = input.SalesId,
            Coordinator = input.Coordinator,
            ParentPayment = input.ParentPayment.Value == null ? 0 : input.ParentPayment.Value,
            Status = typeCode.Id,
            AuthorBookDetails = input.AuthorBookDetails,
            SubjectCode = input.SubjectCode,
            NoOfSessionPerWeek = input.NoOfSessionPerWeek,
            DemoDate = input.DemoDate?.Date,
            IsPaidDemo = input.IsPaidDemo,
            SubjectId = input.SubjectId,
            CreatedBy = input.UserId.Value,
            CreatedDate = DateTime.UtcNow,
            IsActive = true
        };

        _dbContext.SalesDetails.AddRange(salesDetails);

        List<SalesDetails> lstSales = new List<SalesDetails>();
        if (salesDetails != null)
        {
            lstSales.Add(salesDetails);
        }

        var studentReg = _dbContext.StudentRegistration.Where(s => s.StudentId == input.StudentId).FirstOrDefault();
        if (studentReg != null)
        {
            var studentRegistration = new StudentRegistration
            {
                StudentId = studentReg.StudentId,
                StudentName = studentReg.StudentName,
                ParentName = studentReg.ParentName,
                ParentEmail = studentReg.ParentEmail,
                ParentMobile = studentReg.ParentMobile,
                ParentOccupation = studentReg.ParentOccupation,
                Subject = studentReg.StudentId,
                Curriculum = studentReg.Curriculum,
                Address = studentReg.Address,
                DemoFeedback = studentReg.DemoFeedback,
                CreatedBy = input.CreatedBy,
                CreatedDate = DateTime.UtcNow,
                FeesPerHour = studentReg.FeesPerHour,
                IdProofFileName = studentReg.IdProofFileName,
                Location = studentReg.Location,
                SchoolName = studentReg.SchoolName,
                TermsAccepted = studentReg.TermsAccepted,
            };
            _dbContext.StudentRegistration.Add(studentRegistration);
        }

        string? studenName = string.Empty;
        /*
        var notificationDetails = lstSales
            .Select(item =>
            {
                if (item == null)
                {
                    throw new ArgumentNullException(nameof(item), "Sales detail item cannot be null");
                }
                var userName = _dbContext.User
                                .Where(u => u.Id == item.CreatedBy)
                                .Select(n => n.FirstName + " " + n.LastName)
                                .FirstOrDefault();

                var student = _dbContext.Student
                                .Where(u => u.Id == sales.StudentId).FirstOrDefault();
                if (student != null)
                {
                    studenName = _dbContext.User
                                    .Where(u => u.Id == student.UserId)
                                    .Select(n => n.FirstName + " " + n.LastName)
                                    .FirstOrDefault();
                }
                return new Notification
                {
                    SalesId = input.SalesId,
                    SalesDetailsId = lstSales[0].Id,
                    FromUserId = item.CreatedBy,
                    ToUserId = item.Coordinator,
                    Message = $"New courses added to the existing student and assigned to you. Courses added by {studenName}",
                    CreatedBy = item.CreatedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
            }).ToList();
        _dbContext.Notification.AddRange(notificationDetails);
        */
        await _dbContext.SaveChangesAsync();

        return true;
    }

    public bool IsCourseAlreadyEnrolled(Guid subjectId, Guid studentId)
    {
        var sales = _dbContext.Sales.Where(s => s.StudentId == studentId).FirstOrDefault();
        if (sales != null)
        {
            var details = _dbContext.SalesDetails.Where(s => s.SalesId == sales.Id && s.SubjectId == subjectId && s.IsActive == true).FirstOrDefault();
            if (details != null)
            {
                return true;
            }
        }
        return false;
    }

    public DTOs.Wrappers.Response<bool> DeleteCourse(Guid detailsId)
    {
        DTOs.Wrappers.Response<bool> response = new DTOs.Wrappers.Response<bool>();
        var details = _dbContext.SalesDetails.Where(s => s.Id == detailsId).FirstOrDefault();
        if (details == null)
        {
            response.Succeeded = false;
            response.Message = "Course Not found";
            return response;
        }
        details.IsActive = false;
        details.ModifiedDate = DateTime.UtcNow;

        _dbContext.SalesDetails.Update(details);
        _dbContext.SaveChanges();
        response.Succeeded = true;

        return response;
    }

    public async Task<Response<SalesDetailsUpdateResponsDto>> UpdateSalesDetailsStatus(UpdateSalesDetailsDTO input)
    {
        Response<SalesDetailsUpdateResponsDto> response = new Response<SalesDetailsUpdateResponsDto>();
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var existingSalesDetails = await _dbContext.SalesDetails
                .FirstOrDefaultAsync(s => s.Id == input.SaleseDetailsId);

            if (existingSalesDetails == null)
            {
                throw new KeyNotFoundException($"Sales details with ID {input.SaleseDetailsId} not found.");
            }

            var tutorBeforeRequest = existingSalesDetails.TutorId;
            var statusBeforeRequest = existingSalesDetails.Status;

            existingSalesDetails.Id = input.SaleseDetailsId;
            existingSalesDetails.Status = input.StatusId;
            existingSalesDetails.FollowUpDate = input.FollowUpDate;
            Guid allocationId = Guid.Empty;
            decimal previousTutorPayment = existingSalesDetails.TutorPayment;
            decimal requestedTutorPayment = input.TutorPayment;
            bool tutorPaymentApprovalRequired = false;
            Guid? tutorPaymentApprovalId = null;
            int? tutorPaymentRequestType = null;
            int previouseStatus = input.Status;
            var _tutor = _dbContext.Tutor.FirstOrDefault(s => s.UserId == input.TutorId || s.Id == input.TutorId);
            var _sales = _dbContext.Sales.Find(existingSalesDetails.SalesId);
            if (_tutor == null || _sales?.StudentId == null)
            {
                throw new InvalidOperationException("The selected tutor or student could not be found.");
            }
            if (input.Status == (int)FollowUpStatus.DemoPendingTutorAssigned || input.Status == (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved)
            {
                // This step does not move class schedules: refuse a tutor change while the course has upcoming
                // class sessions with another tutor that have not been held, marked or paid (nothing is saved).
                if (tutorBeforeRequest != _tutor.Id && tutorBeforeRequest != _tutor.UserId
                    && await HasUnheldClassSessionsWithOtherTutorAsync(existingSalesDetails.Id, _tutor))
                {
                    await _dbContext.Entry(existingSalesDetails).ReloadAsync();
                    response.Succeeded = false;
                    response.Message = TCT.LMS.Application.Services.TutorReassignmentRules.OlderTutorChangeBlockedMessage;
                    return response;
                }

                // Store the normalized Tutor entity id, irrespective of whether the UI sent
                // the Tutor id or its User id.
                var previousAllocations = await _dbContext.TutorStudentAllocations
                    .Where(a => a.SalesDetailsId == existingSalesDetails.Id && a.IsActive)
                    .ToListAsync();
                var sameTutorWasAlreadyAssigned =
                    (tutorBeforeRequest == _tutor.Id || tutorBeforeRequest == _tutor.UserId) &&
                    previousAllocations.Any(a => a.TutorId == _tutor.Id || a.TutorId == _tutor.UserId);
                var latestApprovedPayment = sameTutorWasAlreadyAssigned
                    ? await _dbContext.TutorPaymentApproval.AsNoTracking()
                        .Where(p => p.SalesDetailsId == existingSalesDetails.Id &&
                                    p.TutorId == _tutor.Id &&
                                    p.ApprovalStatus == (int)TutorPaymentStatus.Approved &&
                                    p.ApprovedPaymentAmount.HasValue)
                        .OrderByDescending(p => p.ApprovedDate)
                        .Select(p => p.ApprovedPaymentAmount)
                        .FirstOrDefaultAsync()
                    : null;
                existingSalesDetails.TutorId = _tutor.Id;
                foreach (var previous in previousAllocations)
                {
                    previous.IsActive = false;
                    previous.ModifiedBy = input.UserId;
                    previous.ModifiedDate = DateTime.UtcNow;
                }

                var tutorDetail = await _dbContext.TutorDetails
                    .FirstOrDefaultAsync(td => td.TutorId == _tutor.Id
                                               && td.BoardId == _sales.BoardId
                                               && td.GradeId == _sales.GradeId
                                               && td.SubjectId == existingSalesDetails.SubjectId
                                               && td.IsActive);
                var approvedPayment = latestApprovedPayment
                    ?? (sameTutorWasAlreadyAssigned ? existingSalesDetails.TutorPayment : tutorDetail?.TutorPayment)
                    ?? existingSalesDetails.TutorPayment;
                existingSalesDetails.TutorPayment = approvedPayment;

                var _status = _dbContext.Type_Code.Find(input.StatusId);
                var assingment = new TutorStudentAllocations()
                {
                    Id = Guid.NewGuid(),
                    TutorId = _tutor.Id,
                    StudentId = _sales.StudentId.Value,
                    StatusCode = input.Status,
                    CreatedBy = input.UserId,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                    PaymentAmount = existingSalesDetails.TutorPayment,
                    Note = _status.TypeCodeName,
                    SalesDetailsId = existingSalesDetails.Id,
                };
                _dbContext.TutorStudentAllocations.Add(assingment);
                allocationId = assingment.Id;

                if (input.TutorPayment > 0 && input.TutorPayment != existingSalesDetails.TutorPayment)
                {
                    // Approval records are relevant only when the coordinator is
                    // proposing a different payment. A first assignment at the
                    // tutor's configured rate must not depend on this workflow.
                    var previousRequests = await _dbContext.TutorPaymentApproval
                        .Where(p => p.SalesDetailsId == existingSalesDetails.Id && p.IsActive)
                        .ToListAsync();
                    foreach (var previousRequest in previousRequests)
                    {
                        previousRequest.IsActive = false;
                    }

                    tutorPaymentApprovalRequired = true;
                    tutorPaymentApprovalId = Guid.NewGuid();
                    tutorPaymentRequestType = sameTutorWasAlreadyAssigned
                        ? (int)TutorPaymentRequestType.ExistingAssignmentPaymentChange
                        : (int)TutorPaymentRequestType.AssignmentWithPaymentChange;
                    var boardName = await _dbContext.Type_Code
                        .Where(t => t.Id == _sales.BoardId)
                        .Select(t => t.TypeCodeName)
                        .FirstOrDefaultAsync() ?? string.Empty;
                    var gradeName = await _dbContext.Type_Code
                        .Where(t => t.Id == _sales.GradeId)
                        .Select(t => t.TypeCodeName)
                        .FirstOrDefaultAsync() ?? string.Empty;
                    var currentMaxPayment = await _dbContext.TutorDetails
                        .Where(td => td.TutorId == _tutor.Id && td.IsActive)
                        .MaxAsync(td => td.TutorPayment) ?? 0;

                    _dbContext.TutorPaymentApproval.Add(new TutorPaymentApproval
                    {
                        Id = tutorPaymentApprovalId.Value,
                        TutorStudentAllocationId = assingment.Id,
                        StudentId = _sales.StudentId.Value,
                        TutorId = _tutor.Id,
                        SalesDetailsId = existingSalesDetails.Id,
                        SubjectId = existingSalesDetails.SubjectId,
                        Grade = gradeName,
                        Board = boardName,
                        RequestedPaymentAmount = input.TutorPayment,
                        BasePaymentAmount = existingSalesDetails.TutorPayment,
                        TutorCurrentMaxPayment = currentMaxPayment,
                        ApprovalStatus = (int)TutorPaymentStatus.Pending,
                        RequestType = tutorPaymentRequestType.Value,
                        PreviousTutorId = tutorBeforeRequest,
                        PreviousStatusId = statusBeforeRequest,
                        RequestReason = input.NoteText,
                        RequestedBy = input.UserId,
                        RequestedDate = DateTime.UtcNow,
                        IsActive = true
                    });
                }
                await _dbContext.SaveChangesAsync();
            }
            else
            {
                var allocation = await _dbContext.TutorStudentAllocations
                    .Where(t => t.TutorId == _tutor.Id && t.StudentId == _sales.StudentId && t.SalesDetailsId == input.SaleseDetailsId)
                    .OrderByDescending(s => s.CreatedDate).FirstOrDefaultAsync();
                if (allocation != null)
                {
                    allocation.ModifiedBy = input.UserId;
                    allocation.ModifiedDate = DateTime.UtcNow;
                    allocation.StatusCode = input.Status;
                    _dbContext.TutorStudentAllocations.Update(allocation);
                    allocationId = allocation.Id;
                    previouseStatus = allocation.StatusCode ?? input.Status;
                }

                var paymentApproval = await _dbContext.TutorPaymentApproval
                    .Where(p => p.SalesDetailsId == existingSalesDetails.Id
                                && p.TutorId == _tutor.Id
                                && p.IsActive
                                && p.ApprovalStatus == (int)TutorPaymentStatus.Pending)
                    .OrderByDescending(p => p.RequestedDate)
                    .FirstOrDefaultAsync();

                if (input.Status == (int)FollowUpStatus.DemoPendingTutorAssignedApproved)
                {
                    var approvedPayment = paymentApproval?.RequestedPaymentAmount ?? input.TutorPayment;
                    existingSalesDetails.TutorPayment = approvedPayment;
                    if (allocation != null)
                    {
                        allocation.PaymentAmount = approvedPayment;
                    }

                    if (approvedPayment > 0)
                    {
                        var tutorDetail = _dbContext.TutorDetails
                            .FirstOrDefault(td => td.TutorId == _tutor.Id
                                                  && td.BoardId == _sales.BoardId
                                                  && td.GradeId == _sales.GradeId
                                                  && td.SubjectId == existingSalesDetails.SubjectId
                                                  && td.IsActive);
                        if (tutorDetail != null)
                        {
                            tutorDetail.TutorPayment = approvedPayment;
                            _dbContext.TutorDetails.Update(tutorDetail);
                        }
                    }

                    if (paymentApproval != null)
                    {
                        paymentApproval.ApprovalStatus = (int)TutorPaymentStatus.Approved;
                        paymentApproval.ApprovedBy = input.UserId;
                        paymentApproval.ApprovedDate = DateTime.UtcNow;
                        paymentApproval.ApprovalRemarks = input.NoteText;
                        paymentApproval.IsActive = false;
                    }
                }
                else if (input.Status == (int)FollowUpStatus.Reject)
                {
                    var retainedPayment = paymentApproval?.BasePaymentAmount ?? existingSalesDetails.TutorPayment;
                    existingSalesDetails.TutorPayment = retainedPayment;
                    if (allocation != null)
                    {
                        allocation.PaymentAmount = retainedPayment;
                    }

                    if (paymentApproval != null)
                    {
                        paymentApproval.ApprovalStatus = (int)TutorPaymentStatus.Rejected;
                        paymentApproval.ApprovedBy = input.UserId;
                        paymentApproval.ApprovedDate = DateTime.UtcNow;
                        paymentApproval.ApprovalRemarks = input.NoteText;
                        paymentApproval.IsActive = false;
                    }
                }
            }

            if (allocationId != Guid.Empty)
            {
                var history = new TutorStudentAllocationHistory
                {
                    AllocationId = allocationId,
                    PreviousStatus = previouseStatus,
                    NewStatus = input.Status,
                    ActionTakenBy = input.UserId.ToString(),
                    ActionEffectiveDate = DateTime.UtcNow,
                    Notes = input.NoteText,
                    CreatedBy = input.UserId,
                    CreatedDate = DateTime.UtcNow
                };
                _dbContext.TutorStudentAllocationHistory.Add(history);
                await _dbContext.SaveChangesAsync();
            }

            existingSalesDetails.ModifiedBy = input.UserId;
            existingSalesDetails.ModifiedDate = DateTime.UtcNow;
            _dbContext.SalesDetails.Update(existingSalesDetails);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            response.Data = new SalesDetailsUpdateResponsDto()
            {
                SaleseDetailsId = input.SaleseDetailsId,
                AllocationId = allocationId,
                PreviousTutorPayment = previousTutorPayment,
                RequestedTutorPayment = requestedTutorPayment,
                TutorPaymentApprovalRequired = tutorPaymentApprovalRequired,
                TutorPaymentApprovalId = tutorPaymentApprovalId,
                TutorPaymentRequestType = tutorPaymentRequestType,
            };
            response.Succeeded = true;
            //response.Data = true;
            return response;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Upcoming class sessions of the course with a tutor other than the given one that have not been held,
    // marked or paid (TutorReassignmentRules.IsMovable, the rule the Operations Tutor Change request uses).
    private async Task<bool> HasUnheldClassSessionsWithOtherTutorAsync(Guid salesDetailsId, Tutor tutor)
    {
        var now = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
        var sessions = await (
            from s in _dbContext.Schedule.AsNoTracking()
            join d in _dbContext.ScheduleDetails.AsNoTracking() on s.ScheduleId equals d.ScheduleId
            where s.SalesDetailsId == salesDetailsId && s.IsActive && d.IsActive && d.ScheduleType == "Class"
                && s.TutorId != tutor.Id && s.TutorId != tutor.UserId && d.StartTime > now
            select d).ToListAsync();
        if (sessions.Count == 0) return false;
        var sessionIds = sessions.Select(d => d.ScheduleDetailsId).ToList();
        var placeholderStatusIds = (await _dbContext.Type_Code.AsNoTracking()
            .Where(c => TCT.LMS.Application.Services.TutorReassignmentRules.PlaceholderStatusCodes.Contains(c.TypeCodeValue))
            .Select(c => c.Id).ToListAsync()).ToHashSet();
        var invoicedSessionIds = (await _dbContext.TutorInvoiceDetails.AsNoTracking()
            .Where(x => x.ScheduleDetailsId != null && sessionIds.Contains(x.ScheduleDetailsId.Value))
            .Select(x => x.ScheduleDetailsId!.Value).ToListAsync()).ToHashSet();
        return TCT.LMS.Application.Services.TutorReassignmentRules.HasUnheldSessions(sessions, now, placeholderStatusIds, invoicedSessionIds);
    }

    public async Task<bool> UpdateSalesDetailsTutorAssignedStatus(SalesDetailsRequestDto salesDetailsDto)
    {
        if (string.IsNullOrWhiteSpace(salesDetailsDto.Id.ToString()))
        {
            throw new ArgumentException("Invalid sales details ID", nameof(salesDetailsDto.Id));
        }
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var existingSalesDetails = await _dbContext.SalesDetails
                .FirstOrDefaultAsync(s => s.Id == salesDetailsDto.Id);

            if (existingSalesDetails == null)
            {
                throw new KeyNotFoundException($"Sales details with ID {salesDetailsDto.Id} not found.");
            }
            //var tutorAssignedStatus = "rejected";
            //var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 20012/*DemoPendingTutorAssignedNotApproved*/).FirstOrDefault();
            //if (salesDetailsDto.TutorApprovedStatus)
            //{
            //    tutorAssignedStatus = "approved";
            //    typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 20013/*DemoPendingTutorAssignedApproved*/).FirstOrDefault();
            //}

            //existingSalesDetails.Status = typeCode.Id;
            existingSalesDetails.ModifiedBy = salesDetailsDto.CreatedBy;
            existingSalesDetails.ModifiedDate = DateTime.UtcNow;
            _dbContext.SalesDetails.Update(existingSalesDetails);
            /*
            var userName = _dbContext.User
                               .Where(u => u.Id == salesDetailsDto.CreatedBy)
                               .Select(n => n.FirstName + " " + n.LastName)
                               .FirstOrDefault();

            var user = await (from u in _dbContext.User
                              join ur in _dbContext.UserRole on u.Id equals ur.UserId
                              join r in _dbContext.Roles on ur.RoleId equals r.Id
                              where r.Id == (int)UserRoleEnum.CoordinatorAdmin// CoordinatorAdmin
                                    && u.IsActive == true
                                    && ur.IsActive == true
                                    && r.IsActive == true
                              orderby u.Id descending
                              select u).FirstOrDefaultAsync();
            var latestNotification = _dbContext.Notification
                    .Where(n => n.ToUserId == salesDetailsDto.ToUserId.Value)
                    .OrderByDescending(n => n.CreatedDate)
                    .FirstOrDefault();

            if (latestNotification != null)
            {
                latestNotification.IsActive = false;
                latestNotification.ModifiedBy = salesDetailsDto.CreatedBy;
                latestNotification.ModifiedDate = DateTime.UtcNow;
                _dbContext.Notification.Update(latestNotification);
            }

            var coordinatorNotification = new Notification
            {
                SalesId = salesDetailsDto.SalesId,
                SalesDetailsId = salesDetailsDto.Id,
                FromUserId = salesDetailsDto.ToUserId.Value,
                ToUserId = salesDetailsDto.FromUserId.Value,
                Message = $"Coordinator admin {tutorAssignedStatus} tutor assigned on {DateTime.UtcNow}",
                CreatedBy = salesDetailsDto.ToUserId.Value,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            };
            _dbContext.Notification.Add(coordinatorNotification);
            */
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateSaleDetailsStatus(Guid userId, Guid id, Guid statusId)
    {
        var details = _dbContext.SalesDetails.Find(id);
        if (details == null)
            throw new KeyNotFoundException($"Sales details with ID {id} not found.");

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            details.Status = statusId;
            details.ModifiedDate = DateTime.Now;
            details.ModifiedBy = userId;
            _dbContext.Update(details);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public Response<SalesDetailsDTO> GetSalesDetailsById(Guid salesId, Guid salesDetailsId, Guid scheduleDetailsId, string userRole)
    {
        Response<SalesDetailsDTO> response = new Response<SalesDetailsDTO>();

        var _salesDetails = _dbContext.SalesDetails.Find(salesDetailsId);
        if (_salesDetails != null)
        {
            TutorPaymentApproval? paymentApproval = null;
            decimal? latestApprovedPayment = null;
            var hasAssignedTutor = _salesDetails.TutorId.HasValue
                                   && _salesDetails.TutorId.Value != Guid.Empty;

            // Payment approval belongs to an existing tutor assignment. An
            // unassigned course (for example, a student's second subject) must
            // be loadable so that a coordinator can select its first tutor.
            if (hasAssignedTutor)
            {
                paymentApproval = _dbContext.TutorPaymentApproval
                    .AsNoTracking()
                    .Where(p => p.SalesDetailsId == salesDetailsId
                                && p.IsActive
                                && p.ApprovalStatus == (int)TutorPaymentStatus.Pending)
                    .OrderByDescending(p => p.RequestedDate)
                    .FirstOrDefault();
                latestApprovedPayment = _dbContext.TutorPaymentApproval
                    .AsNoTracking()
                    .Where(p => p.SalesDetailsId == salesDetailsId
                                && p.ApprovalStatus == (int)TutorPaymentStatus.Approved
                                && p.ApprovedPaymentAmount.HasValue)
                    .OrderByDescending(p => p.ApprovedDate)
                    .Select(p => p.ApprovedPaymentAmount)
                    .FirstOrDefault();
            }
            var effectiveTutorPayment = paymentApproval == null
                ? latestApprovedPayment ?? _salesDetails.TutorPayment
                : _salesDetails.TutorPayment;
            var stuDetails = (from user in _dbContext.User
                              join student in _dbContext.Student on user.Id equals student.UserId
                              join sales in _dbContext.Sales on student.Id equals sales.StudentId
                              where sales.Id == _salesDetails.SalesId
                              select user).FirstOrDefault();

            var scheduleDetail = _dbContext.ScheduleDetails
            .AsNoTracking()
            .FirstOrDefault(x => x.ScheduleDetailsId == scheduleDetailsId);

            var sales1 = _dbContext.Sales.Find(_salesDetails.SalesId);
            var statusType = _dbContext.Type_Code.Find(_salesDetails.Status);
            var data = new SalesDetailsDTO()
            {
                SalesId = sales1?.Id ?? _salesDetails.SalesId,
                StudentId = sales1?.StudentId?.ToString(),
                SaleDetailsId = _salesDetails.Id,
                StdUserId = stuDetails?.Id ?? Guid.Empty,
                StudentName = stuDetails?.FullName,
                SubjectId = _salesDetails.SubjectId,
                TutorPayment = effectiveTutorPayment,
                PreviousTutorPayment = paymentApproval?.BasePaymentAmount ?? _salesDetails.TutorPayment,
                RequestedTutorPayment = paymentApproval?.RequestedPaymentAmount ?? effectiveTutorPayment,
                TutorPaymentApprovalRequired = paymentApproval != null,
                GradId = sales1?.GradeId,
                BoardId = sales1?.BoardId,
                BoardName = _dbContext.Type_Code.Find(sales1?.BoardId)?.TypeCodeName,
                GradeName = _dbContext.Type_Code.Find(sales1?.GradeId)?.TypeCodeName,
                SubjectName = _dbContext.Type_Code.Find(_salesDetails.SubjectId)?.TypeCodeName,
                CoordinatorId = _salesDetails.Coordinator,
                CoordinatorName = _dbContext.User.Find(_salesDetails.Coordinator)?.FullName ?? "NA",
                TutorId = _salesDetails.TutorId,
                TutorUserId = _dbContext.Tutor
                    .Where(t => t.Id == _salesDetails.TutorId || t.UserId == _salesDetails.TutorId)
                    .Select(t => (Guid?)t.UserId)
                    .FirstOrDefault(),
                Status = _salesDetails.Status,
                StatusTypeCode = statusType?.TypeCodeValue,
                StatusTypeName = statusType?.TypeCodeName,
                TutorName = (_salesDetails.TutorId == null || _salesDetails.TutorId == Guid.Empty)
                ? "NA"
                : (from t in _dbContext.Tutor
                   join u in _dbContext.User on t.UserId equals u.Id
                   where t.Id == _salesDetails.TutorId || t.UserId == _salesDetails.TutorId
                   select u.FullName).FirstOrDefault() ?? "NA",
                NoOfSessionPerWeek = _salesDetails.NoOfSessionPerWeek,
                SubjectCode = _salesDetails.SubjectCode,
                AuthorBookDetails = _salesDetails.AuthorBookDetails,
                DemoDate = _salesDetails.DemoDate,
                IsPaidDemo = _salesDetails.IsPaidDemo,
                ParentPayment = _salesDetails.ParentPayment,
                OperationStartTime = sales1.ModifiedDate,
                Comments = scheduleDetail == null || string.IsNullOrWhiteSpace(userRole)
                ? "N/A"
                : (userRole switch
                {
                    "Student" => scheduleDetail.StudentComment,
                    "Tutor" => scheduleDetail.TutorComment,
                    "Operation" => scheduleDetail.Comment,
                    _ => scheduleDetail.Comment
                } ?? "N/A"),
            };
            response.Data = data;
            response.Succeeded = true;
        }
        return response;
    }

    public async Task<Response<bool>> UpdateStudentInfo(SalesRequestDto salesDto)
    {
        Response<bool> response = new Response<bool>();
        if (string.IsNullOrWhiteSpace(salesDto.Student.Id.ToString()))
        {
            throw new ArgumentException("Invalid student ID", nameof(salesDto.Student.Id));
        }

        if (salesDto == null)
        {
            throw new ArgumentNullException(nameof(salesDto));
        }

        if (string.IsNullOrWhiteSpace(salesDto.CreatedBy.ToString()))
        {
            throw new ArgumentException("ModifiedBy cannot be null or empty", nameof(salesDto.CreatedBy));
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var existingSales = await _dbContext.Sales
                .Include(s => s.SalesDetails)
                .FirstOrDefaultAsync(s => s.StudentId == salesDto.Student.Id);

            if (existingSales == null)
            {
                throw new KeyNotFoundException($"Sales record for student ID {salesDto.Student.Id} not found.");
            }

            // Update Sales properties
            existingSales.Ownership = salesDto.Ownership;
            existingSales.BoardId = salesDto.BoardId;
            existingSales.GradeId = salesDto.GradeId;
            existingSales.GradeDuringRegistration = salesDto.GradeId;
            existingSales.BoardDuringRegistration = salesDto.BoardId;
            existingSales.ModifiedBy = salesDto.CreatedBy; // Assuming CreatedBy in DTO is used as ModifiedBy for updates
            existingSales.ModifiedDate = DateTime.UtcNow;

            // Update Student if provided
            if (salesDto.Student != null)
            {
                await UpdateStudentAsync(existingSales.StudentId.Value, salesDto.Student, salesDto.CreatedBy);
            }

            if (salesDto.Student != null)
            {
                await UpdateUserInfo(existingSales.StudentId.Value, salesDto.Student, salesDto.CreatedBy);
            }


            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            await _dbContext.Entry(existingSales).ReloadAsync();

            salesDto.Id = existingSales.Id;
            response.Message = "Student information updated successfully.";
            response.Succeeded = true;
            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            // throw;
            response.Message = "Error occured while updating student information.";
            response.Succeeded = false;
            return response;
        }
    }

    public async Task<Response<bool>> UpdateStudentAdditionalInfo(SalesRequestDto salesDto)
    {
        Response<bool> response = new Response<bool>();
        if (string.IsNullOrWhiteSpace(salesDto.Student.Id.ToString()))
        {
            throw new ArgumentException("Invalid student ID", nameof(salesDto.Student.Id));
        }

        if (salesDto == null)
        {
            throw new ArgumentNullException(nameof(salesDto));
        }

        if (string.IsNullOrWhiteSpace(salesDto.CreatedBy.ToString()))
        {
            throw new ArgumentException("ModifiedBy cannot be null or empty", nameof(salesDto.CreatedBy));
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var existingSales = await _dbContext.Sales
                .Include(s => s.SalesDetails)
                .FirstOrDefaultAsync(s => s.StudentId == salesDto.Student.Id);

            if (existingSales == null)
            {
                throw new KeyNotFoundException($"Sales record for student ID {salesDto.Student.Id} not found.");
            }

            // Update Sales properties
            existingSales.PreviousBoardId = salesDto.PreviousBoardId;
            existingSales.LevelOfDemonstration = salesDto.LevelOfDemonstration;
            existingSales.GenderPreference = salesDto.GenderPreference;
            existingSales.TutorPreference = salesDto.TutorPreference;
            existingSales.CustomerConnectedDate = salesDto.CustomerConnectedDate;
            existingSales.StudentCurrentLocationAndSchool = salesDto.Student.StudentCurrentLocationAndSchool;
            existingSales.ParentsInterestedLevel = salesDto.ParentsInterestedLevel;
            existingSales.ModifiedBy = salesDto.CreatedBy;
            existingSales.ModifiedDate = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            await _dbContext.Entry(existingSales).ReloadAsync();

            salesDto.Id = existingSales.Id;
            response.Message = "Student additional information updated successfully.";
            response.Succeeded = true;
            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            // throw;
            response.Message = "Error occured while updating student information.";
            response.Succeeded = false;
            return response;
        }
    }

    public async Task<Response<bool>> UpdateCourse(CourseRequestDto input)
    {
        Response<bool> response = new Response<bool>();
        var details = _dbContext.SalesDetails.Where(s => s.Id == input.Id).FirstOrDefault();
        if (details == null)
        {
            response.Succeeded = false;
            response.Message = "Course Not found";
            return response;
        }

        details.SubjectCode = input.SubjectCode;
        details.AuthorBookDetails = input.AuthorBookDetails;
        details.NoOfSessionPerWeek = input.NoOfSessionPerWeek;
        details.DemoDate = input.DemoDate?.Date;
        details.IsPaidDemo = input.IsPaidDemo;
        details.Coordinator = input.Coordinator;
        // Roles that cannot see the payment (shown as ***) do not send it: keep the stored amount.
        if (input.ParentPayment.HasValue) details.ParentPayment = input.ParentPayment.Value;
        details.ModifiedBy = input.CreatedBy;
        details.ModifiedDate = DateTime.UtcNow;

        _dbContext.SalesDetails.Update(details);
        _dbContext.SaveChanges();

        response.Message = "Course details updated successfully.";
        response.Succeeded = true;
        response.Data = true;
        return response;
    }

    private async Task UpdateUserInfo(Guid value, StudentRequestDto student, Guid createdBy)
    {
        try
        {
            var studentUserId = _dbContext.Student.Where(s => s.Id == student.Id).FirstOrDefault().UserId;
            if (student.Id == null)
            {
                throw new KeyNotFoundException($"Sales with ID {student.Id} not found.");
            }

            var existingUser = await _dbContext.User.FirstOrDefaultAsync(u => u.Id == studentUserId);

            if (existingUser != null)
            {
                existingUser.FirstName = student.FirstName;
                existingUser.LastName = student.LastName;
                existingUser.FullName = $"{student.FirstName} {student.LastName}";
                existingUser.Phone = student.MobileNumber;
                existingUser.DOB = student.DOB;
                existingUser.ModifiedBy = student.CreatedBy;
                existingUser.ModifiedDate = DateTime.UtcNow;

                _dbContext.User.Update(existingUser);
            }
        }
        catch (Exception)
        {
            throw;
        }
    }

    #endregion
}

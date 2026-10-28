using Common;
using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Vml.Office;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Security.AccessControl;
using System.Text;
using System.Threading.Tasks;
using System.Transactions;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class TutorRepository : GenericRepository<Tutor>, ITutorRepository
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly string _connectionString;
        public TutorRepository(ApplicationDbContext dbContext, IPasswordHasher<User> passwordHasher, IConfiguration configuration) : base(dbContext)
        {
            _dbContext = dbContext;
            _passwordHasher = passwordHasher;
            _connectionString = configuration.GetConnectionString("TCTDb");
        }

        public async Task<Response<TutorRequestDto>> AddTutor(TutorRequestDto input)
        {
            Guid tutorId = Guid.Empty;
            Guid userId = Guid.Empty;
            //Response<UserDTO> response = new Response<UserDTO>();
            var createdBy = input.CreatedBy;
            if (string.IsNullOrWhiteSpace(createdBy.ToString()))
            {
                throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
            }

            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var totalUser = _dbContext.User.Count() + 1;
                var code = Util.GetNextNumber(totalUser);

                var userType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 10002/*Tutor*/).FirstOrDefault();
                var designationType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 70002/*Tutor*/).FirstOrDefault();
                input.Location = "Chennai";

                var _user = _dbContext.User.Where(s => s.Id == input.Id).FirstOrDefault();
                if (_user != null)
                {
                    _user.Phone = input.Phone;
                    _user.AlternatePhone = input.AlternatePhone;
                    _user.DOB = input.DOB;
                    _user.FirstName = input.FirstName;
                    _user.FullName = $"{input.FirstName} {input.LastName}";
                    _user.LastName = input.LastName;
                    _user.Gender = input.Gender;
                    _user.Email = input.Email;
                    _user.DesignationId = input.DesignationId;
                    _user.ManagerId = input.ManagerId;
                    _user.Location = input.Location;
                    _user.UserCode = _user.UserCode;
                    _user.IsActive = true;
                    _user.IsSystemUser = input.IsSystemUser;
                    _user.IsAdminUser = input.IsAdminUser;
                    _user.ModifiedDate = DateTime.UtcNow;
                    _user.ModifiedBy = input.CreatedBy;
                    _dbContext.Update(_user);
                }
                else
                {
                    _user = new User()
                    {
                        UserType = userType?.Id,
                        Id = input.Id,
                        FirstName = input.FirstName,
                        FullName = $"{input.FirstName} {input.LastName}",
                        LastName = input.LastName,
                        JoiningDate = input.JoiningDate,
                        LastWorkingDate = input.LastWorkingDate,
                        Email = input.Email,
                        //PasswordHash = input.PasswordHash,
                        Phone = input.Phone,
                        AlternatePhone = input.AlternatePhone,
                        DOB = input.DOB,
                        Gender = input.Gender,
                        DesignationId = designationType?.Id,
                        EmailConfirmed = input.EmailConfirmed,
                        LastLogin = input.LastLogin,
                        ManagerId = input.ManagerId,
                        Location = input.Location,
                        UserCode = $"TUT{code}",
                        IsActive = true,
                        IsSystemUser = input.IsSystemUser,
                        IsAdminUser = input.IsAdminUser,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.UtcNow,
                    };
                    var plainPasswordForTutor = TCT.LMS.Application.Common.PasswordGenerator.Generate();
                    _user.PasswordHash = _passwordHasher.HashPassword(_user, plainPasswordForTutor);
                    input.GeneratedPassword = plainPasswordForTutor;
                    _dbContext.Add(_user);
                }
                userId = _user.Id;
                //response.Data.Id = userId;
                //response.Data.IsSystemUser = false;
                await _dbContext.SaveChangesAsync();

                var userRole = _dbContext.UserRole.Where(r => r.UserId == userId && r.IsActive == true).FirstOrDefault();
                if (userRole is null)
                {
                    var _role = _dbContext.Roles.Where(s => s.Id == (int)UserRoleEnum.Tutor/*Turor*/).FirstOrDefault();
                    int? roleId = _role?.Id;
                    var userAssignedRole = new UserRole
                    {
                        RoleId = roleId.Value,
                        UserId = userId,
                        CreatedBy = input.CreatedBy,
                        CreatedDate = DateTime.UtcNow,
                        IsActive = true,
                    };
                    _dbContext.Add(userAssignedRole);
                    await _dbContext.SaveChangesAsync();
                }

                var _tutor = _dbContext.Tutor.Where(s => s.UserId == input.Id).FirstOrDefault();
                if (_tutor == null)
                {
                    var tutor = new Tutor()
                    {
                        Id = Guid.NewGuid(),
                        UserId = _user.Id,
                        IsActive = true,
                        CreatedBy = input.CreatedBy,
                        CreatedDate = DateTime.UtcNow,
                    };
                    _dbContext.Add(tutor);
                    await _dbContext.SaveChangesAsync();
                    tutorId = tutor.Id;
                }
                else
                {
                    tutorId = _tutor.Id;
                }

                var _address = input.Address;
                if (_address != null)
                {
                    var addrId = (_address.Id == Guid.Empty || _address.Id == null) ? Guid.NewGuid() : _address.Id;
                    var address = new AddressRequestDto
                    {
                        Id = addrId,
                        UserId = userId,
                        AddressLine1 = _address.AddressLine1,
                        AddressLine2 = _address.AddressLine2,
                        AddressLine3 = _address.AddressLine3,
                        City = _address.City,
                        State = _address.State,
                        ZipCode = _address.ZipCode,
                        Country = _address.Country,
                        IsPrimary = _address.IsPrimary,
                        IsActive = true,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.UtcNow,
                    };
                    await CreateAddressesAsync(userId, address, createdBy);
                }
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
            var userBasicInfo = new TutorRequestDto
            {
                UserId = userId,
                Id = tutorId,
                FirstName = input.FirstName,
                LastName = input.LastName,
                Email = input.Email,
                IsSystemUser = false,
                GeneratedPassword = input.GeneratedPassword,
            };

            return new Response<TutorRequestDto>
            {
                Data = userBasicInfo,
                Succeeded = true,
                Message = "User added successfully"
            };
        }

        public async Task<Response<TutorCourseDetailsDto>> AddUpdateTutorSkillset(TutorCourseDetailsDto input)
        {
            Response<TutorCourseDetailsDto> response = new Response<TutorCourseDetailsDto>(input);
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // Pages hold either the tutor's User Id or Tutor Id and may send it in either field
                // (GetTutorSkillset resolves the tutor by either id), so match each id against both.
                var tutorKeys = new[] { input.UserId ?? Guid.Empty, input.TutorId }.Where(id => id != Guid.Empty).ToList();
                var tutor = _dbContext.Tutor.SingleOrDefault(s => tutorKeys.Contains(s.UserId) || tutorKeys.Contains(s.Id));
                if (tutor == null)
                {
                    throw new Exception($"Tutor details not found, User Id:{input.UserId}");
                }

                var skillset = _dbContext.TutorDetails.Where(s => s.TutorId == tutor.Id && s.BoardId == input.BoardId && s.GradeId == input.GradeId && s.IsActive == true).ToList();

                Guid? gradeMappingId = _dbContext.Type_Code.Find(input.GradeId)?.MappingId;
                var existingSubjectIds = skillset.Select(s => s.SubjectId).ToHashSet();
                var requestedSubjectIds = (input.SubjectIds ?? Enumerable.Empty<Guid>()).ToHashSet();
                // Add (no row Id) only adds subjects and keeps the tutor's existing skills.
                // Edit (row Id) replaces only that row when its board, grade or subject changed.
                if (input.Id != Guid.Empty)
                {
                    var editedSkill = _dbContext.TutorDetails.FirstOrDefault(s => s.Id == input.Id && s.TutorId == tutor.Id && s.IsActive == true);
                    if (editedSkill != null &&
                        !(editedSkill.BoardId == input.BoardId && editedSkill.GradeId == input.GradeId && requestedSubjectIds.Contains(editedSkill.SubjectId)))
                    {
                        editedSkill.IsActive = false;
                        editedSkill.ModifiedBy = input.LoggedInUserId;
                        editedSkill.ModifiedDate = DateTime.UtcNow;
                    }
                }
                foreach (var subjectId in requestedSubjectIds)
                {
                    if (!existingSubjectIds.Contains(subjectId))
                    {
                        var tutorCourseDetails = new TutorDetails
                        {
                            IsActive = true,
                            TutorId = tutor.Id,
                            BoardId = input.BoardId,
                            SubjectId = subjectId,
                            GradeId = input.GradeId,
                            GradeGroupId = gradeMappingId,
                            CreatedBy = input.LoggedInUserId,
                            CreatedDate = DateTime.UtcNow
                        };
                        _dbContext.Add(tutorCourseDetails);
                    }
                }
                response.Succeeded = true;
                await _dbContext.SaveChangesAsync();
                transaction.Commit();
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                await transaction.RollbackAsync();
                throw;
            }
            return response;
        }

        public async Task<Response<List<TutorRequestDto>>> GetAllTutor()
        {
            Response<List<TutorRequestDto>> response = new Response<List<TutorRequestDto>>();
            response.Data = new List<TutorRequestDto>();
            //var userType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 10002/*Tutor*/).FirstOrDefault();
            //var users = await _dbContext.User.Where(u => u.UserType == userType.Id && u.IsActive).OrderByDescending(s => s.CreatedDate).ToListAsync();


            var tutors = (from u in _dbContext.User
                          join t in _dbContext.Tutor on u.Id equals t.UserId
                          join ur in _dbContext.UserRole on u.Id equals ur.UserId
                          join r in _dbContext.Roles on ur.RoleId equals r.Id
                          where u.IsActive == true &&
                                ur.RoleId == (int)UserRoleEnum.Tutor
                          select new TutorRequestDto()
                          {
                              UserCode = u.UserCode,
                              Id = u.Id,
                              TutorId = t.Id,
                              UserId = u.Id,
                              FullName = u.FullName,
                              FirstName = u.FirstName,
                              IsSystemUser = u.IsSystemUser,
                              IsActive = u.IsActive,
                              IsAdminUser = u.IsAdminUser,
                              AlternatePhone = u.AlternatePhone,
                              DesignationId = u.DesignationId,
                              DOB = u.DOB,
                              ManagerId = u.ManagerId,
                              Email = u.Email,
                              Gender = u.Gender,
                              Location = u.Location,
                              JoiningDate = u.JoiningDate,
                              CreatedDate = u.CreatedDate,
                              CreatedBy = u.CreatedBy,
                              RoleId = ur.RoleId,
                              Role = r.RoleName
                          })
             .Distinct()
             .AsEnumerable();

            response.Data.AddRange(tutors);

            //foreach (var result in users)
            //{
            //    var roleEntity = await _dbContext.UserRole
            //                                     .Where(u => u.UserId == result.Id && u.IsActive)
            //                                     .FirstOrDefaultAsync();
            //    var roleId = roleEntity?.RoleId;

            //    var roleName = roleId.HasValue
            //        ? await _dbContext.Roles
            //                          .Where(r => r.Id == roleId && r.IsActive)
            //                          .Select(r => r.RoleName)
            //                          .FirstOrDefaultAsync()
            //        : null;
            //    //var address = _dbContext.Address.Where(s=>s.UserId == result.Id).FirstOrDefault();
            //    //var _address = new AddressRequestDto() { 

            //    //};
            //    var tutor = _dbContext.Tutor.Where(s => s.UserId == result.Id).FirstOrDefault();
            //    var tutorDTO = new TutorRequestDto
            //    {
            //        UserCode = result.UserCode,
            //        Id = result.Id,
            //        TutorId = tutor?.Id,
            //        FullName = result.FullName,
            //        Phone = result.Phone,
            //        FirstName = result.FirstName,
            //        IsSystemUser = result.IsSystemUser,
            //        IsActive = result.IsActive,
            //        IsAdminUser = result.IsAdminUser,
            //        AlternatePhone = result.AlternatePhone,
            //        DesignationId = result.DesignationId,
            //        DOB = result.DOB,
            //        ManagerId = result.ManagerId,
            //        Email = result.Email,
            //        Gender = result.Gender,
            //        Location = result.Location,
            //        JoiningDate = result.JoiningDate,
            //        CreatedDate = result.CreatedDate,
            //        CreatedBy = result.CreatedBy,
            //        RoleId = roleId,
            //        Role = roleName
            //    };
            //    response.Data.Add(tutorDTO);
            //}
            return response;
        }

        public async Task<Response<TutorRequestDto>> GetTutorById(Guid id)
        {
            Response<TutorRequestDto> response = new Response<TutorRequestDto>();
            response.Data = new TutorRequestDto();
            // Profile links across the application historically pass either the
            // Tutor entity id or its associated User id. Support both safely.
            var tutor = await _dbContext.Tutor
                .FirstOrDefaultAsync(item => item.Id == id || item.UserId == id);

            if (tutor == null)
            {
                response.Succeeded = false;
                response.Message = "Tutor profile not found.";
                return response;
            }

            var result = await _dbContext.User.FindAsync(tutor.UserId);
            if (result == null)
            {
                response.Succeeded = false;
                response.Message = "The user account linked to this tutor was not found.";
                return response;
            }

            var address = await _dbContext.Address
                .FirstOrDefaultAsync(s => s.UserId == result.Id && s.IsActive);

            if (result != null)
            {
                var tutorDetails = _dbContext.TutorDetails.Where(s => s.TutorId == tutor.Id && s.IsActive == true).ToList();
                var typeCode = _dbContext.Type_Code.Where(s => s.Id == result.DesignationId).FirstOrDefault();
                var _role = _dbContext.UserRole.Where(s => s.UserId == result.Id).FirstOrDefault();
                TutorRequestDto tutorDTO = new TutorRequestDto()
                {
                    UserType = result.UserType,
                    Id = result.Id,
                    FirstName = result.FirstName,
                    FullName = $"{result.FirstName} {result.LastName}",
                    LastName = result.LastName,
                    UserCode = result.UserCode,
                    JoiningDate = result.JoiningDate,
                    LastWorkingDate = result.LastWorkingDate,
                    DesignationName = typeCode?.TypeCodeName,
                    RoleId = _role?.RoleId,
                    Email = result.Email,
                    Phone = result.Phone,
                    AlternatePhone = result.AlternatePhone,
                    DOB = result.DOB,
                    Gender = result.Gender,
                    DesignationId = result.DesignationId,
                    EmailConfirmed = result.EmailConfirmed,
                    LastLogin = result.LastLogin,
                    ManagerId = result.ManagerId,
                    Location = result.Location,
                    TutorDetails = tutorDetails,
                };
                if (address != null)
                {
                    AddressRequestDto addressRequestDto = new AddressRequestDto()
                    {
                        State = address.State,
                        UserId = address.UserId,
                        AddressLine1 = address.AddressLine1,
                        AddressLine2 = address.AddressLine2,
                        AddressLine3 = address.AddressLine3,
                        Id = address.Id,
                        City = address.City,
                        Country = address.Country,
                        ZipCode = address.ZipCode
                    };
                    tutorDTO.Address = addressRequestDto;
                }
                response.Data = tutorDTO;
                response.Succeeded = true;
            }
            return response;
        }

        public async Task<Response<List<TutorCourseDetailsDto>>> GetTutorSkillset(Guid tutorId)
        {
            Response<List<TutorCourseDetailsDto>> tutorCourseDetailsDtos = new Response<List<TutorCourseDetailsDto>>();
            try
            {
                var result1 = await (from t in _dbContext.Tutor
                                     join td in _dbContext.TutorDetails on t.Id equals td.TutorId
                                     join u in _dbContext.User on t.UserId equals u.Id
                                     join tcb in _dbContext.Type_Code on td.BoardId equals tcb.Id
                                     join tcg in _dbContext.Type_Code on td.GradeId equals tcg.Id
                                     join tcs in _dbContext.Type_Code on td.SubjectId equals tcs.Id
                                     where (t.UserId == tutorId || t.Id == tutorId) && td.IsActive
                                     select new TutorCourseDetailsDto()
                                     {
                                         BoardName = tcb.TypeCodeName,
                                         BoardId = tcb.Id,
                                         TutorPayment = td.TutorPayment,
                                         GradeName = tcg.TypeCodeName,
                                         GradeId = tcg.Id,
                                         SubjectName = tcs.TypeCodeName,
                                         SubjectId = tcs.Id,
                                         TutorId = td.TutorId,
                                         UserId = u.Id,
                                         Id = td.Id
                                     }).ToListAsync();
                tutorCourseDetailsDtos.Data = new List<TutorCourseDetailsDto>();

                foreach (var item in result1)
                {
                    var salesQuery = from s in _dbContext.Sales
                                     join sd in _dbContext.SalesDetails on s.Id equals sd.SalesId
                                     where s.BoardId == item.BoardId
                                           && s.GradeId == item.GradeId
                                           && sd.SubjectId == item.SubjectId
                                           && (sd.TutorId == item.TutorId || sd.TutorId == item.UserId)
                                     select sd;

                    item.StudentCount = salesQuery.Count();

                    if (item.TutorPayment == null || item.TutorPayment == 0)
                    {
                        item.TutorPayment = salesQuery
                            .Where(sd => sd.TutorPayment > 0)
                            .OrderByDescending(sd => sd.ModifiedDate)
                            .Select(sd => sd.TutorPayment)
                            .FirstOrDefault();
                    }

                    tutorCourseDetailsDtos.Data.Add(item);
                }

            }
            catch (Exception ex)
            {
                throw;
            }
            return tutorCourseDetailsDtos;
        }

        private async Task CreateAddressesAsync(Guid userId, AddressRequestDto addresses, Guid createdBy)
        {
            try
            {
                if (userId == Guid.Empty)
                {
                    throw new ArgumentException("Invalid user ID", nameof(userId));
                }

                if (string.IsNullOrWhiteSpace(createdBy.ToString()))
                {
                    throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
                }
                if (addresses == null)
                {
                    throw new ArgumentNullException(nameof(addresses), "Address cannot be null");
                }
                var _address = await _dbContext.FindAsync<Address>(addresses.Id);
                if (_address != null)
                {
                    _address.City = addresses.City;
                    _address.State = addresses.State;
                    _address.ZipCode = addresses.ZipCode;
                    _address.Country = addresses.Country;
                    _address.AddressLine1 = addresses.AddressLine1;
                    _address.AddressLine2 = addresses.AddressLine2;
                    _address.AddressLine3 = addresses.AddressLine3;
                    _address.IsActive = true;
                    _address.IsPrimary = true;
                    _address.ModifiedBy = createdBy;
                    _address.ModifiedDate = DateTime.UtcNow;
                    _dbContext.Update(_address);
                    await _dbContext.SaveChangesAsync();
                }
                else
                {
                    var address = new Address
                    {
                        Id = addresses.Id,
                        UserId = userId,
                        City = addresses.City,
                        State = addresses.State,
                        ZipCode = addresses.ZipCode,
                        Country = addresses.Country,
                        AddressLine1 = addresses.AddressLine1,
                        AddressLine2 = addresses.AddressLine2,
                        AddressLine3 = addresses.AddressLine3,
                        IsActive = true,
                        IsPrimary = true,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.UtcNow
                    };

                    _dbContext.Add(address);
                    await _dbContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
            }
        }

        public async Task<Response<List<TutorRequestDto>>> GetAllSubmittedAttendanceTutors()
        {
            Response<List<TutorRequestDto>> response = new Response<List<TutorRequestDto>>();
            response.Data = new List<TutorRequestDto>();

            // Define the list of TypeCodeValues to filter
            var typeCodeValues = new List<int> { 20015, 20016, 20018, 20019, 20020, 20021, 20022, 20023 };

            var users = (from u in _dbContext.User
                         join t in _dbContext.Tutor on u.Id equals t.UserId
                         join s in _dbContext.Schedule on t.UserId equals s.TutorId
                         join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                         join c in _dbContext.Type_Code on d.TutorScheduleStatus equals c.Id
                         where u.IsActive == true
                               && t.IsActive == true
                               && s.IsActive == true
                               && d.IsActive == true
                               && (d.IsTutorPresent == false || d.IsTutorPresent == null)
                               && c.IsActive == true
                               && typeCodeValues.Contains(c.TypeCodeValue) // Check if TypeCodeValue is in the list
                         select u).Distinct().ToList();

            foreach (var result in users)
            {
                var roleEntity = await _dbContext.UserRole
                                                 .Where(u => u.UserId == result.Id && u.IsActive)
                                                 .FirstOrDefaultAsync();
                var roleId = roleEntity?.RoleId;

                var roleName = roleId.HasValue
                    ? await _dbContext.Roles
                                      .Where(r => r.Id == roleId && r.IsActive)
                                      .Select(r => r.RoleName)
                                      .FirstOrDefaultAsync()
                    : null;

                var tutor = _dbContext.Tutor.Where(s => s.UserId == result.Id).FirstOrDefault();
                var tutorDTO = new TutorRequestDto
                {
                    UserCode = result.UserCode,
                    Id = result.Id,
                    TutorId = tutor?.Id,
                    FullName = result.FullName,
                    Phone = result.Phone,
                    FirstName = result.FirstName,
                    IsSystemUser = result.IsSystemUser,
                    IsActive = result.IsActive,
                    IsAdminUser = result.IsAdminUser,
                    AlternatePhone = result.AlternatePhone,
                    DesignationId = result.DesignationId,
                    DOB = result.DOB,
                    ManagerId = result.ManagerId,
                    Email = result.Email,
                    Gender = result.Gender,
                    Location = result.Location,
                    JoiningDate = result.JoiningDate,
                    CreatedDate = result.CreatedDate,
                    CreatedBy = result.CreatedBy,
                    RoleId = roleId,
                    Role = roleName
                };
                response.Data.Add(tutorDTO);
            }
            return response;
        }

        public async Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetBankDetailsByTutorId(Guid id)
        {
            Response<List<TutorBankAndPaymentDetailsDto>> response = new Response<List<TutorBankAndPaymentDetailsDto>>();
            var tutor = _dbContext.Tutor.Where(t => t.UserId == id).FirstOrDefault();
            if (tutor == null)
            {
                response.Message = "Tutor not found";
                return response;
            }

            bool hasBankDetails = await _dbContext.IndianTutorBankDetails.AnyAsync(t => t.TutorID == id);
            if (hasBankDetails)
            {
                var tutorBankDetails = await _dbContext.IndianTutorBankDetails.Where(t => t.TutorID == id).ToListAsync();

                response.Data = tutorBankDetails.Select(entity => new TutorBankAndPaymentDetailsDto
                {
                    AccountNumber = entity.AccountNumber,
                    BankName = entity.BankName,
                    BranchName = entity.BranchName,
                    Id = entity.Id,
                    IFSCCode = entity.IFSCCode,
                    UpiID = entity.UpiID,
                    TutorID = entity.TutorID,
                    IsActive = entity.IsActive,
                    SwiftCode = entity.SwiftCode,
                    IBANNumber = entity.IBANNumber,
                }).ToList();
            }
            return response;
        }

        public async Task<Response<List<TutorBankAndPaymentDetailsDto>>> GetPaymentDetailsByTutorId(Guid id)
        {
            Response<List<TutorBankAndPaymentDetailsDto>> response = new Response<List<TutorBankAndPaymentDetailsDto>>();
            var tutor = _dbContext.Tutor.Where(t => t.UserId == id).FirstOrDefault();
            if (tutor == null)
            {
                response.Message = "Tutor not found";
                return response;
            }
            var tutorBankDetails = await _dbContext.ForeignTutorPaymentDetails.Where(t => t.TutorID == id).ToListAsync();

            response.Data = tutorBankDetails.Select(entity => new TutorBankAndPaymentDetailsDto
            {
                Id = entity.Id,
                PaymentIdentifier = entity.PaymentIdentifier,
                TutorID = entity.TutorID,
                IsActive = entity.IsActive,
            }).ToList();

            return response;
        }
        public async Task<Response<List<TutorResponseDto>>> GetTutorsByAvailability(Guid studentId, Guid salesId, Guid subjectId)
        {
            try
            {
                // 1. Get user type IDs for Student and Tutor
                var userTypes = await _dbContext.TypeGroup
                    .Join(_dbContext.Type_Code,
                          tg => tg.Id,
                          tc => tc.TypeGroupId,
                          (tg, tc) => new { tg.TypeGroupCode, tc.TypeCodeValue, tc.Id })
                    .Where(x => x.TypeGroupCode == 100)
                    .ToListAsync();

                var userTypeStudentId = userTypes.FirstOrDefault(x => x.TypeCodeValue == (int)UserType.Student)?.Id;
                var userTypeTutorId = userTypes.FirstOrDefault(x => x.TypeCodeValue == (int)UserType.Tutor)?.Id;

                if (userTypeStudentId == null || userTypeTutorId == null)
                {
                    return new Response<List<TutorResponseDto>>
                    {
                        Succeeded = false,
                        Message = "User types not configured properly."
                    };
                }

                //var tutorSlots = await (from t in _dbContext.Tutor
                //                    join u in _dbContext.User on t.UserId equals u.Id
                //                    join d in _dbContext.TutorDetails on t.Id equals d.TutorId
                //                    join a in _dbContext.UserAvailability on u.Id equals a.UserId 
                //                    where d.SubjectId == subjectId && a.IsActive == true &&
                //                          d.IsActive == true &&
                //                          _dbContext.Sales.Any(s =>
                //                              s.Id == salesId &&
                //                              s.BoardId == d.BoardId &&
                //                              s.GradeId == d.GradeId)
                //                    select a)
                //    .Distinct()
                //    .ToListAsync();

                // 2. Get active availability slots
                var tutorSlots = await _dbContext.UserAvailability
                    .Where(s => s.UserType != userTypeStudentId && s.IsActive)
                    .ToListAsync();

                var studentSlots = await _dbContext.UserAvailability
                    .Where(s => s.UserId == studentId && s.IsActive)
                    .ToListAsync();

                // 3. Calculate matching time slots between student and tutors
                var matchedTutors = tutorSlots
                    .SelectMany(tutor => studentSlots
                        .Where(student => tutor.DayOfWeek == student.DayOfWeek)
                        .Select(student =>
                        {
                            var overlapStart = Max(student.StartTime.TimeOfDay, tutor.StartTime.TimeOfDay);
                            var overlapEnd = Min(student.EndTime.TimeOfDay, tutor.EndTime.TimeOfDay);
                            bool isAvailable = overlapEnd > overlapStart;

                            return new TutorAvailabilityResult
                            {
                                StudentId = student.UserId,
                                TutorId = tutor.UserId,
                                DayOfWeek = tutor.DayOfWeek,
                                IsAvailable = isAvailable
                            };
                        }))
                    .Where(r => r.IsAvailable)
                    .GroupBy(r => r.TutorId)
                    .Select(g => g.First()) // Take only one entry per tutor
                    .ToList();

                var availableTutorIds = matchedTutors.Select(m => m.TutorId).ToHashSet();

                // 4. Get all tutors
                //var tutors = await (from u in _dbContext.User
                //                    join t in _dbContext.Tutor on u.Id equals t.UserId
                //                    where u.IsActive
                //                    select new TutorResponseDto
                //                    {
                //                        UserId = u.Id,
                //                        FullName = u.FullName,
                //                        JoiningDate = u.JoiningDate,
                //                        TutorId = t.Id,
                //                        IsAvailable = false // default
                //                    }).ToListAsync();

                var tutors = await (from t in _dbContext.Tutor
                                    join u in _dbContext.User on t.UserId equals u.Id
                                    join d in _dbContext.TutorDetails on t.Id equals d.TutorId
                                    where d.SubjectId == subjectId &&
                                          d.IsActive == true
                                          && _dbContext.Sales.Any(s =>
                                              s.Id == salesId &&
                                              s.BoardId == d.BoardId &&
                                              s.GradeId == d.GradeId)
                                    select new TutorResponseDto
                                    {
                                        UserId = u.Id,
                                        FullName = u.FullName,
                                        JoiningDate = u.JoiningDate,
                                        TutorId = t.Id,
                                        IsAvailable = false
                                    }).ToListAsync();

                // 5. Mark matched tutors as available
                tutors.ForEach(t =>
                {
                    t.IsAvailable = availableTutorIds.Contains(t.UserId);
                });

                return new Response<List<TutorResponseDto>>
                {
                    Succeeded = true,
                    Data = tutors
                };
            }
            catch (Exception)
            {
                throw; // Or ideally, log and return failed response
            }
        }
        public async Task<Response<bool>> UpdateTutorPayment(UpdateTutorPaymentDto input)
        {
            Response<bool> response = new Response<bool>();
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                response.Succeeded = true;
                var tutorDetails = await _dbContext.TutorDetails.FindAsync(input.Id);
                if (tutorDetails != null)
                {
                    tutorDetails.TutorPayment = input.Payment;
                    tutorDetails.ModifiedBy = input.UserId;
                    tutorDetails.ModifiedDate = DateTime.UtcNow;
                    _dbContext.TutorDetails.Update(tutorDetails);
                    await _dbContext.SaveChangesAsync();
                    transaction.Commit();
                }
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                throw;

            }
            return response;
        }

        private static TimeSpan Max(TimeSpan a, TimeSpan b) => a > b ? a : b;
        private static TimeSpan Min(TimeSpan a, TimeSpan b) => a < b ? a : b;

        public async Task<Response<List<TutorResponsesDto>>> GetAllTutorDetails()
        {
            Response<List<TutorResponsesDto>> response = new Response<List<TutorResponsesDto>>();
            response.Data = new List<TutorResponsesDto>();
            //var userType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 10002/*Tutor*/).FirstOrDefault();
            //var users = await _dbContext.User.Where(u => u.UserType == userType.Id && u.IsActive).OrderByDescending(s => s.CreatedDate).ToListAsync();


            var tutorsDetails = (from u in _dbContext.User
                                 join t in _dbContext.Tutor on u.Id equals t.UserId
                                 join td in _dbContext.TutorDetails on t.Id equals td.TutorId
                                 join tcb in _dbContext.Type_Code on td.BoardId equals tcb.Id
                                 join tcg in _dbContext.Type_Code on td.GradeId equals tcg.Id
                                 join tcs in _dbContext.Type_Code on td.SubjectId equals tcs.Id
                                 //join a in _dbContext.Tut on t.Id equals a.TutorId into tcd
                                 //where  td.IsActive
                                 where (t.UserId == u.Id && td.IsActive)

                                 select new TutorResponsesDto()
                                 {
                                     //Id = u.Id,
                                     TutorId = t.Id,
                                     UserId = u.Id,
                                     //IsActive = u.IsActive,
                                     Email = u.Email,
                                     BoardId = tcb.Id,
                                     BoardName = tcb.TypeCodeName,
                                     GradeId = tcg.Id,
                                     GradeName = tcg.TypeCodeName,
                                     SubjectId = tcs.Id,
                                     SubjectName = tcs.TypeCodeName,
                                     TutorPayment = td.TutorPayment,
                                     TutorName = u.FullName,
                                 })
             .Distinct()
             .AsEnumerable();

            response.Data.AddRange(tutorsDetails);


            return response;
        }

        public async Task<Response<List<TutorResponsesDto>>> GetAllTutorDetailsWithFilter(string boardIds, string gradeIds, string gradeGroupIds, string subjectIds, string search, int pageSize, int pageNumber)
        {
            Response<List<TutorResponsesDto>> response = new Response<List<TutorResponsesDto>>();
            response.Data = new List<TutorResponsesDto>();

            try
            {
                var today = DateTime.Today;
                var startDate = new DateTime(today.Year, today.Month, 1);
                var endDate = new DateTime(today.Year, today.Month, 1).AddMonths(2).AddDays(-1); // End of next month
                // Convert comma-separated strings to lists
                var boardIdList = string.IsNullOrEmpty(boardIds) ? new List<string>() : boardIds.Split(',').ToList();
                var gradeIdList = string.IsNullOrEmpty(gradeIds) ? new List<string>() : gradeIds.Split(',').ToList();
                var subjectIdList = string.IsNullOrEmpty(subjectIds) ? new List<string>() : subjectIds.Split(',').ToList();
                var _gradeGroupIds = string.IsNullOrEmpty(gradeGroupIds) ? new List<string>() : gradeGroupIds.Split(',').ToList();
                var tutorsQuery = from u in _dbContext.User
                                  join t in _dbContext.Tutor on u.Id equals t.UserId
                                  join td in _dbContext.TutorDetails on t.Id equals td.TutorId
                                  join tcb in _dbContext.Type_Code on td.BoardId equals tcb.Id
                                  join tcg in _dbContext.Type_Code on td.GradeId equals tcg.Id
                                  join tcs in _dbContext.Type_Code on td.SubjectId equals tcs.Id
                                  where td.IsActive
                                  select new TutorResponsesDto
                                  {
                                      TutorId = t.Id,
                                      UserId = u.Id,
                                      Email = u.Email,
                                      BoardId = tcb.Id,
                                      BoardName = tcb.TypeCodeName,
                                      GradeId = tcg.Id,
                                      GradeName = tcg.TypeCodeName,
                                      SubjectIDAll = tcs.Id,
                                      SubjectId = tcs.Id,
                                      SubjectName = tcs.TypeCodeName,
                                      TutorPayment = td.TutorPayment,
                                      GradeGroupId = td.GradeGroupId,
                                      TutorName = u.FullName
                                  };



                // Apply filters
                if (boardIdList.Any())
                    tutorsQuery = tutorsQuery.Where(t => boardIdList.Contains(t.BoardId.ToString()));

                if (gradeIdList.Any())
                    tutorsQuery = tutorsQuery.Where(t => gradeIdList.Contains(t.GradeId.ToString()));

                if (subjectIdList.Any())
                    tutorsQuery = tutorsQuery.Where(t => subjectIdList.Contains(t.SubjectIDAll.ToString()));

                if (_gradeGroupIds.Any())
                {
                    tutorsQuery = tutorsQuery.Where(t => _gradeGroupIds.Contains(t.GradeGroupId.ToString()));
                }

                if (!string.IsNullOrEmpty(search))
                    tutorsQuery = tutorsQuery.Where(t => t.TutorName.Contains(search) || t.Email.Contains(search));

                pageSize = Math.Clamp(pageSize, 1, 50);
                pageNumber = Math.Max(pageNumber, 1);
                response.TotalRecords = await tutorsQuery.CountAsync();

                // Apply pagination before the per-row statistics below. Previously the
                // endpoint calculated several aggregates for every matching tutor row
                // and ignored pageSize, which made opening the filter appear to hang.
                var tutorsQuery1 = await tutorsQuery
                    .AsNoTracking()
                    .OrderBy(t => t.TutorName)
                    .ThenBy(t => t.BoardName)
                    .ThenBy(t => t.GradeName)
                    .ThenBy(t => t.SubjectName)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var typeCodes = new[] { 90012, 90002, 90003, 90004, 90005, 90006, 90001, 90009, 90014 };
                foreach (var t in tutorsQuery1)
                {
                    //if (t.TutorName.ToLower().Contains("kalaivani"))
                    {
                        var availableHoursQuery = await _dbContext.UserAvailability
                            .Where(ua => ua.IsActive && ua.IsRecurring && ua.UserId == t.UserId)
                            .GroupBy(ua => ua.UserId)
                            .Select(g => new
                            {
                                UserId = g.Key,
                                TotalAvailableHours = g.Sum(x => EF.Functions.DateDiffMinute(x.StartTime, x.EndTime)) / 60.0 * 8
                            })
                            .FirstOrDefaultAsync();

                        var result = await (
                                          from scd in _dbContext.ScheduleDetails.AsNoTracking()
                                          join sch in _dbContext.Schedule.AsNoTracking() on scd.ScheduleId equals sch.ScheduleId
                                          join sad in _dbContext.SalesDetails.AsNoTracking() on sch.SalesDetailsId equals sad.Id
                                          join sal in _dbContext.Sales.AsNoTracking() on sad.SalesId equals sal.Id
                                          //join rat in _dbContext.UserClassRating.AsNoTracking() on scd.ScheduleDetailsId equals rat.ReferenceId 
                                          join status in _dbContext.Type_Code on scd.TutorScheduleStatus equals status.Id
                                          where sch.TutorId == t.UserId
                                             && sal.BoardId == t.BoardId
                                             && sal.GradeId == t.GradeId
                                             && sad.SubjectId == t.SubjectId
                                          group new { scd, status } by sch.TutorId into g
                                          select new
                                          {
                                              TutorId = g.Key,
                                              TotalClasses = g.Count(),
                                              CanceledClass = g.Count(x => x.status.TypeCodeValue == 1009002 /*Cancelled*/),
                                              TotalHours = g.Sum(x => EF.Functions.DateDiffMinute(x.scd.StartTime, x.scd.EndTime)) / 60.0
                                          }
                                      ).FirstOrDefaultAsync();

                        var ratingResult = await (
                            from scd in _dbContext.ScheduleDetails.AsNoTracking()
                            join sch in _dbContext.Schedule.AsNoTracking() on scd.ScheduleId equals sch.ScheduleId
                            join sad in _dbContext.SalesDetails.AsNoTracking() on sch.SalesDetailsId equals sad.Id
                            join sal in _dbContext.Sales.AsNoTracking() on sad.SalesId equals sal.Id
                            join rat in _dbContext.UserClassRating.AsNoTracking() on scd.ScheduleDetailsId equals rat.ReferenceId into ratGroup
                            from rat in ratGroup.DefaultIfEmpty() // LEFT JOIN so classes without ratings still appear
                            where sch.TutorId == t.UserId
                               && sal.BoardId == t.BoardId
                               && sal.GradeId == t.GradeId
                               && sad.SubjectId == t.SubjectId
                            group new { scd, rat } by rat.RatedUserId into g   // ✅ group by RatedUserId instead of sch.TutorId
                            select new
                            {
                                AverageRating = g.Where(x => x.rat != null).Average(x => (double?)x.rat.Rating) ?? 0,
                                RatingCount = g.Count(x => x.rat != null)
                            }
                        ).FirstOrDefaultAsync();

                        t.Rating = ratingResult?.AverageRating != null ? Math.Round(ratingResult.AverageRating, 2) : (double?)null;

                        double percentage = 0;

                        if (result != null)
                        {
                            if (availableHoursQuery != null && availableHoursQuery.TotalAvailableHours > 0)
                            {
                                percentage = Math.Round((result.TotalHours / availableHoursQuery.TotalAvailableHours) * 100.0, 2);
                            }
                            t.EngagmentRatio = percentage;

                            t.CancelationRatio = result.TotalClasses == 0 ? null : Math.Round(((double)result.CanceledClass / result.TotalClasses) * 100.0, 2);
                        }

                        var studentCount = _dbContext.TutorStudentAllocations
                                .Join(_dbContext.SalesDetails, tsa => tsa.SalesDetailsId, sd => sd.Id, (tsa, sd) => new { tsa, sd })
                                .Join(_dbContext.Sales, x => x.sd.SalesId, sa => sa.Id, (x, sa) => new { x.tsa, x.sd, sa })
                                .Where(x =>
                                    x.sd.SubjectId == t.SubjectId &&
                                    x.sa.BoardId == t.BoardId &&
                                    x.sa.GradeId == t.GradeId &&
                                    (x.tsa.TutorId == t.UserId || x.tsa.TutorId == t.TutorId)).Count();

                        var query = _dbContext.TutorStudentAllocations
                                 .Join(_dbContext.SalesDetails, tsa => tsa.SalesDetailsId, sd => sd.Id, (tsa, sd) => new { tsa, sd })
                                 .Join(_dbContext.Sales, x => x.sd.SalesId, sa => sa.Id, (x, sa) => new { x.tsa, x.sd, sa })
                                 .Join(_dbContext.TCTNotes, x => x.tsa.Id, n => n.ReferenceId, (x, n) => new { x.tsa, x.sd, x.sa, n })
                                 .Join(_dbContext.Type_Code, x => x.n.ReferenceTypeId, tc => tc.Id, (x, tc) => new { x.tsa, x.sd, x.sa, tc })
                                 .Where(x =>
                                     x.sd.SubjectId == t.SubjectId &&
                                     x.sa.BoardId == t.BoardId &&
                                     x.sa.GradeId == t.GradeId &&
                                     (x.tsa.TutorId == t.UserId || x.tsa.TutorId == t.TutorId));

                        //if (t.TutorName.ToLower().Contains("bala"))
                        {
                            var totalStudents = studentCount;
                            var dropoutCount = query.Count(x => typeCodes.Contains(x.tc.TypeCodeValue));
                            var dropoutRatio = totalStudents == 0 ? 0 : Math.Round(((double)dropoutCount / totalStudents) * 100.0, 2);
                            t.DropOutRatio = dropoutRatio;
                        }
                    }

                    var paymentStats = await _dbContext.TutorStudentAllocations
                        .Join(_dbContext.SalesDetails, tsa => tsa.SalesDetailsId, sd => sd.Id, (tsa, sd) => new { tsa, sd })
                        .Join(_dbContext.Sales, x => x.sd.SalesId, sa => sa.Id, (x, sa) => new { x.tsa, x.sd, sa }).Where(x => x.sd.SubjectId == t.SubjectId && x.sa.BoardId == t.BoardId && x.sa.GradeId == t.GradeId && (x.tsa.TutorId == t.UserId || x.tsa.TutorId == t.TutorId) && x.tsa.IsActive)
                        .GroupBy(x => 1)
                        .Select(g => new
                        {
                            MinPayment = g.Min(x => x.tsa.PaymentAmount),
                            MaxPayment = g.Max(x => x.tsa.PaymentAmount)
                        }).FirstOrDefaultAsync();

                    t.MinPayment = paymentStats?.MinPayment ?? 0;
                    t.MaxPayment = paymentStats?.MaxPayment ?? 0;

                }

                response.Data.AddRange(tutorsQuery1);
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                throw;
            }

            return response;

        }

        public async Task<Response<bool>> DeleteTutorSkillset(Guid id)
        {
            var response = new Response<bool>();
            try
            {
                var skillset = await _dbContext.TutorDetails
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (skillset == null)
                {
                    response.Succeeded = false;
                    response.Message = "Skillset not found.";
                    response.Data = false;
                    return response;
                }

                skillset.IsActive = false;
                skillset.ModifiedDate = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                response.Succeeded = true;
                response.Data = true;
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                response.Message = ex.Message;
                response.Data = false;
            }
            return response;
        }
    }
    public class TutorAvailabilityResult
    {
        public Guid StudentId { get; set; }
        public Guid TutorId { get; set; }
        public string DayOfWeek { get; set; }
        public bool IsAvailable { get; set; }
    }

}

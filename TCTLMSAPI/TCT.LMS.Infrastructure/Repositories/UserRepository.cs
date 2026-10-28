using Common;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Identity.Client;
using System;
using System.Collections.Frozen;
using System.ComponentModel.DataAnnotations;
using System.Data;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.Infrastructure.Common;
using TheChennaiTuitionQA.Models;

namespace TCT.LMS.Infrastructure.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly string _connectionString;
    public UserRepository(ApplicationDbContext dbContext, IPasswordHasher<User> passwordHasher, IConfiguration configuration) : base(dbContext)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _connectionString = configuration.GetConnectionString("TCTDb");
    }

    public async Task<Response<UserDTO>> GetTCTUserById(Guid id)
    {
        Response<UserDTO> response = new Response<UserDTO>();
        var result = await _dbContext.User.FindAsync(id);
        var address = await _dbContext.Address.Where(s => s.UserId == id).FirstOrDefaultAsync();
        if (result != null)
        {
            var typeCode = _dbContext.Type_Code.Where(s => s.Id == result.DesignationId).FirstOrDefault();
            var _role = _dbContext.UserRole.Where(s => s.UserId == result.Id).FirstOrDefault();
            var roleName = _role != null
                ? _dbContext.Roles.Where(r => r.Id == _role.RoleId).Select(r => r.RoleName).FirstOrDefault()
                : null;
            UserDTO userDTO = new UserDTO()
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
                Role = roleName,
                Email = result.Email,
                //PasswordHash = input.PasswordHash,
                Phone = result.Phone,
                AlternatePhone = result.AlternatePhone,
                DOB = result.DOB,
                Gender = result.Gender,
                DesignationId = result.DesignationId,
                EmailConfirmed = result.EmailConfirmed,
                LastLogin = result.LastLogin,
                ManagerId = result.ManagerId,
                Location = result.Location,
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
                userDTO.Address = addressRequestDto;
            }

            response.Data = userDTO;
        }
        return response;
    }

    public async Task<User> GetUserById(Guid id)
    {
        return await _dbContext.User.FindAsync(id);
    }

    public async Task<User> GetActiveUserById(Guid userId)
    {
        return await _dbContext.User
            .Where(u => u.Id == userId && u.IsActive == true)
            .FirstOrDefaultAsync();
    }

    public async Task<User> GetUserByEmail(string email, bool checkEmailConfirmed = false)
    {
        try
        {
            if (checkEmailConfirmed == true)
            {
                // Multiple active accounts can share the same email (e.g. a repeat signup
                // after an earlier one already verified). Prefer the account that still
                // needs confirming — and the newest one among ties — instead of whichever
                // row the DB happens to return first, otherwise a confirmation link can
                // mark an unrelated already-confirmed duplicate as done and leave the
                // account the user is actually trying to verify still unconfirmed.
                var response = await _dbContext.User
                    .Where(u => u.Email.ToLower() == email.ToLower() && u.IsActive == true)
                    .OrderBy(u => u.EmailConfirmed == true)
                    .ThenByDescending(u => u.CreatedDate)
                    .FirstOrDefaultAsync();
                if (response != null)
                {
                    return response;
                }
                throw new ArgumentException("Invalid Email Id.");

            }
            var result = await _dbContext.User.Where(u => u.Email.ToLower() == email.ToLower() && u.IsActive == true).FirstOrDefaultAsync();
            if (result != null)
            {
                if (result.EmailConfirmed != true)
                {
                    throw new ArgumentException("Email verification is not completed");
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            throw;
        }
    }

    public async Task<List<User>> GetUsersByEmail(string email, bool checkEmailConfirmed = false)
    {
        var query = _dbContext.User
            .Where(u => u.Email.ToLower() == email.ToLower() && u.IsActive == true);

        var result = await query.ToListAsync();

        if (checkEmailConfirmed)
        {
            if (result == null || !result.Any())
                throw new ArgumentException("Invalid Email Id.");
        }

        return result;
    }

    public async Task<List<StudentSelectionDto>> GetStudentsByEmail(string email)
    {
        var result = await (
            from u in _dbContext.User
            join s in _dbContext.Student on u.Id equals s.UserId
            join grade in _dbContext.Type_Code on s.GradeId equals grade.Id into gradeGroup
            from g in gradeGroup.DefaultIfEmpty()
            where u.Email.ToLower() == email.ToLower()
                  && u.IsActive == true
            select new StudentSelectionDto
            {
                UserId = u.Id,
                UserCode = u.UserCode,
                StudentName = string.IsNullOrEmpty(u.FullName)
                    ? (u.FirstName + " " + u.LastName)
                    : u.FullName,
                Email = u.Email,
                ClassName = g != null ? g.TypeCodeName : ""
            }).ToListAsync();

        return result;
    }

    public async Task<User> CheckEmailAlreadyExists(string email)
    {
        try
        {
            var response = new User();
            response = await _dbContext.User.Where(u => u.Email.ToLower() == email.ToLower() && u.IsActive == true).FirstOrDefaultAsync();
            if (response != null)
            {
                return response;
            }
            return response;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
    //public async Task<IEnumerable<UserDTO>> GetAllUser(int userType)
    //{
    //    //var typeGroupId = _dbContext.TypeGroup.Where(t => t.TypeGroupCode == userType).FirstOrDefault().Id;
    //    var userTypeId = _dbContext.Type_Code.Where(c => c.TypeCodeValue == userType).FirstOrDefault().Id;

    //    var result = await _dbContext.User.Where(u => u.UserType == userTypeId && u.IsActive == true).ToListAsync();
    //    var roleId = _dbContext.UserRole.Where(u => u.UserId == result[0].Id && u.IsActive == true).FirstOrDefault().RoleId;
    //    var user = new UserDTO
    //    {
    //        UserCode = result[0].UserCode,
    //        Id = result[0].Id,
    //        FullName = result[0].FullName,
    //        FirstName = result[0].FirstName,
    //        IsSystemUser = result[0].IsSystemUser,
    //        IsActive = result[0].IsActive,
    //        IsAdminUser = result[0].IsAdminUser,
    //        AlternatePhone = result[0].AlternatePhone,
    //        DesignationId = result[0].DesignationId,
    //        DOB = result[0].DOB,
    //        ManagerId = result[0].ManagerId,
    //        Email = result[0].Email,
    //        Gender = result[0].Gender,
    //        Location = result[0].Location,
    //        JoiningDate = result[0].JoiningDate,
    //        CreatedDate = result[0].CreatedDate,
    //        CreatedBy = result[0].CreatedBy,
    //        RoleId = roleId,
    //        Role = _dbContext.Roles.Where(r => r.Id == roleId && r.IsActive == true).FirstOrDefault().RoleName
    //    };

    //    return user;
    //}

    public async Task<IEnumerable<UserDTO>> GetAllUser(int? roleId, string? filterText, Guid? managerId = null, IEnumerable<int>? roleIds = null, bool excludeStudentTutor = false)
    {
        if (filterText == "undefined" || filterText == "null" || filterText == "")
        {
            filterText = null;
        }

        if (managerId == Guid.Empty)
        {
            managerId = null;
        }

        var selectedRoleIds = roleIds?.Distinct().ToArray();

        var users = await (from u in _dbContext.User.AsNoTracking()
                     join ur in _dbContext.UserRole.AsNoTracking() on u.Id equals ur.UserId
                     join r in _dbContext.Roles.AsNoTracking() on ur.RoleId equals r.Id
                     where r.RoleName != "SuperAdmin"
                           && (!excludeStudentTutor || (r.RoleName != "Student" && r.RoleName != "Tutor"))
                           && (selectedRoleIds != null && selectedRoleIds.Length > 0
                               ? selectedRoleIds.Contains(ur.RoleId)
                               : (roleId == null || ur.RoleId == roleId))
                           && (managerId == null || u.ManagerId == managerId)
                           && (string.IsNullOrEmpty(filterText) ||
                               u.Email.Contains(filterText) ||
                               u.FullName.Contains(filterText) ||
                               u.Phone.Contains(filterText))
                     select new UserDTO()
                     {
                         UserCode = u.UserCode,
                         Id = u.Id,
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
                     .ToListAsync();

        return users;
    }

    public async Task<Response<UserDTO>> AddTCTUser(UserDTO input)
    {
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
            var totalUser = await _dbContext.User.CountAsync() + 1;
            var code = Util.GetNextNumber(totalUser);

            var userType = await _dbContext.Type_Code.Where(s => s.TypeCodeValue == 10003/*OrganizationUser*/).FirstOrDefaultAsync();
            input.Location = "Chennai";

            var _user = await _dbContext.User.Where(s => s.Id == input.Id).FirstOrDefaultAsync();
            if (_user != null)
            {
                _user.FirstName = input.FirstName;
                _user.LastName = input.LastName;
                _user.FullName = $"{input.FirstName} {input.LastName}";
                _user.Phone = input.Phone;
                _user.AlternatePhone = input.AlternatePhone;
                _user.DOB = input.DOB;
                _user.Gender = input.Gender;
                _user.DesignationId = input.DesignationId;
                _user.ManagerId = input.ManagerId;
                _user.Location = input.Location;
                _user.UserCode = $"TCT{code}";
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
                    DesignationId = input.DesignationId,
                    EmailConfirmed = input.EmailConfirmed,
                    LastLogin = input.LastLogin,
                    ManagerId = input.ManagerId,
                    Location = input.Location,
                    UserCode = $"TCT{code}",
                    IsActive = true,
                    IsSystemUser = input.IsSystemUser,
                    IsAdminUser = input.IsAdminUser,
                    CreatedBy = createdBy,
                    CreatedDate = DateTime.UtcNow,
                };
                var plainPasswordForUser = TCT.LMS.Application.Common.PasswordGenerator.Generate();
                _user.PasswordHash = _passwordHasher.HashPassword(_user, plainPasswordForUser);
                input.GeneratedPassword = plainPasswordForUser;
                _dbContext.Add(_user);
            }
            userId = _user.Id;
            //response.Data.Id = userId;
            //response.Data.IsSystemUser = false;
            await _dbContext.SaveChangesAsync();

            var userRole = await _dbContext.UserRole.Where(r => r.UserId == userId && r.IsActive == true).FirstOrDefaultAsync();

            if (userRole is null)
            {
                var userAssignedRole = new UserRole
                {
                    RoleId = input.RoleId.Value,
                    UserId = userId,
                    CreatedBy = input.CreatedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
                _dbContext.Add(userAssignedRole);
            }
            else
            {
                userRole.RoleId = input.RoleId.Value;
                userRole.UserId = userId;
                userRole.ModifiedBy = input.CreatedBy;
                userRole.ModifiedDate = DateTime.UtcNow;
                userRole.IsActive = true;
                _dbContext.Update(userRole);
            }
            await _dbContext.SaveChangesAsync();

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
        var userBasicInfo = new UserDTO
        {
            Id = userId,
            FirstName = input.FirstName,
            LastName = input.LastName,
            IsSystemUser = input.IsSystemUser,
            GeneratedPassword = input.GeneratedPassword,
        };

        return new Response<UserDTO>
        {
            Data = userBasicInfo,
            Succeeded = true,
            Message = "User added successfully"
        };
    }
    public async Task<User> AddUser(User user)
    {
        user.SetFullName();
        if (user == null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        var createdBy = user.CreatedBy;
        if (string.IsNullOrWhiteSpace(createdBy.ToString()))
        {
            throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {

            var userType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 10003/*OrganizationUser*/).FirstOrDefault();
            user.UserType = userType.Id;

            var totalUser = _dbContext.User.Count() + 1;
            var code = Util.GetNextNumber(totalUser);
            user.UserCode = $"TCT{code}";
            //user.PasswordHash = _passwordHasher.HashPassword(user, AppConstants.OrganizationConstant.OrganizationAdminDefaultPassword);
            Guid userId = Guid.Empty;
            _dbContext.Add(user);
            userId = user.Id;
            await _dbContext.SaveChangesAsync();

            var address = new AddressRequestDto
            {
                UserId = userId,
                //Street = user.Addresses.FirstOrDefault().Street,
                City = user.Addresses.FirstOrDefault().City,
                State = user.Addresses.FirstOrDefault().State,
                ZipCode = user.Addresses.FirstOrDefault().ZipCode,
                Country = user.Addresses.FirstOrDefault().Country,
                IsPrimary = user.Addresses.FirstOrDefault().IsPrimary,
                IsActive = user.Addresses.FirstOrDefault().IsActive,
                CreatedBy = createdBy,
                CreatedDate = DateTime.UtcNow,
            };
            await CreateAddressesAsync(userId, address, createdBy);

            //var electronicAddress = new ElectronicAddressRequestDto
            //{
            //    UserId = userId,
            //    EmailAddress = user.ElectronicAddresses.ElementAt(0).EmailAddress,
            //    MobileNumber = user.ElectronicAddresses.ElementAt(0).MobileNumber,
            //    IsPrimary = user.Addresses.FirstOrDefault().IsPrimary,
            //    IsActive = user.Addresses.FirstOrDefault().IsActive,
            //    CreatedBy = createdBy,
            //    CreatedDate = DateTime.UtcNow,
            //};
            //await CreateElectronicAddressesAsync(userId, electronicAddress, createdBy);

            await transaction.CommitAsync();
            return user;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    public async Task<User> UpdateUser(User user)
    {
        _dbContext.User.Update(user);
        await _dbContext.SaveChangesAsync();
        return user;
    }
    public async Task<User> UpdateConfirmEmail(string email)
    {
        var user = _dbContext.User.Where(u => u.Email == email).FirstOrDefault();

        if (user != null)
        {
            user.EmailConfirmed = true;
            user.ModifiedDate = DateTime.Now;
            _dbContext.User.Update(user);
            await _dbContext.SaveChangesAsync();
        }
        return user;
    }
    public async Task<Response<Guid>> DeleteUser(Guid id)
    {
        var response = new Response<Guid>()
        {
            Succeeded = true
        };
        var user = await GetUserById(id);
        if (user != null)
        {
            user.IsActive = !user.IsActive;
            user.ModifiedDate = DateTime.Now;
            _dbContext.Update(user);
            await _dbContext.SaveChangesAsync();
            response.Data = user.Id;
        }
        return response;
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
    public async Task<IEnumerable<UserDTO>> GetCoordinatorAdmins()
    {
        var users = await (from u in _dbContext.User
                           join ur in _dbContext.UserRole on u.Id equals ur.UserId
                           join r in _dbContext.Roles on ur.RoleId equals r.Id
                           where r.Id == (int)UserRoleEnum.CoordinatorAdmin // CoordinatorAdmin
                                 && u.IsActive == true
                                 && ur.IsActive == true
                                 && r.IsActive == true
                           orderby u.Id descending
                           select u).ToListAsync();

        var userDTOs = new List<UserDTO>();

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

            var userDTO = new UserDTO
            {
                UserCode = result.UserCode,
                Id = result.Id,
                FullName = result.FullName,
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

            userDTOs.Add(userDTO);
        }

        return userDTOs;
    }
    public async Task<IEnumerable<UserDTO>> GetSuperAdmins()
    {
        var users = await (from u in _dbContext.User
                           join ur in _dbContext.UserRole on u.Id equals ur.UserId
                           join r in _dbContext.Roles on ur.RoleId equals r.Id
                           where r.Id == (int)UserRoleEnum.SuperAdmin
                                 && u.IsActive == true
                                 && ur.IsActive == true
                                 && r.IsActive == true
                           orderby u.Id descending
                           select u).ToListAsync();

        var userDTOs = new List<UserDTO>();

        foreach (var result in users)
        {
            var roleEntity = await _dbContext.UserRole
                                             .Where(u => u.UserId == result.Id && u.IsActive)
                                             .FirstOrDefaultAsync();
            var roleId = roleEntity?.RoleId;
            var roleName = roleId.HasValue
                ? await _dbContext.Roles.Where(r => r.Id == roleId && r.IsActive).Select(r => r.RoleName).FirstOrDefaultAsync()
                : null;

            userDTOs.Add(new UserDTO
            {
                UserCode = result.UserCode,
                Id = result.Id,
                FullName = result.FullName,
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
            });
        }

        return userDTOs;
    }

    public async Task<User> UpdateLoggedInDateById(Guid userId)
    {
        var user = _dbContext.User.Where(u => u.Id == userId).FirstOrDefault();
        if (user != null)
        {
            user.LastLoggedIn = DateTime.Now;
            _dbContext.User.Update(user);
            //await _dbContext.SaveChangesAsync();
        }

        UserActivity userActivity = new UserActivity()
        {
            UserId = user.Id,
            LoggedIn = user.LastLoggedIn.Value,
        };
        _dbContext.UserActivity.Add(userActivity);
        await _dbContext.SaveChangesAsync();

        return user;
    }
    public async Task UpdateUserActivity(Guid id)
    {
        var loggedOutTime = DateTime.Now;

        var userActivity = _dbContext.UserActivity
            .Where(u => u.UserId == id && u.LoggedOut == null && EF.Functions.DateDiffDay(u.LoggedIn, DateTime.Now) == 0)
            .OrderByDescending(u => u.LoggedIn)
            .FirstOrDefault();

        if (userActivity != null)
        {
            userActivity.LoggedOut = loggedOutTime;
            _dbContext.UserActivity.Update(userActivity);
            await _dbContext.SaveChangesAsync();
        }
    }
    public async Task<IEnumerable<UserActivityResponseDTO>> GetUserActivitybyId(Guid id)
    {
        var userActivityResponselst = new List<UserActivityResponseDTO>();
        var users = await (from u in _dbContext.User
                           join ur in _dbContext.UserActivity on u.Id equals ur.UserId
                           where u.IsActive == true && u.Id == id
                           orderby u.Id descending
                           select new
                           {
                               u.Id,
                               u.FirstName,
                               u.LastName,
                               ur.LoggedIn,
                               ur.LoggedOut
                           }).ToListAsync();

        foreach (var result in users)
        {
            var userActivity = new UserActivityResponseDTO()
            {
                UserId = result.Id,
                UserName = $"{result.FirstName} {result.LastName}",
                LoggedIn = result.LoggedIn,
                LoggedOut = result.LoggedOut,
            };
            userActivityResponselst.Add(userActivity);
        }

        return userActivityResponselst;
    }
    public async Task<Response<UserAvailabilityRequestDto>> AddOrUpdateUserAvailability(UserAvailabilityRequestDto input)
    {
        Guid userId = Guid.Empty;
        var createdBy = input.CreatedBy;
        if (string.IsNullOrWhiteSpace(createdBy.ToString()))
        {
            throw new ArgumentException("CreatedBy cannot be null or empty", nameof(createdBy));
        }

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var userType = _dbContext.Type_Code.Where(s => s.TypeCodeValue == (input.RoleId == 13 ? 10002 : 10001)).FirstOrDefault(); /*Role ID: 13-Tutor, 14-Student, Usertype: 1001-Student, 1002-Tutor :*/

            TimeZoneInfo indianTimeZone = TimeZoneInfo.FindSystemTimeZoneById(input.TimeZone);

            if (input.StartDate == null)
            {
                var _userAvailability = _dbContext.UserAvailability.Where(s => s.Id == input.UserAvailabilityId).FirstOrDefault();
                if (_userAvailability != null)
                {
                    _userAvailability.UserId = input.UserId;
                    _userAvailability.UserType = userType.Id;
                    _userAvailability.DayOfWeek = input.DayOfWeek;
                    _userAvailability.StartTime = input.StartTime;
                    _userAvailability.EndTime = input.EndTime;
                    _userAvailability.TimeZone = input.TimeZone;
                    _userAvailability.IsRecurring = input.IsRecurring;
                    _userAvailability.IsActive = true;
                    _userAvailability.ModifiedDate = DateTime.Now;
                    _userAvailability.ModifiedBy = input.CreatedBy;
                    _dbContext.Update(_userAvailability);
                }
                else
                {
                    _userAvailability = new UserAvailability()
                    {
                        UserId = input.UserId,
                        UserType = userType.Id,
                        DayOfWeek = input.DayOfWeek,
                        StartTime = TimeZoneInfo.ConvertTimeFromUtc(input.StartTime, indianTimeZone),
                        EndTime = TimeZoneInfo.ConvertTimeFromUtc(input.EndTime, indianTimeZone),
                        TimeZone = input.TimeZone,
                        IsRecurring = input.IsRecurring,
                        IsActive = true,
                        CreatedDate = input.CreatedDate,
                        CreatedBy = input.CreatedBy,
                    };
                    _dbContext.Add(_userAvailability);
                }
            }
            else
            {
                var _userAvailabilityException = _dbContext.UserAvailabilityExceptions.Where(s => s.Id == input.UserAvailabilityExceptionId).FirstOrDefault();
                if (_userAvailabilityException != null)
                {
                    _userAvailabilityException.Id = input.UserAvailabilityExceptionId.Value;
                    _userAvailabilityException.UserId = input.UserId;
                    _userAvailabilityException.UserType = userType.Id;
                    _userAvailabilityException.DayOfWeek = input.DayOfWeek;
                    _userAvailabilityException.StartTime = TimeZoneInfo.ConvertTimeFromUtc(input.StartTime, indianTimeZone);
                    _userAvailabilityException.EndTime = TimeZoneInfo.ConvertTimeFromUtc(input.EndTime, indianTimeZone);
                    _userAvailabilityException.TimeZone = input.TimeZone;
                    _userAvailabilityException.IsActive = input.IsAvailable;
                    _userAvailabilityException.IsActive = true;
                    _userAvailabilityException.ModifiedDate = DateTime.Now;
                    _userAvailabilityException.ModifiedBy = input.CreatedBy;
                    _dbContext.Update(_userAvailabilityException);
                }
                else
                {
                    _userAvailabilityException = new UserAvailabilityExceptions()
                    {
                        UserId = input.UserId,
                        UserType = userType.Id,
                        DayOfWeek = input.DayOfWeek,
                        StartTime = TimeZoneInfo.ConvertTimeFromUtc(input.StartTime, indianTimeZone),
                        EndTime = TimeZoneInfo.ConvertTimeFromUtc(input.EndTime, indianTimeZone),
                        StartDate = input.StartDate.Value,
                        EndDate = input.EndDate,
                        TimeZone = input.TimeZone,
                        IsAvailable = input.IsAvailable,
                        IsActive = true,
                        CreatedDate = input.CreatedDate,
                        CreatedBy = input.CreatedBy,
                    };

                    _dbContext.Add(_userAvailabilityException);
                }
            }
            await _dbContext.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw;
        }
        var basicInfo = new UserAvailabilityRequestDto
        {
            UserId = userId,
            DayOfWeek = input.DayOfWeek,
            StartTime = input.StartTime,
            EndTime = input.EndTime,
        };

        return new Response<UserAvailabilityRequestDto>
        {
            Data = basicInfo,
            Succeeded = true,
            Message = "User availability slots added successfully"
        };
    }
    public async Task<UserAvailabilityRequestDto> CheckDayOfWeekExits(UserAvailabilityRequestDto input)
    {
        try
        {
            var response = new UserAvailabilityRequestDto();

            if (input.StartDate == null)
            {
                var result = _dbContext.UserAvailability.Where(s => s.UserId == input.UserId && s.DayOfWeek == input.DayOfWeek).FirstOrDefault();

                if (result != null)
                {
                    response.DayOfWeek = result.DayOfWeek;
                    return response;
                }
            }
            else
            {
                var result = _dbContext.UserAvailabilityExceptions.Where(s => s.UserId == input.UserId && s.DayOfWeek == input.DayOfWeek).FirstOrDefault();

                if (result != null)
                {
                    response.DayOfWeek = result.DayOfWeek;
                    return response;
                }
            }
            return response;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
    public async Task<IEnumerable<UserAvailabilityRequestDto>> GetUserAvailabilityDataByUserIdAsync(Guid userId)
    {
        var resultList = new List<UserAvailabilityRequestDto>();
        TimeZoneInfo istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

        using (var connection = new SqlConnection(_connectionString))
        using (var command = new SqlCommand("GetUserAvailabilityData", connection))
        {
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            await connection.OpenAsync();
            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var isActive = reader.GetBoolean(reader.GetOrdinal("IsActive"));
                    if (isActive)
                    {
                        var startTime = reader.GetDateTime(reader.GetOrdinal("StartTime"));
                        var endTime = reader.GetDateTime(reader.GetOrdinal("EndTime"));
                        //var _startTime = TimeZoneInfo.ConvertTimeFromUtc(startTime, istZone);
                        //var _endTime = TimeZoneInfo.ConvertTimeFromUtc(endTime, istZone);
                        resultList.Add(new UserAvailabilityRequestDto
                        {
                            UserAvailabilityId = reader.IsDBNull(reader.GetOrdinal("UserAvailabilityId")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("UserAvailabilityId")),
                            UserAvailabilityExceptionId = reader.IsDBNull(reader.GetOrdinal("UserAvailabilityExceptionId")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("UserAvailabilityExceptionId")),
                            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                            UserType = reader.GetGuid(reader.GetOrdinal("UserType")),
                            DayOfWeek = reader.IsDBNull(reader.GetOrdinal("DayOfWeek")) ? null : reader.GetString(reader.GetOrdinal("DayOfWeek")),
                            StartDate = reader.IsDBNull(reader.GetOrdinal("StartDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("StartDate")),
                            EndDate = reader.IsDBNull(reader.GetOrdinal("EndDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("EndDate")),
                            StartTime = startTime, // StartTime is required
                            EndTime = endTime, // EndTime is required
                                               //TimeZone = reader.IsDBNull(reader.GetOrdinal("TimeZone")) ? null : reader.GetString(reader.GetOrdinal("TimeZone")),
                            IsRecurring = reader.IsDBNull(reader.GetOrdinal("IsRecurring")) ? false : reader.GetBoolean(reader.GetOrdinal("IsRecurring")),
                            IsAvailable = reader.IsDBNull(reader.GetOrdinal("IsAvailable")) ? true : reader.GetBoolean(reader.GetOrdinal("IsAvailable")),
                            IsActive = reader.IsDBNull(reader.GetOrdinal("IsActive")) ? false : reader.GetBoolean(reader.GetOrdinal("IsActive")),
                            CreatedBy = reader.GetGuid(reader.GetOrdinal("CreatedBy")),
                            CreatedDate = reader.GetDateTime(reader.GetOrdinal("CreatedDate")),
                            ModifiedBy = reader.IsDBNull(reader.GetOrdinal("ModifiedBy")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("ModifiedBy")),
                            ModifiedDate = reader.IsDBNull(reader.GetOrdinal("ModifiedDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("ModifiedDate"))
                        });
                    }
                }
            }
        }
        return resultList;
    }
    // Active classes and demos booked for the user, as student or as tutor, between `from` and `to`
    // (inclusive dates). Cancelled, postponed and rescheduled occurrences are skipped, using the same
    // status codes as ClassReminderService (except Class Completed, which still occupied the time).
    public async Task<List<AvailableTimeSlot>> GetUserBookedClassesAsync(Guid userId, DateTime from, DateTime to)
    {
        var start = from.Date;
        var end = to.Date.AddDays(1);
        var freedCodes = new[] { 1009002, 1009003, 1009005, 1009006, 1009007, 20020, 20021, 20022, 20023 };
        var freedStatuses = await _dbContext.Type_Code.Where(code => freedCodes.Contains(code.TypeCodeValue))
            .Select(code => code.Id).ToListAsync();

        var studentIds = _dbContext.Student.Where(s => s.UserId == userId).Select(s => s.Id);
        var tutorIds = _dbContext.Tutor.Where(t => t.UserId == userId).Select(t => t.Id);

        var booked = await (
            from detail in _dbContext.ScheduleDetails
            join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
            // Schedule.TutorId holds the Tutor.Id on some rows and the tutor's User.Id on others.
            where (studentIds.Contains(schedule.StudentId) || tutorIds.Contains(schedule.TutorId) || schedule.TutorId == userId)
                && detail.IsActive && schedule.IsActive
                && detail.StartTime < end && detail.EndTime > start
                && (!detail.TutorScheduleStatus.HasValue || !freedStatuses.Contains(detail.TutorScheduleStatus.Value))
                && (!detail.OperationScheduleStatus.HasValue || !freedStatuses.Contains(detail.OperationScheduleStatus.Value))
            orderby detail.StartTime
            select new { detail.StartTime, detail.EndTime })
            .ToListAsync();

        return booked.Select(b => new AvailableTimeSlot(b.StartTime.DayOfWeek, b.StartTime, b.EndTime,
            b.StartTime.DayOfWeek.ToString())).ToList();
    }

    public async Task<UserAvailabilityRequestDto> GetUserAvailabilityDataByIdAsync(Guid id)
    {
        UserAvailabilityRequestDto result = null;
        try
        {
            using (var connection = new SqlConnection(_connectionString))
            using (var command = new SqlCommand("GetUserAvailabilityDetails", connection))
            {
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@Id", SqlDbType.UniqueIdentifier) { Value = id });

                await connection.OpenAsync();
                using (var reader = await command.ExecuteReaderAsync())
                {

                    if (reader.Read())
                    {
                        result = new UserAvailabilityRequestDto
                        {
                            UserAvailabilityId = reader.IsDBNull(reader.GetOrdinal("UserAvailabilityId")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("UserAvailabilityId")),
                            UserAvailabilityExceptionId = reader.IsDBNull(reader.GetOrdinal("UserAvailabilityExceptionId")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("UserAvailabilityExceptionId")),
                            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                            UserType = reader.GetGuid(reader.GetOrdinal("UserType")),
                            DayOfWeek = reader.IsDBNull(reader.GetOrdinal("DayOfWeek")) ? null : reader.GetString(reader.GetOrdinal("DayOfWeek")),
                            StartDate = reader.IsDBNull(reader.GetOrdinal("StartDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("StartDate")),
                            EndDate = reader.IsDBNull(reader.GetOrdinal("EndDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("EndDate")),
                            StartTime = reader.GetDateTime(reader.GetOrdinal("StartTime")), // Required
                            EndTime = reader.GetDateTime(reader.GetOrdinal("EndTime")), // Required
                            TimeZone = reader.IsDBNull(reader.GetOrdinal("TimeZone")) ? null : reader.GetString(reader.GetOrdinal("TimeZone")),
                            IsRecurring = reader.IsDBNull(reader.GetOrdinal("IsRecurring")) ? false : reader.GetBoolean(reader.GetOrdinal("IsRecurring")),
                            IsAvailable = reader.IsDBNull(reader.GetOrdinal("IsAvailable")) ? true : reader.GetBoolean(reader.GetOrdinal("IsAvailable")),
                            IsActive = reader.IsDBNull(reader.GetOrdinal("IsActive")) ? false : reader.GetBoolean(reader.GetOrdinal("IsActive")),
                            CreatedBy = reader.GetGuid(reader.GetOrdinal("CreatedBy")),
                            CreatedDate = reader.GetDateTime(reader.GetOrdinal("CreatedDate")),
                            ModifiedBy = reader.IsDBNull(reader.GetOrdinal("ModifiedBy")) ? (Guid?)null : reader.GetGuid(reader.GetOrdinal("ModifiedBy")),
                            ModifiedDate = reader.IsDBNull(reader.GetOrdinal("ModifiedDate")) ? (DateTime?)null : reader.GetDateTime(reader.GetOrdinal("ModifiedDate"))
                        };
                    }
                }
            }
        }
        catch (Exception ex)
        {
            throw;
        }
        return result;
    }

    public async Task<bool> AddTimeSlots(UserTimeSlots input)
    {
        NormalizeAvailabilityDates(input);
        var user = _dbContext.User.Find(input.UserId);
        if (user == null) return false;
        if (user != null)
        {
            foreach (var item in input.SlotList)
            {
                var _userAvailability = new UserAvailability()
                {
                    UserId = input.UserId,
                    //UserType = user.UserType.Value,
                    DayOfWeek = item.Day,
                    StartDate = input.StartDate,
                    EndDate = input.IsRecurring ? null : input.EndDate.Value,
                    StartTime = (input.StartDate.Date + item.StartTime),
                    EndTime = (input.StartDate.Date + item.EndTime),
                    IsRecurring = input.IsRecurring,
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = input.LoggedInUserId,
                };
                _dbContext.Add(_userAvailability);
            }
        }
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<Response<bool>> UpdateTimeSlots(UserTimeSlots input)
    {
        NormalizeAvailabilityDates(input);
        Response<bool> response = new Response<bool>();
        try
        {
            if (!await _dbContext.User.AnyAsync(user => user.Id == input.UserId))
                return new Response<bool>("User not found. Reload the selected tutor and try again.");
            var ids = input.SlotList.Where(slot => slot.Id.HasValue && slot.Id != Guid.Empty).Select(slot => slot.Id!.Value).Distinct().ToList();
            var owned = await _dbContext.UserAvailability.Where(slot => ids.Contains(slot.Id) && slot.UserId == input.UserId).CountAsync();
            if (owned != ids.Count) return new Response<bool>("An availability slot no longer exists or belongs to a different user. Reload and try again.");
            foreach (var item in input.SlotList)
            {
                var userSlots = item.Id.HasValue && item.Id.Value != Guid.Empty
                    ? await _dbContext.UserAvailability.FindAsync(item.Id.Value)
                    : null;

                if (userSlots != null)
                {
                    userSlots.DayOfWeek = item.Day;
                    userSlots.StartDate = input.StartDate;
                    userSlots.EndDate = input.IsRecurring ? null : input.EndDate;
                    userSlots.StartTime = (input.StartDate.Date + item.StartTime);
                    userSlots.EndTime = (input.StartDate.Date + item.EndTime);
                    userSlots.IsRecurring = input.IsRecurring;
                    userSlots.IsActive = true;
                    userSlots.ModifiedDate = DateTime.UtcNow;
                    userSlots.ModifiedBy = input.LoggedInUserId;
                    _dbContext.Update(userSlots);
                }
                else
                {
                    _dbContext.UserAvailability.Add(new UserAvailability
                    {
                        UserId = input.UserId,
                        DayOfWeek = item.Day,
                        StartDate = input.StartDate,
                        EndDate = input.IsRecurring ? null : input.EndDate,
                        StartTime = input.StartDate.Date + item.StartTime,
                        EndTime = input.StartDate.Date + item.EndTime,
                        IsRecurring = input.IsRecurring,
                        IsActive = true,
                        CreatedDate = DateTime.UtcNow,
                        CreatedBy = input.LoggedInUserId,
                    });
                }
            }
            await _dbContext.SaveChangesAsync();
            response.Data = true;
            response.Succeeded = true;
        }
        catch (Exception ex)
        {
            throw;
        }
        return response;
    }

    private static void NormalizeAvailabilityDates(UserTimeSlots input)
    {
        // DatePicker serializes India midnight as the previous UTC day. Keep
        // calendar dates in the same local time zone used by scheduling.
        if (input.StartDate.Kind == DateTimeKind.Utc)
            input.StartDate = DateHelper.TCTConvertTimeFromUtc(input.StartDate).Date;
        if (input.EndDate?.Kind == DateTimeKind.Utc)
            input.EndDate = DateHelper.TCTConvertTimeFromUtc(input.EndDate.Value).Date;
    }

    public async Task<Response<List<DaySchedule>>> GetUserSlotsByDay(Guid userId, string dayOfWeek)
    {
        Response<List<DaySchedule>> result = new Response<List<DaySchedule>>();
        try
        {
            TimeZoneInfo istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            var records = new List<DaySchedule>();
            var output = await _dbContext.UserAvailability.Where(s => s.UserId == userId && s.DayOfWeek == dayOfWeek && s.IsActive == true).ToListAsync();
            var groupedResult = output.GroupBy(g => g.DayOfWeek).ToList();
            foreach (var item in groupedResult)
            {
                var day = (int)Enum.Parse(typeof(DayOfWeek), item.Key, true);
                List<ScheduleSlot> slots = new List<ScheduleSlot>();
                foreach (var s in item)
                {
                    //s.StartTime = TimeZoneInfo.ConvertTimeFromUtc(s.StartTime, istZone);
                    //s.EndTime = TimeZoneInfo.ConvertTimeFromUtc(s.EndTime, istZone);
                    int startTimeMinutes = (int)s.StartTime.TimeOfDay.TotalMinutes;
                    int endTimeMins = (int)s.EndTime.TimeOfDay.TotalMinutes;
                    slots.Add(new ScheduleSlot()
                    {
                        SelectedTime = $"{s.StartTime.ToString("hh:mm tt")} - {s.EndTime.ToString("hh:mm tt")}",
                        UniqueId = slots.Count + 1,
                        SlotId = s.Id,
                        StartTime = s.StartTime.ToString("hh:mm tt"),
                        EndTime = s.EndTime.ToString("hh:mm tt"),
                        StartMinutes = startTimeMinutes,
                        EndMinutes = endTimeMins,
                        DayInNo = day,
                        DayOfWeek = s.DayOfWeek,
                        MinMinutes = 0,
                        MaxMinutes = 1440,
                    });
                }

                records.Add(new DaySchedule()
                {
                    StartDate = item.First().StartDate,
                    EndDate = item.First().EndDate,
                    IsRecurring = item.First().IsRecurring,
                    DayInNo = day,
                    DayOfWeek = item.Key,
                    StartMinutes = 0,
                    EndMinutes = 1440,
                    MaxMinutes = 1440,
                    MinMinutes = 0,
                    Slots = slots
                });
            }
            result.Data = records;
        }
        catch (Exception ex)
        {
        }
        return result;
    }

    public async Task<Response<bool>> RemoveTimeSlot(RemoveSlot input)
    {
        Response<bool> response = new Response<bool>();
        try
        {
            var userSlots = _dbContext.UserAvailability.Find(input.Id);
            if (userSlots != null)
            {
                userSlots.IsActive = false;
                userSlots.ModifiedDate = DateTime.UtcNow;
                userSlots.ModifiedBy = input.LoggedInUserId;
                _dbContext.Update(userSlots);
            }

            await _dbContext.SaveChangesAsync();
            response.Message = "Time slot removed successfully";
            response.Data = true;
        }
        catch (Exception ex)
        {
            throw;
        }
        return response;
    }
}

using Common;
using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Policy;
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

public class UserRatingRepository : GenericRepository<UserClassRating>, IUserRatingRepository
{
    private readonly ApplicationDbContext _dbContext;

    public UserRatingRepository(ApplicationDbContext dbContext) : base(dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Response<bool>> AddRating(UserClassRating rating)
    {
        var response = new Response<bool>();
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            _dbContext.UserClassRating.Add(rating);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            response.Data = true;
        }
        catch (Exception)
        {
            throw;
        }
        return response;
    }

    public Task<Response<List<UserClassRating>>> GetRatingByUser(UserClassRating rating)
    {
        throw new NotImplementedException();
    }
}

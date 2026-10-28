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
using TCT.LMS.DTOs.TutorStudentAllocation;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.Infrastructure.Common;

namespace TCT.LMS.Infrastructure.Repositories;

public class TutorStudentAllocationRepository : GenericRepository<TutorStudentAllocations>, ITutorStudentAllocationRepository
{
    private readonly ApplicationDbContext _dbContext;
    public TutorStudentAllocationRepository(ApplicationDbContext dbContext) : base(dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Response<Guid>> AssignTutorAsync(TutorStudentAllocationRequestDto allocation)
    {
        Response<Guid> response = new Response<Guid>();
        var input = new TutorStudentAllocations()
        {
            SalesDetailsId = allocation.SalesDetailsId,
            StatusCode = allocation.StatusCode,
            StudentId = allocation.StudentId,
            TutorId = allocation.TutorId,
            CreatedBy = allocation.UserId,
            CreatedDate = DateTime.UtcNow,
            Note = allocation.Note,
            IsActive = true,
        };
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            _dbContext.TutorStudentAllocations.Add(input);
            _dbContext.SaveChanges();
            await transaction.CommitAsync();
            response = new Response<Guid>(input.Id, "Tutor assigned successfully");
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            throw;
        }
        return response;
    }

    public async Task<Response<bool>> UpdateTutorAssignmentAsync(TutorStudentAllocationRequestDto allocation)
    {
        var _data = await _dbContext.TutorStudentAllocations.FindAsync(allocation.Id);

        if (_data == null)
            return new Response<bool>(false, $"Allocation {allocation.Id} not found.");

        _data.StatusCode = allocation.StatusCode;
        _data.Note = allocation.Note;
        _data.ModifiedBy = allocation.UserId;
        _data.ModifiedDate = DateTime.UtcNow;

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            _dbContext.TutorStudentAllocations.Update(_data);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return new Response<bool>(true, "Tutor assignment updated successfully.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public Task<Response<bool>> DisableAllocationAsync(Guid allocationId, bool isActive)
    {
        throw new NotImplementedException();
    }
}

using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories;

public class MasterDetailRepository : GenericRepository<Type_Code>, IMasterDetailRepository
{
    public readonly ApplicationDbContext _dbContext;
    public MasterDetailRepository(ApplicationDbContext dbContext) : base(dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<Type_Code>> GetAllMasterDetailAsync(bool hideInActive)
    {
        var query = _dbContext.Type_Code.AsNoTracking();
        if (hideInActive)
        {
            query = query.Where(a => a.IsActive == true);
        }
        return await query.ToListAsync();
    }
    public async Task<Type_Code> GetMasterDetailByIdAsync(Guid id)
    {
        var result = await _dbContext.Type_Code.FindAsync(id);
        return result;
    }
    public async Task<IEnumerable<Type_Code>> GetByTypeGroupId(string id)
    {
        var existingTypeGroup = await _dbContext.TypeGroup.AsNoTracking()
                .FirstOrDefaultAsync(s => s.TypeGroupCode == int.Parse(id));

        if (existingTypeGroup == null)
        {
            throw new KeyNotFoundException($"TypeGroup with ID {id} not found.");
        }
        var result = _dbContext.Type_Code.AsNoTracking().Where(c => c.TypeGroupId == existingTypeGroup.Id && c.IsActive == true).ToList();
        return result;
    }

    public async Task<IEnumerable<Type_Code>> GetGradeGroupByBoardAsync(string boardIds)
    {
        if (string.IsNullOrWhiteSpace(boardIds))
            return Enumerable.Empty<Type_Code>();

        // ✅ Convert to List<Guid> safely
        var boardGuids = boardIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : Guid.Empty)
                                .Where(g => g != Guid.Empty)
                                .ToList();

        if (!boardGuids.Any())
            return Enumerable.Empty<Type_Code>();

        // ✅ Fetch distinct GroupIds directly from EF (no premature ToList)
        var groupIds = await _dbContext.BoardGradeGroupMapping
                                       .Where(s => boardGuids.Contains(s.BoardId))
                                       .Select(s => new { s.BoardId, s.GroupId })
                                       .Distinct()
                                       .Select(x => x.GroupId)
                                       .ToListAsync();

        if (!groupIds.Any())
            return Enumerable.Empty<Type_Code>();

        // ✅ Get corresponding Type_Code entries
        var groups = await _dbContext.Type_Code
                                     .Where(tc => groupIds.Contains(tc.Id))
                                     .ToListAsync();

        return groups;
    }

    public async Task<IEnumerable<Type_Code>> GetGradeByGroupAsync(List<Guid> boardIds, List<Guid>? groupIds)
    {

        // ✅ Fetch distinct GroupIds directly from EF (no premature ToList)
        var _gradeIds = await _dbContext.BoardGradeGroupMapping
                                    .Where(s => (!boardIds.Any() || boardIds.Contains(s.BoardId)) && (groupIds == null || !groupIds.Any() || groupIds.Contains(s.GroupId)))
                                    .Select(s => s.GradeId)
                                    .Distinct().ToListAsync();
        if (!_gradeIds.Any())
            return Enumerable.Empty<Type_Code>();

        // ✅ Get corresponding Type_Code entries
        var groups = await _dbContext.Type_Code
                                     .Where(tc => _gradeIds.Contains(tc.Id))
                                     .ToListAsync();

        return groups;
    }


    public async Task<Type_Code> CreateMasterDetailAsync(Type_Code entity)
    {
        _dbContext.Type_Code.Add(entity);
        await _dbContext.SaveChangesAsync();
        return entity;
    }

    public async Task<Response<Guid>> AddUpdateTypeCode(Type_Code entity)
    {
        Response<Guid> result = new Response<Guid>();



        if (entity.Id == Guid.Empty)
        {
            var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeName == entity.TypeCodeName && s.TypeGroupId == entity.TypeGroupId && s.IsActive == true).ToList();
            if (typeCode.Count > 0)
            {
                result.Succeeded = false;
                result.Message = "Name already exists!";
                return result;
            }
            var typeCode1 = _dbContext.Type_Code.Where(s => s.TypeGroupId == entity.TypeGroupId).OrderByDescending(s => s.TypeCodeValue).FirstOrDefault();
            if (typeCode1 != null)
            {
                entity.TypeCodeValue = typeCode1.TypeCodeValue + 1;
            }
            else
            {
                string typeCodeValue = _dbContext.TypeGroup.Where(g => g.Id == entity.TypeGroupId).FirstOrDefault().TypeGroupCode.ToString() + "001";
                entity.TypeCodeValue = int.Parse(typeCodeValue);
            }
            entity.CreatedDate = DateTime.UtcNow;
            entity.CreatedBy = Guid.Empty;
            _dbContext.Add(entity);
        }
        else
        {
            var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeName == entity.TypeCodeName && s.TypeGroupId == entity.TypeGroupId && s.IsActive == true && s.Id != entity.Id).ToList();
            if (typeCode.Count > 0)
            {
                result.Succeeded = false;
                result.Message = "Name already exists!";
                return result;
            }

            var _typeCode = await _dbContext.FindAsync<Type_Code>(entity.Id);
            if (_typeCode != null)
            {
                _typeCode.TypeCodeName = entity.TypeCodeName;
                _typeCode.TypeCodeDescription = entity.TypeCodeDescription;
                _typeCode.ModifiedBy = Guid.Empty;
                _typeCode.ModifiedDate = DateTime.UtcNow;
                _dbContext.Update(_typeCode);
            }
            else
            {
                result.Succeeded = false;
                result.Message = "Data not found!";
                return result;
            }
        }
        await _dbContext.SaveChangesAsync();
        result.Succeeded = true;
        result.Message = "Data saved successfully!";
        return result;
    }

    public async Task<Type_Code> UpdateMasterDetailAsync(Type_Code entity)
    {
        _dbContext.Type_Code.Update(entity);
        await _dbContext.SaveChangesAsync();
        return entity;
    }
    public async Task<Type_Code> DeleteMasterDetailAsync(Guid id)
    {
        var typeCode = await _dbContext.Type_Code.FindAsync(id);
        if (typeCode != null)
        {
            typeCode.IsActive = false;
            typeCode.ModifiedDate = DateTime.Now;
            _dbContext.Type_Code.Update(typeCode);
            await _dbContext.SaveChangesAsync();
        }
        return typeCode;
    }

    public async Task<Type_Code> GetTypeCodeByShortCode(int shortCode)
    {
        var typeCode = await _dbContext.Type_Code.Where(s => s.TypeCodeValue == shortCode).FirstOrDefaultAsync();
        if (typeCode == null)
        {
            throw new Exception($"Invalid short code {shortCode}");
        }
        return typeCode;
    }
}

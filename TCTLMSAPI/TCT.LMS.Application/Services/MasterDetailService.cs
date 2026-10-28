using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services;

public class MasterDetailService : IMasterDetailService
{
    private readonly IMasterDetailRepository _repository;
    public MasterDetailService(IMasterDetailRepository repository)
    {
        _repository = repository;
    }
    public async Task<IEnumerable<Type_Code>> GetMasterDetailAsync(bool hideInActive)
    {

        var result = await _repository.GetAllMasterDetailAsync(hideInActive);
        if (result is null || result.Count() == 0)
        {
            return Enumerable.Empty<Type_Code>();
        }
        return result;
    }
    public Task<Type_Code> GetMasterDetailByIdAsync(Guid id)
    {
        return _repository.GetMasterDetailByIdAsync(id);
    }
    public Task<IEnumerable<Type_Code>> GetByTypeGroupId(string id)
    {
        return _repository.GetByTypeGroupId(id);
    }
    public Task<Type_Code> CreateMasterDetailAsync(Type_Code entity)
    {
        return _repository.CreateMasterDetailAsync(entity);
    }
    public Task<Type_Code> UpdateMasterDetailAsync(Type_Code entity)
    {
        return _repository.UpdateMasterDetailAsync(entity);
    }
    public async Task<Type_Code> DeleteMasterDetailAsync(Guid id)
    {
        var result = await _repository.DeleteMasterDetailAsync(id);
        if (result is null)
        {
            return null;
        }

        return result;
    }

    public async Task<Response<Guid>> AddUpdateTypeCode(Type_Code entity)
    {
        var result = await _repository.AddUpdateTypeCode(entity);
        return result;
    }

    public async Task<IEnumerable<Type_Code>> GetGradeGroupByBoardAsync(string boardIds)
    {
        var result = await _repository.GetGradeGroupByBoardAsync(boardIds);
        return result;
    }

    public async Task<IEnumerable<Type_Code>> GetGradeByGroupAsync(List<Guid> boardIds, List<Guid>? groupIds)
    {
        var result = await _repository.GetGradeByGroupAsync(boardIds, groupIds);
        return result;
    }
}

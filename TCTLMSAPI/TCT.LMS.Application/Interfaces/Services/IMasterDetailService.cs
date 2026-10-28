using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IMasterDetailService
{
    Task<IEnumerable<Type_Code>> GetMasterDetailAsync(bool hideInActive = false);
    Task<Type_Code> GetMasterDetailByIdAsync(Guid id);
    Task<IEnumerable<Type_Code>> GetByTypeGroupId(string id);
    Task<Type_Code> CreateMasterDetailAsync(Type_Code entity);
    Task<Type_Code> UpdateMasterDetailAsync(Type_Code entity);
    Task<Type_Code> DeleteMasterDetailAsync(Guid id);
    Task<Response<Guid>> AddUpdateTypeCode(Type_Code entity);

    Task<IEnumerable<Type_Code>> GetGradeGroupByBoardAsync(string boardIds);
    Task<IEnumerable<Type_Code>> GetGradeByGroupAsync(List<Guid> boardIds, List<Guid>? groupIds);
}

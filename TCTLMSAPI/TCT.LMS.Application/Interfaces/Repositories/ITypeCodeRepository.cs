using TCT.LMS.DTOs.TypeCode;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface ITypeCodeRepository
    {
        Task<Response<Guid>> AddUpdateTypeCode(TypeCodeDTO input);
        Task<Response<TypeCodeDTO>> GetTypeCodesBy();
    }
}

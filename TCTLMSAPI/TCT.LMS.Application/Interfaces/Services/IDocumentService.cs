using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IDocumentService
    {
        Task<Response<Guid>> CreateDocument(UserProfileDto input);
        Task<(bool IsSuccess, byte[] FileData)> ReadFileAsync(string filePath);
        Task<Response<Guid>> CreateDocument(DocumentStorageDto input);
    }
}

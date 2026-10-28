using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IFileService
    {
        Task<(bool IsSuccess, string FilePath)> SaveFileAsync(IFormFile file, string subDirectory = "");
        Task<(bool IsSuccess, string FilePath)> SaveFileFromBase64Async(string base64String, string fileName, string subDirectory = "");
        Task<(bool IsSuccess, byte[] FileData)> ReadFileAsync(string filePath);
        bool DeleteFile(string filePath);
    }
}

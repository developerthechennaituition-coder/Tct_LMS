using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services
{
    public class FileService : IFileService
    {
        private readonly IConfiguration _configuration;
        private readonly string _baseStoragePath;
        private readonly ILogger<FileService> _logger;

        public FileService(IConfiguration configuration, ILogger<FileService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _baseStoragePath = _configuration["FileDirectory"] ?? "FileStorage";

            // Ensure base directory exists
            if (!Directory.Exists(_baseStoragePath))
            {
                Directory.CreateDirectory(_baseStoragePath);
            }
        }

        public async Task<(bool IsSuccess, string FilePath)> SaveFileAsync(IFormFile file, string subDirectory = "")
        {
            try
            {
                if (file == null || file.Length == 0)
                    return (false, string.Empty);

                // Create subdirectory if specified
                var uploadPath = Path.Combine(_baseStoragePath, subDirectory);
                if (!Directory.Exists(uploadPath))
                {
                    Directory.CreateDirectory(uploadPath);
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var filePath = Path.Combine(uploadPath, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                return (true, filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving file: {FileName}", file.FileName);
                return (false, string.Empty);
            }
        }

        public async Task<(bool IsSuccess, string FilePath)> SaveFileFromBase64Async(string base64String, string fileName, string subDirectory = "")
        {
            try
            {
                if (string.IsNullOrEmpty(base64String))
                    return (false, string.Empty);

                // Remove data:image/png;base64, if present
                var base64Data = base64String.Contains(",") ?
                    base64String.Substring(base64String.IndexOf(",") + 1) :
                    base64String;

                var uploadPath = Path.Combine(_baseStoragePath, subDirectory);
                if (!Directory.Exists(uploadPath))
                {
                    Directory.CreateDirectory(uploadPath);
                }

                var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";
                var filePath = Path.Combine(uploadPath, uniqueFileName);

                await File.WriteAllBytesAsync(filePath, Convert.FromBase64String(base64Data));

                return (true, filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving base64 file: {FileName}", fileName);
                return (false, string.Empty);
            }
        }

        public async Task<(bool IsSuccess, byte[] FileData)> ReadFileAsync(string filePath)
        {
            try
            {
                if (!File.Exists(filePath))
                    return (false, Array.Empty<byte>());

                var fileBytes = await File.ReadAllBytesAsync(filePath);
                return (true, fileBytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading file: {FilePath}", filePath);
                return (false, Array.Empty<byte>());
            }
        }

        public bool DeleteFile(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file: {FilePath}", filePath);
                return false;
            }
        }
    }
}

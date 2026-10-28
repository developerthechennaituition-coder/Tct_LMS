using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class DocumentService : IDocumentService
    {
        private readonly IDocumentRepository _repository;
        private readonly IDocumentStorageRepository _storageRepository;
        private readonly IMasterDetailRepository _masterDetailRepository;
        public DocumentService(IDocumentRepository documentRepository, IDocumentStorageRepository storageRepository, IMasterDetailRepository masterDetailRepository)
        {
            _repository = documentRepository;
            _storageRepository = storageRepository;
            _masterDetailRepository = masterDetailRepository;

        }

        public async Task<Response<Guid>> CreateDocument(DocumentStorageDto input)
        {
            Response<Guid> response = new Response<Guid>();
            var result = await _repository.CreateDocument(input.Document);
            response = result;

            if (result?.Succeeded == true)
            {
                var userId = input.Document.UserId;
                var lookupDetails = await _masterDetailRepository.GetMasterDetailByIdAsync(input.Document.DocumentTypeId.Value);
                var documentName = Regex.Replace(lookupDetails.TypeCodeName, @"\s+", "");
                if (input?.Files != null)
                {
                    foreach (var item in input.Files)
                    {
                        var _fileName = $"{item.FileName}.{item.ContentType}";
                        var getFileName = Directory.GetCurrentDirectory() + $"/FileStorage/{documentName}";
                        string filePath = System.IO.Path.Combine(getFileName);
                        //, $"{userId.ToString()}_{input.Document.ReferenceId}"

                        if (!Directory.Exists(filePath))
                        {
                            Directory.CreateDirectory(filePath);
                        }

                        var fileName = $"{Path.GetFileName(item.FileName)}_{DateTime.Now.ToString("yyyyMMdd_HHmmss")}";
                        filePath = Path.Combine(filePath, fileName);

                        // Save file
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await item.CopyToAsync(stream);
                        }

                        DocumentStorage documentStorage = new DocumentStorage()
                        {
                            DocumentId = result.Data,
                            FileSize = item.Length.ToString(),
                            FileName = item.FileName,
                            FilePath = filePath,
                            ContentType = item.ContentType,
                            CreatedBy = userId,
                            CreatedDate = DateTime.Now,
                            IsActive = true
                        };
                        var storageResult = await _storageRepository.CreateDocumentStorage(documentStorage);
                    }
                }
            }

            return response;
        }

        public async Task<Response<Guid>> CreateDocument(UserProfileDto input)
        {
            Response<Guid> response = new Response<Guid>();
            var result = await _repository.CreateDocument(input);
            response = result;

            if (result?.Succeeded == true && input.Files != null)
            {
                foreach (var item in input.Files)
                {

                    var _fileName = $"{item.FileName}.{item.ContentType}";
                    var getFileName = Directory.GetCurrentDirectory() + "/FileStorage/";
                    string filePath = System.IO.Path.Combine(getFileName, input.UserId.ToString());

                    if (!Directory.Exists(filePath))
                    {
                        Directory.CreateDirectory(filePath);
                    }

                    var fileName = $"{input.UserId}_{Path.GetFileName(item.FileName)}";
                    filePath = Path.Combine(filePath, fileName);

                    // Save file
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await item.CopyToAsync(stream);
                    }

                    DocumentStorage documentStorage = new DocumentStorage()
                    {
                        DocumentId = result.Data,
                        FileSize = item.Length.ToString(),
                        FileName = item.FileName,
                        FilePath = filePath,
                        ContentType = item.ContentType,
                        CreatedBy = input.UserId,
                        CreatedDate = DateTime.Now,
                        IsActive = true
                    };
                    var storageResult = await _storageRepository.CreateDocumentStorage(documentStorage);
                }
            }

            return response;
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
                //_logger.LogError(ex, "Error reading file: {FilePath}", filePath);
                return (false, Array.Empty<byte>());
            }
        }
    }
}

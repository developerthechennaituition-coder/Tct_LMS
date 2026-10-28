using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using System.Transactions;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class DocumentRepository : IDocumentRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public DocumentRepository(ApplicationDbContext dbContext) { _dbContext = dbContext; }

        public async Task<Response<Guid>> CreateDocument(UserProfileDto input)
        {
            Response<Guid> response = new Response<Guid>();
            Document document = new Document()
            {
                DocumentName = string.IsNullOrWhiteSpace(input.DocumentName) ||
                               input.DocumentName.Equals("undefined", StringComparison.OrdinalIgnoreCase)
                    ? "Profile Photo"
                    : input.DocumentName.Trim(),
                DocumentDescription = string.IsNullOrWhiteSpace(input.DocumentDescription) ||
                                      input.DocumentDescription.Equals("undefined", StringComparison.OrdinalIgnoreCase)
                    ? "User profile photo"
                    : input.DocumentDescription.Trim(),
                UserId = input.UserId,
                CreatedBy = input.UserId,
                CreatedDate = DateTime.Now,
                ReferenceId = input.UserId,
                DocumentTypeId = Guid.Empty,
                IsActive = true,
            };
            using (var transaction = _dbContext.Database.BeginTransaction())
            {
                try
                {
                    var previousProfileDocuments = await _dbContext.Documents
                        .Where(x => x.UserId == input.UserId
                                    && x.DocumentTypeId == Guid.Empty
                                    && x.IsActive)
                        .ToListAsync();
                    foreach (var previousDocument in previousProfileDocuments)
                    {
                        previousDocument.IsActive = false;
                        previousDocument.ModifiedBy = input.UserId;
                        previousDocument.ModifiedDate = DateTime.Now;
                    }

                    _dbContext.Add(document);
                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            response.Succeeded = true;
            response.Data = document.Id;

            return response;
        }

        public async Task<Response<Guid>> CreateDocument(DocumentDto input)
        {
            Response<Guid> response = new Response<Guid>();
            var isUndefinedName = string.IsNullOrWhiteSpace(input.DocumentName)
                                  || input.DocumentName.Equals("undefined", StringComparison.OrdinalIgnoreCase);
            var isUndefinedDescription = string.IsNullOrWhiteSpace(input.DocumentDescription)
                                         || input.DocumentDescription.Equals("undefined", StringComparison.OrdinalIgnoreCase);
            Document document = new Document()
            {
                DocumentName = isUndefinedName ? "Instruction" : input.DocumentName.Trim(),
                DocumentDescription = isUndefinedDescription
                    ? "Instructions to coordinator (audio)"
                    : input.DocumentDescription.Trim(),
                UserId = input.UserId,
                CreatedBy = input.UserId,
                CreatedDate = DateTime.Now,
                ReferenceId = input.ReferenceId == Guid.Empty ? input.UserId : input.ReferenceId,
                DocumentTypeId = input.DocumentTypeId,
                IsActive = true,
            };
            await using (var transaction = await _dbContext.Database.BeginTransactionAsync())
            {
                try
                {
                    _dbContext.Add(document);
                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            response.Succeeded = true;
            response.Data = document.Id;

            return response;
        }

        public Task<Document> CreateAsync(Document entity)
        {
            throw new NotImplementedException();
        }

        public Task<Document> DeleteAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Document>> FindAll(Expression<Func<Document, bool>> expression)
        {
            throw new NotImplementedException();
        }

        public Task<Document> FindAsync(Expression<Func<Document, bool>> expression)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Document>> GetAllAsync(bool hideInActive = false)
        {
            throw new NotImplementedException();
        }

        public Task<Document> GetByIdAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(Document entity)
        {
            throw new NotImplementedException();
        }


    }
}

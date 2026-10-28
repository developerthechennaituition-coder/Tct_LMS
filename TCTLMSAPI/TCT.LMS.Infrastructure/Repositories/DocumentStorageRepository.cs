using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class DocumentStorageRepository : IDocumentStorageRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public DocumentStorageRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Response<Guid>> CreateDocumentStorage(DocumentStorage entity)
        {
            Response<Guid> resonse = new DTOs.Wrappers.Response<Guid>();
            using (var transaction = _dbContext.Database.BeginTransaction())
            {
                try
                {
                    _dbContext.Add(entity);
                    _dbContext.SaveChanges();
                    transaction.Commit();
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                }
            }
            return resonse;
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

        Task<IEnumerable<DocumentStorage>> IGenericRepository<DocumentStorage>.GetAllAsync(bool hideInActive)
        {
            throw new NotImplementedException();
        }

        Task<DocumentStorage> IGenericRepository<DocumentStorage>.GetByIdAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task<DocumentStorage> CreateAsync(DocumentStorage entity)
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(DocumentStorage entity)
        {
            throw new NotImplementedException();
        }

        Task<DocumentStorage> IGenericRepository<DocumentStorage>.DeleteAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task<DocumentStorage> FindAsync(Expression<Func<DocumentStorage, bool>> expression)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<DocumentStorage>> FindAll(Expression<Func<DocumentStorage, bool>> expression)
        {
            throw new NotImplementedException();
        }
    }
}

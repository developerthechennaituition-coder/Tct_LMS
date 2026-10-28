using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IDocumentStorageRepository : IGenericRepository<DocumentStorage>
    {
        Task<Response<Guid>> CreateDocumentStorage(DocumentStorage entity);
    }
}

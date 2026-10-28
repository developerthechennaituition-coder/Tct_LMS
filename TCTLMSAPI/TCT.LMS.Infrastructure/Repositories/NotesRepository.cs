using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Notes;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class NotesRepository : GenericRepository<Schedule>, INotesRepository
    {
        public readonly ApplicationDbContext _dbContext;
        public NotesRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<Response<Guid>> AddNote(TCTNotes input)
        {
            Response<Guid> response = new DTOs.Wrappers.Response<Guid>();
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                _dbContext.TCTNotes.Add(input);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                throw;
            }
            return response;
        }

        public Task<Response<NotesDto>> GetAllNote(int noteId)
        {
            throw new NotImplementedException();
        }

        public Task<Response<List<NotesDto>>> GetAllNotes()
        {
            throw new NotImplementedException();
        }
    }
}

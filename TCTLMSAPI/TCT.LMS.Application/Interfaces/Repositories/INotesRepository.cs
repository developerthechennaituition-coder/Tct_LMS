using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Notes;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface INotesRepository
    {
        Task<Response<Guid>> AddNote(TCTNotes input);
        Task<Response<List<NotesDto>>> GetAllNotes();
        Task<Response<NotesDto>> GetAllNote(int noteId);
    }
}

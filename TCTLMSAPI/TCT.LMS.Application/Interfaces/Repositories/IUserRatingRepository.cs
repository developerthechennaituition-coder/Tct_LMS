using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IUserRatingRepository : IGenericRepository<UserClassRating>
    {
        Task<Response<bool>> AddRating(UserClassRating rating);
        Task<Response<List<UserClassRating>>> GetRatingByUser(UserClassRating rating);
    }
}

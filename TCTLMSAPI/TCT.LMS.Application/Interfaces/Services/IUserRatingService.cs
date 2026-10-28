using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Rating;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IUserRatingService
    {
        Task<Response<bool>> AddRating(RatingDto rating);
        Task<Response<List<UserClassRating>>> GetRatingByUser(UserClassRating rating);
    }
}

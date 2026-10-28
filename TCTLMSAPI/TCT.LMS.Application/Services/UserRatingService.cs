using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Rating;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class UserRatingService : IUserRatingService
    {
        private readonly IUserRatingRepository _userRatingRepository;
        public UserRatingService(IUserRatingRepository userRatingRepository)
        {
            _userRatingRepository = userRatingRepository;
        }
        public Task<Response<bool>> AddRating(RatingDto input)
        {
            try
            {
                UserClassRating rating = new UserClassRating() { 
                    Id = Guid.NewGuid(),
                    RatedUserId = input.RatedUserId, 
                    RaterId = input.UserId,
                    Rating = input.Rating,
                    RatingTypeId = input.RatingTypeId,
                    ReferenceId = input.ReferenceId,    
                    RatedAt = DateTime.Now
                };
                var result = _userRatingRepository.AddRating(rating);
                return result;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public Task<Response<List<UserClassRating>>> GetRatingByUser(UserClassRating rating)
        {
            throw new NotImplementedException();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Rating
{
    public class RatingDto
    {
        public int Rating { get; set; }
        public Guid UserId { get; set; }
        public Guid RatedUserId { get; set; }
        public Guid ReferenceId { get; set; }
        public Guid RatingTypeId { get; set; }
    }
}

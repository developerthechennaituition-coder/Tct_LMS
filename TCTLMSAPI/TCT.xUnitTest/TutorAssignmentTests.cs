using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.TutorStudentAllocation;
using TCT.LMS.Infrastructure.Repositories;
using Xunit;

namespace TCT.xUnitTest
{
    public class TutorAssignmentTests
    {
        private ApplicationDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // fresh DB each test
                .Options;

            return new ApplicationDbContext(options);
        }

        [Fact]
        public async Task AssignTutorAsync_ShouldReturnNewGuid_WhenAllocationIsSaved()
        {
            // Arrange
            var dbContext = GetDbContext();
            var repository = new TutorStudentAllocationRepository(dbContext); // assume you have a repo class

            var studentId = Guid.NewGuid();
            var tutorId = Guid.NewGuid();

            // Seed required Student and Tutor (since FK constraints exist)
            dbContext.Student.Add(new Student { Id = studentId });
            dbContext.Tutor.Add(new Tutor { Id = tutorId });
            await dbContext.SaveChangesAsync();

            var requestDto = new TutorStudentAllocationRequestDto
            {
                StudentId = studentId,
                TutorId = tutorId,
                PaymentAmount = 1200,
                StatusCode = 1, // Assigned
                Note = "Initial assignment",
                UserId = Guid.NewGuid()
            };

            // Act
            var result = await repository.AssignTutorAsync(requestDto);

            // Assert
            Assert.True(result.Succeeded);
            Assert.NotEqual(Guid.Empty, result.Data);

            var allocation = await dbContext.TutorStudentAllocations.FirstOrDefaultAsync(a => a.Id == result.Data);
            Assert.NotNull(allocation);
            Assert.Equal(requestDto.StudentId, allocation.StudentId);
            Assert.Equal(requestDto.TutorId, allocation.TutorId);
            Assert.Equal(requestDto.PaymentAmount, allocation.PaymentAmount);
        }
    }
}

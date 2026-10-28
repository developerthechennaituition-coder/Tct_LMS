using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class AddressRepository : IAddressRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public AddressRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<Response<bool>> AddUpdateAddress(StudentAddressRequestDto input)
        {
            Guid userId = _dbContext.Student.Where(s => s.Id == input.StudentId.Value).Select(s => s.UserId ?? Guid.Empty).FirstOrDefault();

            var _address = await _dbContext.Address.FindAsync(input.Id);
            if (_address == null)
            {
                _dbContext.Address.Add(new Address()
                {
                    AddressLine1 = input.AddressLine1,
                    AddressLine2 = input.AddressLine2,
                    AddressLine3 = input.AddressLine3,
                    ZipCode = input.ZipCode,
                    City = input.City,
                    Country = input.Country,
                    UserId = userId,
                    State = input.State,
                    CreatedBy = input.CreatedBy,
                    CreatedDate = input.CreatedDate,
                    IsPrimary = true,
                });
            }
            else
            {
                _address.AddressLine1 = input.AddressLine1;
                _address.AddressLine2 = input.AddressLine2;
                _address.AddressLine3 = input.AddressLine3;
                _address.ZipCode = input.ZipCode;
                _address.City = input.City;
                _address.Country = input.Country;
                _address.State = input.State;
                _address.UserId = userId;
                _address.CreatedDate = input.CreatedDate;
                _address.CreatedBy = input.CreatedBy;
                _dbContext.Update(_address);
            }
            await _dbContext.SaveChangesAsync();

            return new Response<bool> { Message = "Address saved/updated successfully", Succeeded = true };
        }

        public Task<Address> CreateAsync(Address entity)
        {
            throw new NotImplementedException();
        }

        public Task<Address> DeleteAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Address>> FindAll(Expression<Func<Address, bool>> expression)
        {
            throw new NotImplementedException();
        }

        public Task<Address> FindAsync(Expression<Func<Address, bool>> expression)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Address>> GetAllAsync(bool hideInActive = false)
        {
            throw new NotImplementedException();
        }

        public Task<Address> GetByIdAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(Address entity)
        {
            throw new NotImplementedException();
        }
    }
}

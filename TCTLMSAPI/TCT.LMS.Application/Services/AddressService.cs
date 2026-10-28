using Microsoft.VisualBasic;
using System.Dynamic;
using TCT.LMS.Application.Interfaces;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services
{
    public class AddressService : IAddressService
    {
        private readonly IAddressRepository _addressRepository;
        public AddressService(IAddressRepository studentRepository)
        {
            _addressRepository = studentRepository;
        }

        public async Task<Response<bool>> AddUpdateAddress(StudentAddressRequestDto input)
        {
            var result = await _addressRepository.AddUpdateAddress(input);
            return result;
        }
    }
}

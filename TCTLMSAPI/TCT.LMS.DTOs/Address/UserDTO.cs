using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Address
{
    public class UserDTO : BaseEntity
    {
        public Guid Id { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? UserCode { get; set; }
        public DateTime? JoiningDate { get; set; }
        public DateTime? LastWorkingDate { get; set; }
        public string? Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? Phone { get; set; }
        public string? AlternatePhone { get; set; }
        public DateTime? DOB { get; set; }
        public string? Gender { get; set; }
        public Guid? DesignationId { get; set; }
        public int? RoleId { get; set; }
        public string? Role { get; set; }
        public bool? EmailConfirmed { get; set; } = false;
        public DateTime? LastLogin { get; set; } = null;
        public Guid? ManagerId { get; set; }
        public Guid? UserType { get; set; }
        public string? Location { get; set; }
        public string? FullName { get; set; }

        private string _fullName; // field
        public string? UserFullName
        {
            get { return _fullName; }
            set { _fullName = $"{FirstName} {LastName}"; }
        }

        public bool IsSystemUser { get; set; } = false;
        public bool IsAdminUser { get; set; } = false;
        public AddressRequestDto? Address { get; set; }
        public string? DesignationName { get; set; }
        public byte[]? FileData { get; set; }
        public string? Nickname { get; set; }
        public string? Theme { get; set; }
        public string? ChatTheme { get; set; }
        public bool IsFavorite { get; set; }
        public string? LastActiveStatus { get; set; }
        public DateTime? LastActiveDate { get; set; }
        public bool UnreadMessages { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDelivered { get; set; }
        public string? Name { get; set; }
        public string? GeneratedPassword { get; set; }
    }
}


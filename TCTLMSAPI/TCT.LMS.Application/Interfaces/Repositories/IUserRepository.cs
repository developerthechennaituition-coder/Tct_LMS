using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<IEnumerable<UserDTO>> GetAllUser(int? roleId, string? filterText, Guid? managerId = null, IEnumerable<int>? roleIds = null, bool excludeStudentTutor = false);
    Task<User> GetUserById(Guid id);
    Task<User> GetUserByEmail(string email, bool checkEmailConfirmed = false);

    // NEW - for login flow when same email exists for multiple students
    Task<List<User>> GetUsersByEmail(string email, bool checkEmailConfirmed = false);

    // NEW - to build student selection cards page
    Task<List<StudentSelectionDto>> GetStudentsByEmail(string email);

    // NEW - to complete login after student selection
    Task<User> GetActiveUserById(Guid userId);

    Task<User> CheckEmailAlreadyExists(string email);
    Task<User> AddUser(User userProfile);
    Task<User> UpdateUser(User userProfile);
    Task<User> UpdateConfirmEmail(string email);
    Task<Response<UserDTO>> AddTCTUser(UserDTO input);
    Task<Response<Guid>> DeleteUser(Guid id);
    Task<Response<UserDTO>> GetTCTUserById(Guid id);
    Task<IEnumerable<UserDTO>> GetCoordinatorAdmins();
    Task<IEnumerable<UserDTO>> GetSuperAdmins();
    Task<User> UpdateLoggedInDateById(Guid userId);
    Task UpdateUserActivity(Guid id);
    Task<IEnumerable<UserActivityResponseDTO>> GetUserActivitybyId(Guid id);
    Task<Response<UserAvailabilityRequestDto>> AddOrUpdateUserAvailability(UserAvailabilityRequestDto input);
    Task<UserAvailabilityRequestDto> CheckDayOfWeekExits(UserAvailabilityRequestDto input);
    Task<IEnumerable<UserAvailabilityRequestDto>> GetUserAvailabilityDataByUserIdAsync(Guid userId);
    Task<UserAvailabilityRequestDto> GetUserAvailabilityDataByIdAsync(Guid id);
    Task<List<AvailableTimeSlot>> GetUserBookedClassesAsync(Guid userId, DateTime from, DateTime to);    Task<bool> AddTimeSlots(UserTimeSlots input);
    Task<Response<List<DaySchedule>>> GetUserSlotsByDay(Guid userId, string dayOfWeek);
    Task<Response<bool>> UpdateTimeSlots(UserTimeSlots input);
    Task<Response<bool>> RemoveTimeSlot(RemoveSlot input);
}

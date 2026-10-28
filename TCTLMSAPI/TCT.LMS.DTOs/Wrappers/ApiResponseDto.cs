namespace TCT.LMS.DTOs.Wrappers;

public class ApiResponseDto
{
    public bool Succeeded { get; set; }
    public string Message { get; set; } = string.Empty;

    public static ApiResponseDto Success(string message = "") => new() { Succeeded = true, Message = message };
    public static ApiResponseDto Failure(string message) => new() { Succeeded = false, Message = message };
}

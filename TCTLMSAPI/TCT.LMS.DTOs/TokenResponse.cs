namespace TCT.LMS.DTOs;

public class TokenResponse
{
    public string JwtToken { get; set; }
    public string RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
}

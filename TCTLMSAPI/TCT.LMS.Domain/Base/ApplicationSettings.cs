namespace TCT.LMS.Domain.Base;

public sealed class ApplicationSettings
{
    public JwtSettings JwtSettings { get; set; } = new();
}

public sealed class JwtSettings
{
    public const string SectionName = "JwtSettings";
    public string SecretKey { get; init; } = "TCTSecretKeyForLMSJWTTokenForTheChennaiTutionLearningManagementSystem";
    public int ExpiryMinutes { get; init; }
    public string Issuer { get; init; } = null!;
    public string Audience { get; init; } = null!;
    public int RefreshTokenExpirydays { get; init; }
}
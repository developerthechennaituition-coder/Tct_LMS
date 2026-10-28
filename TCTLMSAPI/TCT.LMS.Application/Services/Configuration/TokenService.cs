using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Domain.Base;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Application.Services.Configuration;

public class TokenService
{
    private readonly ILogger<TokenService> _logger;
    private readonly IRolePermissionRepository _rolePermissionRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IGenericRepository<RefreshToken> _genericRepository;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TokenService(IConfiguration configuration,
        ILogger<TokenService> logger,
        IRolePermissionRepository rolePermissionRepository,
        IRoleRepository roleRepository,
        IGenericRepository<RefreshToken> genericRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _rolePermissionRepository = rolePermissionRepository;
        _roleRepository = roleRepository;
        _configuration = configuration;
        _genericRepository = genericRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<TokenResponse> GenerateTokens(List<Claim> claims, User user, List<RolesResponseDto> roles)
    {
        var jwtToken = await GenerateJWTToken(user, roles);
        bool useRefreshToken = _configuration.GetValue<bool>("JwtSettings:UseRefreshToken");

        string refreshToken = null;

        if (useRefreshToken)
        {
            refreshToken = GenerateRefreshToken();
            var refreshTokenHours = _configuration.GetValue<int?>("JwtSettings:RefreshTokenExpirationHours") ?? 8;
            var clientIp = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                Expires = DateTime.UtcNow.AddHours(refreshTokenHours),
                Created = DateTime.UtcNow,
                CreatedByIp = clientIp
            };
            await _genericRepository.CreateAsync(refreshTokenEntity);
        }
        return new TokenResponse
        {
            JwtToken = jwtToken,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = useRefreshToken
                ? DateTime.UtcNow.AddHours(_configuration.GetValue<int?>("JwtSettings:RefreshTokenExpirationHours") ?? 8)
                : null
        };
    }

    public async Task<string> GenerateJWTToken(User user, List<RolesResponseDto> roles)
    {
        var tokenHandler = new JwtSecurityTokenHandler();

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, _configuration["JwtSettings:Subject"]),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("UserId", user.Id.ToString()),
            new Claim("Email", user.Email)
        };

        // A user can hold multiple roles (multiple active UserRole rows) — emit one Role claim
        // per role so [Authorize(Roles = "...")] checks see all of them, not just the first.
        var roleNames = (roles ?? new List<RolesResponseDto>())
            .Select(r => r.RoleName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct();
        foreach (var roleName in roleNames)
        {
            claims.Add(new Claim(ClaimTypes.Role, roleName));
        }

        var tokenKey = Encoding.ASCII.GetBytes(_configuration["JwtSettings:Key"]);
        var signIn = new SigningCredentials(new SymmetricSecurityKey(tokenKey), SecurityAlgorithms.HmacSha256Signature);
        var expirationMinutes = _configuration.GetValue<int?>("JwtSettings:AccessTokenExpirationMinutes") ?? 15;
        var token = new JwtSecurityToken(
            _configuration["JwtSettings:Issuer"],
            _configuration["JwtSettings:Audience"],
            claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: signIn);

        _logger.LogInformation("Token created successfully for user {UserId}", user.Id);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
}

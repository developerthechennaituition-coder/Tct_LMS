using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using TCT.LMS.Application.Services;

namespace TCT.LMS.API
{
    public class ClassroomProvisioningService : IClassroomProvisioningService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ClassroomProvisioningService> _logger;

        public ClassroomProvisioningService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<ClassroomProvisioningService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string?> ProvisionRoomAsync(Guid scheduleDetailsId, Guid scheduleId, Guid createdBy)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("ClassroomApi");

                var payload = new
                {
                    ScheduleDetailsId = scheduleDetailsId,
                    ScheduleId = scheduleId,
                    CreatedBy = createdBy
                };

                var response = await client.PostAsJsonAsync("/api/classroom", payload);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Classroom API returned {Status} for ScheduleDetailsId={Id}",
                        response.StatusCode, scheduleDetailsId);
                    return null;
                }

                var result = await response.Content.ReadFromJsonAsync<ClassroomApiResponse>();
                if (result?.Data?.Id == null) return null;

                var frontendUrl = _configuration["ClassroomApi:FrontendUrl"] ?? "http://localhost:3000";
                return $"{frontendUrl}/classroom?id={result.Data.Id}";
            }
            catch (Exception ex)
            {
                // Classroom provisioning is best-effort — never fail schedule creation
                _logger.LogWarning(ex, "Could not provision classroom room for ScheduleDetailsId={Id}", scheduleDetailsId);
                return null;
            }
        }

        private class ClassroomApiResponse
        {
            public ClassroomData? Data { get; set; }
        }

        private class ClassroomData
        {
            public Guid Id { get; set; }
        }
    }
}

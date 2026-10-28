using TCT.LMS.Application.Services;

namespace TCT.LMS.API.Data;

public class SeedEnumerationData
{
    private readonly EnumerationsService _enumerationsService;

    public SeedEnumerationData(EnumerationsService enumerationsService)
    {
        _enumerationsService = enumerationsService;
    }

    public async Task RunAsync()
    {
        await _enumerationsService.LoadInitialTypeGroupSeedData();
        await _enumerationsService.LoadInitialTypeCodeSeedData();
    }
}

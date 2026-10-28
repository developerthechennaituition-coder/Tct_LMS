using TCT.LMS.Domain.Base;
using TCT.LMS.Domain.Enums;

namespace TCT.LMS.Application.Services;

public class EnumerationsService
{

    public async Task<IEnumerable<TypeGroupEnumerations>> LoadInitialTypeGroupSeedData()
    {
        List<TypeGroupEnumerations> lookups = new List<TypeGroupEnumerations>();

        lookups.AddRange(LoadFromDictionary(EnumDictionary.TypeGroups, "TypeGroups" ));;
        //var result = await this.InsertMany(lookups);
        return lookups;
    }

    public async Task<IEnumerable<TypeCodeEnumerations>> LoadInitialTypeCodeSeedData()
    {
        return null;
    }

    private List<TypeGroupEnumerations> LoadFromDictionary(Dictionary<string, string> items, string group)
    {
        List<TypeGroupEnumerations> data = new List<TypeGroupEnumerations>();
        foreach (var item in items)
        {
            data.Add(new TypeGroupEnumerations
            {
                Code = int.Parse(item.Value),
                Description = item.Key,
                Group = group,
            });
        }
        return data;
    }
}

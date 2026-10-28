using System.Linq.Expressions;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

public class GenericService<T> : IGenericService<T> where T : class
{
    private readonly IGenericRepository<T> _repository;
    public GenericService(IGenericRepository<T> repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<T>> GetAllAsync(bool hideInActive)
    {
        var result = await _repository.GetAllAsync(hideInActive);
        if (result is null || result.Count() == 0)
        {
            return Enumerable.Empty<T>();
        }
        return result;
    }
    public async Task<T> GetByIdAsync(Guid id)
    {
        var result = await _repository.GetByIdAsync(id);
        if (result is null)
        {
            return null;
        }

        return result;
    }
    public async Task<T> CreateAsync(T entity)
    {
        return await _repository.CreateAsync(entity);
    }
    public async Task UpdateAsync(T entity)
    {
        await _repository.UpdateAsync(entity);
    }
    public async Task<T> DeleteAsync(Guid id)
    {
        var result = await _repository.DeleteAsync(id);
        if (result is null)
        {
            return null;
        }

        return result;
    }         
}

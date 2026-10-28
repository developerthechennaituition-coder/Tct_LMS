using System.Linq.Expressions;

namespace TCT.LMS.Application;

public interface IGenericService<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync(bool hideInActive = false);
    Task<T> GetByIdAsync(Guid id);
    Task<T> CreateAsync(T entity);
    Task UpdateAsync(T entity);
    Task<T> DeleteAsync(Guid id);
}

using System.Linq.Expressions;

namespace TCT.LMS.Application;

public interface IGenericRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync(bool hideInActive = false);
    Task<T> GetByIdAsync(Guid id);
    Task<T> CreateAsync(T entity);
    Task UpdateAsync(T entity);
    Task<T> DeleteAsync(Guid id);
    Task<T> FindAsync(Expression<Func<T, bool>> expression);
    Task<IEnumerable<T>> FindAll(Expression<Func<T, bool>> expression);
}

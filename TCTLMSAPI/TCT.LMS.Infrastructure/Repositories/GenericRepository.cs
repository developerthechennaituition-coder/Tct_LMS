using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using TCT.LMS.Application;
using TCT.LMS.Data.Common;

namespace TCT.LMS.Infrastructure;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    public readonly ApplicationDbContext _dbContext;
    private readonly DbSet<T> _dbSet;

    public GenericRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
        _dbSet = dbContext.Set<T>();
    }
    
    public async Task<IEnumerable<T>> GetAllAsync(bool hideInActive = false)
    {
        var query = _dbContext.Set<T>().AsNoTracking();
        if (hideInActive)
        {
            query = query.Where(entity => EF.Property<bool>(entity, "IsActive"));
        }
        return await query.ToListAsync();
    }
    public async Task<T> GetByIdAsync(Guid id)
    {
        var result = await _dbContext.Set<T>().FindAsync(id);
        return result;
    }
    public async Task<T> CreateAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        await _dbContext.SaveChangesAsync();
        return entity;        
    }
    public async Task UpdateAsync(T entity)
    {
        // FindAsync/FirstOrDefaultAsync returns a tracked entity. Attaching it again can
        // throw during refresh-token rotation, which previously logged the user out.
        if (_dbContext.Entry(entity).State == EntityState.Detached)
        {
            _dbSet.Attach(entity);
        }
        _dbContext.Entry(entity).State = EntityState.Modified;
        await _dbContext.SaveChangesAsync();
    }
    public async Task<T> DeleteAsync(Guid id)
    {
        var entity = await _dbContext.Set<T>().FindAsync(id);
        if (entity is null)
        {
            return null;
        }
        bool currentIsActive = (bool)(typeof(T).GetProperty("IsActive")?.GetValue(entity) ?? false);
        bool newIsActive = !currentIsActive;

        typeof(T).GetProperty("IsActive")?.SetValue(entity, newIsActive);
        typeof(T).GetProperty("ModifiedDate")?.SetValue(entity, DateTime.Now);

        _dbContext.Update(entity);
        await _dbContext.SaveChangesAsync();

        return entity;
    }
    public async Task<T> FindAsync(Expression<Func<T, bool>> expression)
    {
        return await _dbContext.Set<T>().FirstOrDefaultAsync(expression);
    }
    public async Task<IEnumerable<T>> FindAll(Expression<Func<T, bool>> expression)
    {
        return await _dbContext.Set<T>().Where(expression).ToListAsync();
    }
}

namespace TCT.LMS.Application.Services;

// The caller resolves recipients and persists notifications first. Only independent
// SMTP operations run concurrently: never use a shared EF context inside send.
public static class AssignmentEmailBatch
{
    public static async Task SendAsync<T>(IEnumerable<T> messages, Func<T, Task> send,
        Action<T, Exception> onFailure, int concurrency = 3)
    {
        if (concurrency < 1) throw new ArgumentOutOfRangeException(nameof(concurrency));
        using var limit = new SemaphoreSlim(concurrency);
        await Task.WhenAll(messages.Select(async message =>
        {
            await limit.WaitAsync();
            try { await send(message); }
            catch (Exception ex) { onFailure(message, ex); }
            finally { limit.Release(); }
        }));
    }
}

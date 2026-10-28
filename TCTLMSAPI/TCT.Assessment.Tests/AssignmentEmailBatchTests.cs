using System.Collections.Concurrent;
using TCT.LMS.Application.Services;

namespace TCT.Assessment.Tests;

public class AssignmentEmailBatchTests
{
    [Fact]
    public async Task SendsEveryMessageAndAwaitsTheBoundedBatch()
    {
        var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var started = new ConcurrentBag<int>();
        var completed = new ConcurrentBag<int>();
        var pending = AssignmentEmailBatch.SendAsync(Enumerable.Range(1, 7), async id =>
        {
            started.Add(id);
            await gate.Task;
            completed.Add(id);
        }, (_, _) => Assert.True(false, "Unexpected send failure"), concurrency: 3);
        Assert.Equal(3, started.Count);
        Assert.Empty(completed);
        Assert.False(pending.IsCompleted);
        gate.SetResult(true);
        await pending.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(Enumerable.Range(1, 7), completed.OrderBy(x => x));
        Assert.Equal(7, started.Distinct().Count());
    }

    [Fact]
    public async Task AFailedEmailDoesNotSkipOtherRecipients()
    {
        var sent = new ConcurrentBag<int>();
        var failed = new ConcurrentBag<int>();
        await AssignmentEmailBatch.SendAsync(new[] { 1, 2, 3 }, id =>
        {
            if (id == 2) throw new IOException("Test SMTP outage");
            sent.Add(id);
            return Task.CompletedTask;
        }, (id, _) => failed.Add(id));
        Assert.Equal(new[] { 1, 3 }, sent.OrderBy(x => x));
        Assert.Equal(new[] { 2 }, failed);
    }

    [Fact]
    public async Task EmptyBatchDoesNotSend()
    {
        await AssignmentEmailBatch.SendAsync(Array.Empty<int>(), _ => throw new Exception("Unexpected send"),
            (_, _) => Assert.True(false));
    }

    [Fact]
    public async Task RejectsInvalidConcurrency()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => AssignmentEmailBatch.SendAsync(new[] { 1 },
            _ => Task.CompletedTask, (_, _) => { }, concurrency: 0));
    }
}

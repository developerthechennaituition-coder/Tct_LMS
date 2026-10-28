using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Services;

namespace TCT.LMS.API.Controllers;

public sealed class AssessmentExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is AssessmentException exception)
        {
            context.Result = new ObjectResult(new { success = false, message = exception.Message }) { StatusCode = exception.StatusCode };
            context.ExceptionHandled = true;
        }
        else if (context.Exception is DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
        {
            context.Result = new ConflictObjectResult(new { success = false, message = "This assessment or submission already exists. Refresh the list before trying again." });
            context.ExceptionHandled = true;
        }
    }
}

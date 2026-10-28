using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class CheckPolicyAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _policyName;

    public CheckPolicyAttribute(string policyName)
    {
        _policyName = policyName;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var services = context.HttpContext.RequestServices;
        var policyProvider = services.GetRequiredService<IAuthorizationPolicyProvider>();
        var authService = services.GetRequiredService<IAuthorizationService>();

        var policy = await policyProvider.GetPolicyAsync(_policyName);

        if (policy == null)
        {
            context.Result = new ForbidResult();
            return;
        }

        var result = await authService.AuthorizeAsync(context.HttpContext.User, null, policy);

        if (!result.Succeeded)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}

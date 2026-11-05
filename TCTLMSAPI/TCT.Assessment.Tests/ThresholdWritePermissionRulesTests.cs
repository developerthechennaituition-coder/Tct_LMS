using Rules = TCT.LMS.Application.Services.ThresholdWritePermissionRules;

namespace TCT.Assessment.Tests;

public class ThresholdWritePermissionRulesTests
{
    [Theory]
    [InlineData("POST", Rules.Permission.Add)]
    [InlineData("PUT", Rules.Permission.Edit)]
    [InlineData("DELETE", Rules.Permission.Delete)]   // activate / inactivate
    [InlineData("delete", Rules.Permission.Delete)]
    [InlineData("GET", Rules.Permission.None)]        // reading is not restricted
    [InlineData("HEAD", Rules.Permission.None)]
    [InlineData(null, Rules.Permission.None)]
    public void EachChangeNeedsItsMenuPermission(string? method, Rules.Permission expected)
    {
        Assert.Equal(expected, Rules.RequiredPermission(method));
    }

    [Fact]
    public void OnlyTheMatchingPermissionGrantsTheChange()
    {
        Assert.True(Rules.Grants(Rules.Permission.Add, add: true, edit: false, delete: false));
        Assert.False(Rules.Grants(Rules.Permission.Add, add: false, edit: true, delete: true));
        Assert.True(Rules.Grants(Rules.Permission.Edit, add: false, edit: true, delete: false));
        Assert.False(Rules.Grants(Rules.Permission.Edit, add: true, edit: false, delete: true));
        Assert.True(Rules.Grants(Rules.Permission.Delete, add: false, edit: false, delete: true));
        Assert.False(Rules.Grants(Rules.Permission.Delete, add: true, edit: true, delete: false));
    }

    [Fact]
    public void ViewOnlyRoleCannotChangeThresholds()
    {
        foreach (var required in new[] { Rules.Permission.Add, Rules.Permission.Edit, Rules.Permission.Delete })
            Assert.False(Rules.Grants(required, add: false, edit: false, delete: false));
    }

    [Fact]
    public void ThePermissionIsReadForTheThresholdConfigurationMenu()
    {
        Assert.Equal("/threshold-config", Rules.MenuLink);
    }
}

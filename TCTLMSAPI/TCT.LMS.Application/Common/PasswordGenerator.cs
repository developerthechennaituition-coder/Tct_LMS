namespace TCT.LMS.Application.Common;

public static class PasswordGenerator
{
    private static readonly Random _rng = new();
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Lower = "abcdefghjkmnpqrstuvwxyz";
    private const string Digits = "23456789";
    private const string Special = "@#$!";
    private const string All = Upper + Lower + Digits + Special;

    public static string Generate(int length = 12)
    {
        var chars = new char[length];
        chars[0] = Upper[_rng.Next(Upper.Length)];
        chars[1] = Lower[_rng.Next(Lower.Length)];
        chars[2] = Digits[_rng.Next(Digits.Length)];
        chars[3] = Special[_rng.Next(Special.Length)];
        for (int i = 4; i < length; i++)
            chars[i] = All[_rng.Next(All.Length)];
        return new string(chars.OrderBy(_ => _rng.Next()).ToArray());
    }
}

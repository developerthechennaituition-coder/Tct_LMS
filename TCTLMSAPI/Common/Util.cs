namespace Common
{
    public class Util
    {
        public static string GetNextNumber(int counter)
        {
            counter++;
            return counter.ToString("D4");
        }
    }
}

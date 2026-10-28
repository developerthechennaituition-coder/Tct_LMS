using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Common
{
    public static class EnumHelper
    {
        public static Dictionary<int, string> GetEnumDescriptionDictionary<TEnum>() where TEnum : Enum
        {
            return Enum.GetValues(typeof(TEnum))
                       .Cast<TEnum>()
                       .ToDictionary(
                           enumVal => Convert.ToInt32(enumVal),
                           enumVal => GetDescription(enumVal)
                       );
        }

        private static string GetDescription<TEnum>(TEnum value) where TEnum : Enum
        {
            var field = value.GetType().GetField(value.ToString());
            var description = field.GetCustomAttribute<DescriptionAttribute>()?.Description;

            return description ?? value.ToString();
        }
    }
}

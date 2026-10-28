using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Net.Mime.MediaTypeNames;

namespace TCT.LMS.DTOs.Menu
{
    public class MenuItem
    {
        public int SortOrder { get; set; }

        //        key={item.text
        //    }
        //    link={item.link
        //}
        //icon ={ item.icon}
        //text ={ item.text}
        //sub ={ item.subMenu}
        //badge ={ item.badge}
        //newTab ={ item.newTab}
        public int Id { get; set; }
        public string Text { get; set; }
        public string Icon { get; set; }
        public string Link { get; set; }
        public string Description { get; set; }
        public string Badge { get; set; }
        public bool IsMenu { get; set; }
        public bool IsParentMenu { get; set; }
        public bool NewTab { get;set; }
        public int ParentMenuId { get; set; }
        public bool Add { get; set; }
        public bool View { get; set; }
        public bool Edit { get; set; }
        public bool Delete { get; set; }
        public bool Report { get; set; }
        public bool MapBank { get; set; }
        public List<MenuItem> SubMenu { get; set; } = new List<MenuItem>();
    }
}

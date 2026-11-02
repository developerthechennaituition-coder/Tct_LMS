// Sidebar: is a menu item's link the current page? A link may carry a query (My Calendar → Tasks:
// "/lms/my-calendar?tab=tasks"); it matches when the path is the same and the URL has each of its query values.
// Among items of the same list, the most specific match wins, so "/lms/my-calendar" is not highlighted while
// "/lms/my-calendar?tab=tasks" is. Links without a query behave as before (exact path).

// 0 = no match; otherwise 1 + the number of query values matched.
const matchScore = (link, pathname, search, base) => {
  if (!link) return 0;
  const [path, query = ""] = String(link).split("?");
  if (base + path !== pathname) return 0;
  const wanted = [...new URLSearchParams(query).entries()];
  const current = new URLSearchParams(search || "");
  return wanted.every(([key, value]) => current.get(key) === value) ? 1 + wanted.length : 0;
};

export const isCurrentMenuLink = (link, siblingLinks, pathname, search, base = "") => {
  const score = matchScore(link, pathname, search, base);
  if (score === 0) return false;
  return !(siblingLinks || []).some((other) => other !== link && matchScore(other, pathname, search, base) > score);
};

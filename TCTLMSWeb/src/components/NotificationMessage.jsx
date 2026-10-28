import React from "react";

const allowedFormatting = /&lt;(\/?)\s*(b|strong|i|em|br)\s*\/?&gt;/gi;

const renderNodes = (nodes, prefix = "message") =>
  Array.from(nodes).map((node, index) => {
    const key = `${prefix}-${index}`;
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;

    const tag = node.tagName.toLowerCase();
    if (tag === "script" || tag === "style") return null;
    if (tag === "br") return <br key={key} />;

    const children = renderNodes(node.childNodes, key);
    if (tag === "b" || tag === "strong") return <strong key={key}>{children}</strong>;
    if (tag === "i" || tag === "em") return <em key={key}>{children}</em>;
    if (tag === "p" || tag === "div") return <span key={key}>{children}<br /></span>;
    return <React.Fragment key={key}>{children}</React.Fragment>;
  });

const NotificationMessage = ({ message }) => {
  const html = String(message || "").replace(allowedFormatting, (_, closing, tag) =>
    tag.toLowerCase() === "br" ? "<br>" : `<${closing}${tag}>`
  );
  const document = new DOMParser().parseFromString(html, "text/html");
  return <>{renderNodes(document.body.childNodes)}</>;
};

export default NotificationMessage;

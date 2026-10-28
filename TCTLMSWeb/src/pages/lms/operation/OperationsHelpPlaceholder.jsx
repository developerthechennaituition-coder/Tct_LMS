import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes } from "../../../components/Component";

// Placeholder target for the Operations sidebar "Help" submenus (Help, PTM).
// No functionality yet; replace with the real page when it is built.
const OperationsHelpPlaceholder = ({ title }) => {
  return (
    <React.Fragment>
      <Head title={title} />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">
              {title}
            </BlockTitle>
            <BlockDes className="text-soft">
              <p>This page is coming soon.</p>
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block />
      </Content>
    </React.Fragment>
  );
};

export default OperationsHelpPlaceholder;

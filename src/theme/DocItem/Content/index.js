import React from "react";
import Content from "@theme-original/DocItem/Content";
import EnvironmentNotice from "@site/src/components/EnvironmentNotice";

// Every guide starts with the "testing and evaluation only" notice, including
// pages that are added later. It renders nothing for a production build.
export default function ContentWrapper(props) {
  return (
    <>
      <EnvironmentNotice />
      <Content {...props} />
    </>
  );
}

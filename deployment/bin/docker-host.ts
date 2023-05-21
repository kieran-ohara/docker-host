import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import { DockerHostStack } from "../lib/docker-host";

const app = new cdk.App();
new DockerHostStack(app, "DockerHostStack", {
  env: {
    region: "eu-west-2",
    account: "649526441784",
  },
});

import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as route53 from "aws-cdk-lib/aws-route53";

export class DockerHostStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      isDefault: true,
    });

    const publicSubnet = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
      availabilityZones: ["eu-west-2a"],
    });

    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });

    [].map.call([80, 443, 22], (port) => {
      securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        new ec2.Port({
          fromPort: port,
          toPort: port,
          protocol: ec2.Protocol.TCP,
          stringRepresentation: "allow HTTP access from anywhere",
        })
      );
    });

    const [machineName, instanceType, route53Zone, route53Record] = [
      "machineName",
      "instanceType",
      "route53Zone",
      "route53Record",
    ].map((contextKey) => {
      const contextValue = this.node.tryGetContext(contextKey);
      if (contextValue === undefined) {
        throw new Error(`Missing context value for ${contextKey}`);
      }
      return contextValue;
    });

    console.log({ machineName });
    const instance = new ec2.Instance(this, "Instance", {
      vpc,
      vpcSubnets: publicSubnet,
      instanceType: new ec2.InstanceType(instanceType),
      machineImage: new ec2.LookupMachineImage({
        name: machineName,
      }),
      securityGroup,
    });

    const elasticIp = new ec2.CfnEIP(this, "EIP", {
      domain: "vpc",
      instanceId: instance.instanceId,
    });

    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: route53Zone,
    });

    new route53.ARecord(this, "ARecord", {
      zone,
      recordName: route53Record,
      target: route53.RecordTarget.fromIpAddresses(elasticIp.ref),
    });

    new cdk.CfnOutput(this, "OutputEIP", {
      value: elasticIp.ref,
      description: "Elastic IP for the instance",
    });
  }
}

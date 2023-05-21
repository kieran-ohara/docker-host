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

    const [machineName, instanceType, route53Zone, route53Record, myIP] = [
      "machineName",
      "instanceType",
      "route53Zone",
      "route53Record",
      "myIP"
    ].map((contextKey) => {
      const contextValue = this.node.tryGetContext(contextKey);
      if (contextValue === undefined) {
        throw new Error(`Missing context value for ${contextKey}`);
      }
      return contextValue;
    });

    [].map.call([
      {
        port :80,
        description: 'Allow HTTP',
        from: ec2.Peer.anyIpv4(),
      },
      {
        port :8080,
        description: 'Allow dashbaord',
        from: ec2.Peer.ipv4(myIP),
      },
      {
        port :22,
        description: 'Allow ssh',
        from: ec2.Peer.ipv4(myIP),
      },
    ], ({port, description, from}) => {
        securityGroup.addIngressRule(
          from,
          new ec2.Port({
            fromPort: port,
            toPort: port,
            protocol: ec2.Protocol.TCP,
            stringRepresentation: description
          })
        );
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
      keyName: "docker-host",
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

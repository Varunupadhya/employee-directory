import * as cdk from 'aws-cdk-lib';
import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'employee-directory';

    const vpc = new ec2.Vpc(this, 'EmployeeDirectoryVpc', {
      vpcName: `${appName}-vpc`,
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, 'EmployeeDirectoryCluster', {
      clusterName: `${appName}-cluster`,
      vpc: vpc,
    });

    const repository = ecr.Repository.fromRepositoryName(
      this,
      'EmployeeDirectoryRepository',
      'employee-directory'
    );

    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'EmployeeDirectoryFargateService',
      {
        serviceName: `${appName}-service`,
        cluster: cluster,

        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,

        publicLoadBalancer: true,
        listenerPort: 80,

        assignPublicIp: true,
        taskSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },

        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
          containerName: 'employee-directory-container',
          containerPort: 8080,
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: 'employee-directory',
          }),
        },
      }
    );

    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    new CfnOutput(this, 'ApplicationUrl', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}`,
      description: 'Employee Directory application URL',
    });

    new CfnOutput(this, 'LoadBalancerDnsName', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
    });

    new CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name',
    });

    new CfnOutput(this, 'ServiceName', {
      value: fargateService.service.serviceName,
      description: 'ECS Fargate service name',
    });
  }
}
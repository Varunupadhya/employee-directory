import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  Duration,
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'employee-directory';

    // VPC with public subnets only to avoid NAT Gateway cost
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

    // ECS Cluster with Container Insights enabled
    const cluster = new ecs.Cluster(this, 'EmployeeDirectoryCluster', {
      clusterName: `${appName}-cluster`,
      vpc: vpc,
      containerInsights: true,
    });

    // Existing ECR repository
    const repository = ecr.Repository.fromRepositoryName(
      this,
      'EmployeeDirectoryRepository',
      'employee-directory'
    );

    // DynamoDB table for employee records
    const employeeTable = new dynamodb.Table(this, 'EmployeeDirectoryTable', {
      tableName: `${appName}-table`,
      partitionKey: {
        name: 'employeeId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // CloudWatch Log Group for ECS container logs
    const logGroup = new logs.LogGroup(this, 'EmployeeDirectoryLogGroup', {
      logGroupName: `/ecs/${appName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ECS Fargate service with Application Load Balancer
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
          containerName: `${appName}-container`,
          containerPort: 8080,

          environment: {
            DYNAMODB_TABLE_NAME: employeeTable.tableName,
            AWS_REGION_NAME: Stack.of(this).region,
          },

          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: appName,
            logGroup: logGroup,
          }),
        },
      }
    );

    // Give ECS task permission to read and write DynamoDB
    employeeTable.grantReadWriteData(fargateService.taskDefinition.taskRole);

    // ALB Target Group Health Check
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // ECS Auto Scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 3,
    });

    scaling.scaleOnCpuUtilization('CpuScalingPolicy', {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScalingPolicy', {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    // CloudWatch Alarm - High ECS CPU
    new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: `${appName}-high-cpu-alarm`,
      metric: fargateService.service.metricCpuUtilization({
        period: Duration.minutes(1),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // CloudWatch Alarm - High ECS Memory
    new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      alarmName: `${appName}-high-memory-alarm`,
      metric: fargateService.service.metricMemoryUtilization({
        period: Duration.minutes(1),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // CloudWatch Alarm - ALB 5XX errors
    new cloudwatch.Alarm(this, 'Alb5xxAlarm', {
      alarmName: `${appName}-alb-5xx-alarm`,
      metric: fargateService.loadBalancer.metrics.httpCodeElb(
        elbv2.HttpCodeElb.ELB_5XX_COUNT,
        {
          period: Duration.minutes(1),
        }
      ),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // CloudWatch Alarm - Unhealthy ECS target
    new cloudwatch.Alarm(this, 'UnhealthyTargetAlarm', {
      alarmName: `${appName}-unhealthy-target-alarm`,
      metric: fargateService.targetGroup.metrics.unhealthyHostCount({
        period: Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // Outputs
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

    new CfnOutput(this, 'DynamoDbTableName', {
      value: employeeTable.tableName,
      description: 'DynamoDB table name',
    });

    new CfnOutput(this, 'CloudWatchLogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
    });
  }
}
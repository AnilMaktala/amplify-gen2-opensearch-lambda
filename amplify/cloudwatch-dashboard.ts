// cloudwatch-dashboard.ts
import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function createCloudWatchDashboard(
  stack: cdk.Stack,
  streamProcessorLambda: lambda.Function,
  tableName: string
) {
  const dashboard = new cdk.aws_cloudwatch.Dashboard(stack, "Dashboard", {
    dashboardName: "Dashboard",
  });

  // Lambda Metrics
  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "Lambda Function Invocations",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "Invocations",
          dimensionsMap: {
            FunctionName: streamProcessorLambda.functionName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "Lambda Function Duration",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "Duration",
          dimensionsMap: {
            FunctionName: streamProcessorLambda.functionName,
          },
          statistic: "Average",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "Lambda Function Errors",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "Errors",
          dimensionsMap: {
            FunctionName: streamProcessorLambda.functionName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "Lambda Function Throttles",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "Throttles",
          dimensionsMap: {
            FunctionName: streamProcessorLambda.functionName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "Lambda Function Concurrent Executions",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/Lambda",
          metricName: "ConcurrentExecutions",
          dimensionsMap: {
            FunctionName: streamProcessorLambda.functionName,
          },
          statistic: "Maximum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  // DynamoDB Metrics
  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Records",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "Records",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Read Throughput",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "ReadThroughput",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Average",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Write Throughput",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "WriteThroughput",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Average",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Get Requests",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "GetRequests",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Put Requests",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "PutRequests",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Update Requests",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "UpdateRequests",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream Delete Requests",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "DeleteRequests",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream System Errors",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "SystemErrors",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  dashboard.addWidgets(
    new cdk.aws_cloudwatch.GraphWidget({
      title: "DynamoDB Stream User Errors",
      left: [
        new cdk.aws_cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "UserErrors",
          dimensionsMap: {
            TableName: tableName,
          },
          statistic: "Sum",
          period: Duration.minutes(1),
        }),
      ],
    })
  );

  return dashboard;
}

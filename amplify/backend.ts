import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { RemovalPolicy, Duration } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
const backend = defineBackend({
  auth,
  data,
});

const todoTable =
  backend.data.resources.cfnResources.amplifyDynamoDbTables["Todo"];

// Update table settings
todoTable.pointInTimeRecoveryEnabled = true;
todoTable.streamSpecification = {
  streamViewType: dynamodb.StreamViewType.NEW_IMAGE,
};

const tableArn = backend.data.resources.tables["Todo"].tableArn;
const tableName = backend.data.resources.tables["Todo"].tableName;

const openSearchDomain = new opensearch.Domain(
  backend.data.stack,
  "OpenSearchDomain",
  {
    version: opensearch.EngineVersion.OPENSEARCH_2_11,
    capacity: {
      masterNodeInstanceType: "t3.small.search",
      masterNodes: 0,
      dataNodeInstanceType: "t3.small.search",
      dataNodes: 1,
    },
    nodeToNodeEncryption: true,
    removalPolicy: RemovalPolicy.DESTROY,
    encryptionAtRest: {
      enabled: true,
    },
  }
);

// Create IAM role for Lambda
const lambdaRole = new iam.Role(backend.data.stack, "OpenSearchLambdaRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
});

// Add permissions to the Lambda role
lambdaRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "es:ESHttp*",
      "es:DescribeElasticsearchDomain",
      "es:ListDomainNames",
    ],
    resources: [openSearchDomain.domainArn, `${openSearchDomain.domainArn}/*`],
  })
);

// Add CloudWatch Logs permissions
lambdaRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ],
    resources: ["*"],
  })
);

// Create a Lambda function to process DynamoDB streams and index into OpenSearch
const streamProcessorLambda = new lambda.Function(
  backend.data.stack,
  "StreamProcessorLambda",
  {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset("lambda"),
    timeout: cdk.Duration.minutes(5),
    environment: {
      OPENSEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      OPENSEARCH_INDEX: "todo",
      REGION: cdk.Stack.of(backend.data.stack).region,
    },
  }
);

// Add DynamoDB Stream as an event source for the Lambda function
streamProcessorLambda.addEventSource(
  new DynamoEventSource(backend.data.resources.tables["Todo"], {
    startingPosition: StartingPosition.LATEST,
    batchSize: 100,
    retryAttempts: 3,
  })
);

// Grant the Lambda function permissions to access OpenSearch domain
openSearchDomain.grantIndexReadWrite("dynamodb-data", streamProcessorLambda);

// Add IAM policy to allow the Lambda to describe the OpenSearch domain
streamProcessorLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["es:ESHttp*", "es:DescribeElasticsearchDomain"],
    resources: [openSearchDomain.domainArn, `${openSearchDomain.domainArn}/*`],
  })
);

// Add OpenSearch data source
const osDataSource = backend.data.addOpenSearchDataSource(
  "osDataSource",
  openSearchDomain
);

// Outputs
new cdk.CfnOutput(backend.data.stack, "DynamoDBTableName", {
  value: tableName,
  description: "The name of the DynamoDB table",
});

new cdk.CfnOutput(backend.data.stack, "OpenSearchDomainEndpoint", {
  value: openSearchDomain.domainEndpoint,
  description: "The endpoint of the OpenSearch domain",
});

new cdk.CfnOutput(backend.data.stack, "LambdaFunctionName", {
  value: streamProcessorLambda.functionName,
  description: "The name of the stream processor Lambda function",
});


// add code to implment cloudwatch dashboard for the lambda function
const dashboard = new cdk.aws_cloudwatch.Dashboard(
  backend.data.stack,
  "Dashboard",
  {
    dashboardName: "Dashboard",
  }
);
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

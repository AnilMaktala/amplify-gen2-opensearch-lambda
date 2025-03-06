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
import { createCloudWatchDashboard } from "./cloudwatch-dashboard";
import { createStreamProcessorLambda } from "./lambda/stream-processor";
import { createOpenSearchDomain } from "./opensearch-domain";

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

// Create OpenSearch domain and IAM role from the extracted module
const { domain: openSearchDomain, role: lambdaRole } = createOpenSearchDomain(
  backend.data.stack,
  "OpenSearchDomain" // Customize domain name
);

// Create a Lambda function to process DynamoDB streams and index into OpenSearch

const streamProcessorLambda = createStreamProcessorLambda(
  backend.data.stack,
  backend.data.resources.tables["Todo"],
  openSearchDomain,
  tableArn,
  "StreamProcessorLambda", // Customize function name
  "todo" // Customize index name
);

// Grant the Lambda function permissions to access OpenSearch domain
openSearchDomain.grantIndexReadWrite("dynamodb-data", streamProcessorLambda);

// Add OpenSearch data source
const osDataSource = backend.data.addOpenSearchDataSource(
  "osDataSource1",
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

// Create CloudWatch Dashboard
createCloudWatchDashboard(backend.data.stack, streamProcessorLambda, tableName);

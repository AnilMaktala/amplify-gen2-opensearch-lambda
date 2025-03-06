import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Domain } from "aws-cdk-lib/aws-opensearchservice";

/**
 * Creates a Lambda function that processes DynamoDB streams and indexes data into OpenSearch
 * @param stack The CDK stack
 * @param todoTable The DynamoDB table to process streams from
 * @param openSearchDomain The OpenSearch domain to index data into
 * @param tableArn The ARN of the DynamoDB table
 * @param functionName The name of the Lambda function (optional)
 * @param indexName The name of the OpenSearch index (optional)
 * @param lambdaCodePath The path to the Lambda code (optional)
 */
export function createStreamProcessorLambda(
  stack: cdk.Stack,
  todoTable: ITable,
  openSearchDomain: Domain,
  tableArn: string,
  functionName: string = "StreamProcessorLambda",
  indexName: string,
  lambdaCodePath: string = "lambda"
): lambda.Function {
  // Create a Lambda function to process DynamoDB streams and index into OpenSearch
  const streamProcessorLambda = new lambda.Function(stack, functionName, {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(lambdaCodePath),
    timeout: cdk.Duration.minutes(5),
    environment: {
      OPENSEARCH_DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,
      OPENSEARCH_INDEX: indexName,
      REGION: stack.region,
    },
    functionName: functionName,
  });

  // Add DynamoDB Stream as an event source for the Lambda function
  streamProcessorLambda.addEventSource(
    new DynamoEventSource(todoTable, {
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
      actions: [
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpGet",
        "es:ESHttpHead",
        "es:DescribeElasticsearchDomain",
      ],
      resources: [
        openSearchDomain.domainArn,
        `${openSearchDomain.domainArn}/*`,
      ],
    })
  );

  // Add specific DynamoDB permissions for stream processing
  streamProcessorLambda.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:DescribeStream",
        "dynamodb:ListStreams",
      ],
      resources: [`${tableArn}/stream/*`],
    })
  );

  return streamProcessorLambda;
}

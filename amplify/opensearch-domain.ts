import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";

/**
 * Creates an OpenSearch domain with IAM role for Lambda function access
 * @param stack The CDK stack
 * @param domainName The name of the OpenSearch domain (optional)
 * @returns An object containing the OpenSearch domain and IAM role
 */
export function createOpenSearchDomain(
  stack: cdk.Stack,
  domainName: string = "OpenSearchDomain"
) {
  // Create OpenSearch domain
  const openSearchDomain = new opensearch.Domain(stack, domainName, {
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
  });

  // Create IAM role for Lambda
  const lambdaRole = new iam.Role(stack, "OpenSearchLambdaRole", {
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  });

  // Add permissions to the Lambda role
  lambdaRole.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpGet",
        "es:ListDomainNames",
        "es:DescribeElasticsearchDomain",
      ],
      resources: [
        openSearchDomain.domainArn,
        `${openSearchDomain.domainArn}/*`,
      ],
    })
  );

  // Scope down CloudWatch Logs permissions to specific log group
  lambdaRole.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: [
        `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/*`,
      ],
    })
  );

  return {
    domain: openSearchDomain,
    role: lambdaRole,
  };
}

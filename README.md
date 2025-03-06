# Amplify Gen 2 OpenSearch with Lambda Integration

This repository demonstrates how to integrate AWS Amplify Gen 2 with Amazon OpenSearch using AWS Lambda functions. It showcases a serverless architecture for real-time data indexing from DynamoDB to OpenSearch for powerful search capabilities in your Amplify applications.

## Architecture Overview

This sample includes:

1. **AWS Amplify Gen 2 Backend** - Defines the data models and authentication
2. **Amazon DynamoDB** - Stores application data with stream capability enabled
3. **AWS Lambda Function** - Processes DynamoDB streams and indexes data into OpenSearch
4. **Amazon OpenSearch Service** - Provides full-text search capabilities
5. **CloudWatch Dashboard** - Monitors the OpenSearch and Lambda performance

![Architecture Diagram](https://via.placeholder.com/800x400?text=Architecture+Diagram)

## Features

- Automatic indexing of DynamoDB data into OpenSearch
- Support for  OpenSearch Service domains
- Real-time data processing using DynamoDB Streams
- IAM role-based security with least privilege
- CloudWatch monitoring dashboard
- TypeScript CDK infrastructure as code

## Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or later)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [AWS Amplify CLI](https://docs.amplify.aws/cli/start/install/) (latest version)

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/username/amplify-gen2-opensearch-lambda.git
   cd amplify-gen2-opensearch-lambda
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Deploy the Amplify backend:
   ```
   npx ampx sandbox
   ```

4. Deploy to your AWS account:
   ```
   npx ampx deploy
   ```

## Configuration

The Lambda function uses the following environment variables which are automatically set during deployment:

- `OPENSEARCH_DOMAIN_ENDPOINT` - The endpoint URL for your OpenSearch domain
- `OPENSEARCH_COLLECTION_ENDPOINT` - The endpoint URL for your OpenSearch Serverless collection (if using)
- `OPENSEARCH_INDEX` - The index name (defaults to "dynamodb-data")
- `REGION` - AWS region (defaults to "us-east-1")
- `USE_SERVERLESS_COLLECTION` - Set to "true" to use OpenSearch Serverless instead of OpenSearch Service

## How It Works

1. When data is added, updated, or deleted in DynamoDB, it triggers an event on the DynamoDB stream
2. The Lambda function processes these events and performs the corresponding operations in OpenSearch
3. The data becomes available for search queries through the OpenSearch API

## Customization

### Modifying the OpenSearch Domain

Edit `opensearch-domain.ts` to change instance types, number of nodes, or other OpenSearch configuration options.

### Adjusting the Lambda Function

The Lambda function in `lambda/index.js` processes the DynamoDB stream events. You can customize the document structure, mapping, and how the data is indexed.

### Changing Data Models

Update the Amplify data models in the `amplify/data` directory to match your application needs.

## Security Best Practices

This sample follows these security best practices:

- No hardcoded credentials
- IAM roles with least privilege
- Node-to-node encryption in OpenSearch
- Encryption at rest for data
- Environment variables for configuration

## License

ISC License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
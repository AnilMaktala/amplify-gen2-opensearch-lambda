const { Client } = require("@opensearch-project/opensearch");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { AwsSigv4Signer } = require("@opensearch-project/opensearch/aws");

// Environment variables
const OPENSEARCH_COLLECTION_ENDPOINT = process.env.OPENSEARCH_COLLECTION_ENDPOINT;
const OPENSEARCH_DOMAIN_ENDPOINT = process.env.OPENSEARCH_DOMAIN_ENDPOINT;
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || "dynamodb-data";
const REGION = process.env.REGION || "us-east-1";
const USE_SERVERLESS_COLLECTION = process.env.USE_SERVERLESS_COLLECTION === "true";

// Determine the endpoint to use based on environment
const endpoint = USE_SERVERLESS_COLLECTION 
  ? OPENSEARCH_COLLECTION_ENDPOINT 
  : `https://${OPENSEARCH_DOMAIN_ENDPOINT}`;

// Create OpenSearch client with AWS Signature v4 authentication
const client = new Client({
  ...AwsSigv4Signer({
    region: REGION,
    // Use 'aoss' service name for serverless collections, 'es' for domains
    service: USE_SERVERLESS_COLLECTION ? "aoss" : "es",
    getCredentials: () => defaultProvider()(),
  }),
  node: endpoint,
});

/**
 * Ensures the OpenSearch index exists, creates it if it doesn't
 */
async function ensureIndexExists() {
  try {
    const { body: exists } = await client.indices.exists({
      index: OPENSEARCH_INDEX,
    });

    if (!exists) {
      await client.indices.create({
        index: OPENSEARCH_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: "keyword" },
              timestamp: { type: "date" },
              // content: { type: "text" },
              // Add other fields as needed based on your DynamoDB schema
            },
          },
        },
      });
      console.log(`Created index: ${OPENSEARCH_INDEX}`);
    }
  } catch (error) {
    console.error("Error ensuring index exists:", error);
    throw error;
  }
}

/**
 * Processes DynamoDB Stream events and indexes records to OpenSearch
 */
exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Ensure the index exists
    await ensureIndexExists();

    const operations = [];

    // Process each record from the DynamoDB Stream
    for (const record of event.Records) {
      if (record.eventName === "REMOVE") {
        // Handle deleted items
        if (record.dynamodb.Keys) {
          const id = record.dynamodb.Keys.id.S;
          operations.push({
            delete: {
              _index: OPENSEARCH_INDEX,
              _id: id,
            },
          });
        }
      } else if (
        record.eventName === "INSERT" ||
        record.eventName === "MODIFY"
      ) {
        // Handle new or updated items
        if (record.dynamodb.NewImage) {
          const newImage = unmarshallDynamoDBItem(record.dynamodb.NewImage);
          const id = newImage.id;

          operations.push(
            { index: { _index: OPENSEARCH_INDEX, _id: id } },
            {
              ...newImage,
              timestamp:
                record.dynamodb.ApproximateCreationDateTime * 1000 ||
                new Date().getTime(),
            }
          );
        }
      }
    }

    if (operations.length > 0) {
      // Execute bulk operations on OpenSearch
      const { body: bulkResponse } = await client.bulk({
        refresh: true,
        body: operations,
      });

      if (bulkResponse.errors) {
        const erroredDocuments = [];
        bulkResponse.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],
              document: operations[i * 2 + 1],
            });
          }
        });
        console.error(
          "Failed documents:",
          JSON.stringify(erroredDocuments, null, 2)
        );
        throw new Error("Failed to index all documents");
      }

      console.log(`Successfully processed ${bulkResponse.items.length} items.`);
      return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };
    } else {
      console.log("No operations to perform");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No operations to perform" }),
      };
    }
  } catch (error) {
    console.error("Error processing DynamoDB stream records:", error);
    throw error;
  }
};

/**
 * Unmarshalls a DynamoDB item into a regular JavaScript object
 */
function unmarshallDynamoDBItem(item) {
  const result = {};

  for (const [key, value] of Object.entries(item)) {
    if (value.S !== undefined) result[key] = value.S;
    else if (value.N !== undefined) result[key] = Number(value.N);
    else if (value.BOOL !== undefined) result[key] = value.BOOL;
    else if (value.NULL !== undefined) result[key] = null;
    else if (value.M !== undefined)
      result[key] = unmarshallDynamoDBItem(value.M);
    else if (value.L !== undefined) {
      result[key] = value.L.map((item) => {
        if (item.S !== undefined) return item.S;
        if (item.N !== undefined) return Number(item.N);
        if (item.BOOL !== undefined) return item.BOOL;
        if (item.NULL !== undefined) return null;
        if (item.M !== undefined) return unmarshallDynamoDBItem(item.M);
        return item;
      });
    } else if (value.SS !== undefined) result[key] = value.SS;
    else if (value.NS !== undefined) result[key] = value.NS.map(Number);
    else result[key] = value;
  }

  return result;
}

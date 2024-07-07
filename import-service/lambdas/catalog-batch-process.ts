import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import {
	DynamoDBDocumentClient,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";

const TOPIC_ARN = process.env.TOPIC_ARN as string;
const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

const snsClient = new SNSClient();
const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const catalogBatchProcess = async (event: SQSEvent) => {
	console.log("catalogBatchProcess event", event);

	try {
		await Promise.all(
			event.Records.map(async (record) => {
				const product = JSON.parse(record.body);
				const productId = randomUUID();

				const command = new TransactWriteCommand({
					TransactItems: [
						{
							Put: {
								TableName: PRODUCT_TABLE_NAME,
								Item: {
									id: productId,
									title: product.title,
									description: product.description,
									price: product.price,
								},
							},
						},
						{
							Put: {
								TableName: STOCK_TABLE_NAME,
								Item: {
									product_id: productId,
									count: product.count,
								},
							},
						},
					],
				});

				await ddbDocClient.send(command);
				await snsClient.send(
					new PublishCommand({
						TopicArn: TOPIC_ARN,
						Message: JSON.stringify(product),
						Subject: "New product added",
					}),
				);
			}),
		);
	} catch (error) {
		console.error("Error processing SQS event:", error);
		throw error;
	}
};

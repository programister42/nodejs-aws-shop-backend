import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from "aws-lambda";

import { createResponse } from "./shared/create-response";

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

export const createProduct: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("createProduct event", event);

	try {
		const product = event.body ? JSON.parse(event.body) : {};
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

		return createResponse(201, { message: "Product created" });
	} catch (error: unknown) {
		return createResponse(500, { message: "Internal server error" });
	}
};

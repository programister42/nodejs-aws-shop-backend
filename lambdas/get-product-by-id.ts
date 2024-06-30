import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
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

export const getProductById: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("getProductById event", event);

	try {
		const { id } = event.pathParameters ?? {};
		if (!id) return createResponse(400, { message: "Product ID is required" });

		const getProductCommand = new GetCommand({
			TableName: PRODUCT_TABLE_NAME,
			Key: { id },
		});
		const getProductResponse = await ddbDocClient.send(getProductCommand);
		const productItem = getProductResponse.Item;

		const getStockCommand = new GetCommand({
			TableName: STOCK_TABLE_NAME,
			Key: { product_id: id },
		});
		const getStockResponse = await ddbDocClient.send(getStockCommand);
		const stockItem = getStockResponse.Item;

		if (!productItem || !stockItem)
			return createResponse(404, { message: "Product not found" });

		const product = {
			...productItem,
			count: stockItem.count,
		};

		return createResponse(200, product);
	} catch (error: unknown) {
		return createResponse(500, { message: "Internal server error" });
	}
};

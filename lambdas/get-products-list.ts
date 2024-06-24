import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
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

export const getProductsList: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("getProductsList event", event);

	try {
		const scanProductsCommand = new ScanCommand({
			TableName: PRODUCT_TABLE_NAME,
		});
		const scanProductsResponse = await ddbDocClient.send(scanProductsCommand);
		const products = scanProductsResponse.Items;

		const scanStocksCommand = new ScanCommand({
			TableName: STOCK_TABLE_NAME,
		});
		const scanStocksResponse = await ddbDocClient.send(scanStocksCommand);
		const stocks = scanStocksResponse.Items;

		if (!products || !stocks) throw new Error("Products not found");

		const productsWithStock = products.map((product) => {
			const stock = stocks.find((stock) => stock.product_id === product.id);
			return {
				...product,
				count: stock?.count,
			};
		});

		return createResponse(200, productsWithStock);
	} catch (error: unknown) {
		return createResponse(500, { message: "Internal server error" });
	}
};

import type { APIGatewayProxyResult, Handler } from "aws-lambda";

export const getProductsList: Handler =
	async (): Promise<APIGatewayProxyResult> => ({
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
		},
		body: process.env.PRODUCTS ?? JSON.stringify([]),
	});

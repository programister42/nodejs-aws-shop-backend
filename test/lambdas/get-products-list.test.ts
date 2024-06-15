import type { APIGatewayProxyResult, Context } from "aws-lambda";

import { getProductsList } from "../../lambdas/get-products-list";
import type { Product } from "../../types/product";

describe("getProductsList", () => {
	// getProductsList parameters
	const event = {} as APIGatewayProxyResult;
	const context = {} as Context;
	const callback = () => {};
	// environment mocks
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns a successful response with products when PRODUCTS environment variable is set", async () => {
		const mockProducts: Product[] = [
			{
				id: "1",
				title: "Product 1",
				description: "Description 1",
				price: 100,
			},
			{
				id: "2",
				title: "Product 2",
				description: "Description 2",
				price: 200,
			},
			{
				id: "3",
				title: "Product 3",
				description: "Description 3",
				price: 300,
			},
		];
		process.env.PRODUCTS = JSON.stringify(mockProducts);

		const response = await getProductsList(event, context, callback);

		expect(response.statusCode).toBe(200);
		expect(response.headers).toEqual({
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
		});
		expect(response.body).toBe(mockProducts);
	});

	it("returns a successful response with an empty array when PRODUCTS environment variable is not set", async () => {
		const response = await getProductsList(event, context, callback);

		expect(response.statusCode).toBe(200);
		expect(response.headers).toEqual({
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
		});
		expect(response.body).toBe(JSON.stringify([]));
	});
});

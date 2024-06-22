import type { APIGatewayProxyEvent, Context } from "aws-lambda";

import { getProductById } from "../../lambdas/get-product-by-id";
import type { Product } from "../../types/product";

describe("getProductById", () => {
	// getProductById parameters
	const event: APIGatewayProxyEvent = {} as APIGatewayProxyEvent;
	const context = {} as Context;
	const callback = () => {};
	// environment mocks
	let originalEnv: NodeJS.ProcessEnv;
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

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv, PRODUCTS: JSON.stringify(mockProducts) };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns a product when a product with the given id exists", async () => {
		event.pathParameters = { id: "1" };

		const result = await getProductById(event, context, callback);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual(mockProducts[0]);
	});

	it("returns a 404 status code when a product with the given id does not exist", async () => {
		event.pathParameters = { id: "999" };

		const result = await getProductById(event, context, callback);

		expect(result.statusCode).toBe(404);
		expect(JSON.parse(result.body)).toEqual({ message: "Product not found" });
	});

	it("returns a 404 status code when no id is provided", async () => {
		event.pathParameters = {};

		const result = await getProductById(event, context, callback);

		expect(result.statusCode).toBe(404);
		expect(JSON.parse(result.body)).toEqual({ message: "Product not found" });
	});
});

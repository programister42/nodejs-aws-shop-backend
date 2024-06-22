import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from "aws-lambda";
import type { Product } from "../types/product";

export const getProductById: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const products: Product[] = JSON.parse(process.env.PRODUCTS ?? "[]");
	const { id } = event.pathParameters ?? {};
	const product = products.find((p) => p.id === id);
	return {
		statusCode: product ? 200 : 404,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
		},
		body: product
			? JSON.stringify(product)
			: JSON.stringify({ message: "Product not found" }),
	};
};

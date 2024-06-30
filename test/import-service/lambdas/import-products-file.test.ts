import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { importProductsFile } from "../../../import-service/lambdas/import-products-file";

interface LambdaResponse {
	statusCode: number;
	body: string;
}

jest.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: jest.fn(),
}));

const s3Mock = mockClient(S3Client);

describe("importProductsFile", () => {
	const context = {} as Context;
	const callback = () => {};

	beforeEach(() => {
		s3Mock.reset();
		jest.clearAllMocks();
	});

	it("should return 400 if name is not provided", async () => {
		const event = {
			queryStringParameters: {},
		} as unknown as APIGatewayProxyEvent;

		const result = (await importProductsFile(
			event,
			context,
			callback,
		)) as LambdaResponse;

		expect(result.statusCode).toBe(400);
		expect(result.body).toBe(
			JSON.stringify({ message: "File name is required" }),
		);
	});

	it("should return 200 and a signed URL if name is provided", async () => {
		const event = {
			queryStringParameters: { name: "test.csv" },
		} as unknown as APIGatewayProxyEvent;

		(getSignedUrl as jest.Mock).mockResolvedValue("https://signed-url.com");

		const result = (await importProductsFile(
			event,
			context,
			callback,
		)) as LambdaResponse;

		expect(result.statusCode).toBe(200);
		expect(result.body).toBe(JSON.stringify("https://signed-url.com"));
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.any(S3Client),
			expect.any(PutObjectCommand),
			{ expiresIn: 3600 },
		);
	});

	it("should return 500 if there is an error", async () => {
		const event = {
			queryStringParameters: { name: "test.csv" },
		} as unknown as APIGatewayProxyEvent;

		(getSignedUrl as jest.Mock).mockRejectedValue(new Error("Test error"));

		const result = (await importProductsFile(
			event,
			context,
			callback,
		)) as LambdaResponse;

		expect(result.statusCode).toBe(500);
		expect(result.body).toBe(
			JSON.stringify({
				message: "Could not create a signed URL",
				error: "Test error",
			}),
		);
	});
});

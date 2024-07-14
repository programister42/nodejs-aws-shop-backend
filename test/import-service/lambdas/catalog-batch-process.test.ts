import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import {
	DynamoDBDocumentClient,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";

const snsClientMock = mockClient(SNSClient);
const ddbDocClientMock = mockClient(DynamoDBDocumentClient);

describe("catalogBatchProcess", () => {
	let catalogBatchProcess: (event: SQSEvent) => Promise<void>;

	beforeEach(async () => {
		snsClientMock.reset();
		ddbDocClientMock.reset();
		process.env.TOPIC_ARN = "test-topic-arn";
		process.env.PRODUCT_TABLE_NAME = "test-product-table";
		process.env.STOCK_TABLE_NAME = "test-stock-table";
		catalogBatchProcess = (
			await import("../../../import-service/lambdas/catalog-batch-process")
		).catalogBatchProcess;
	});

	it("should process SQS event records successfully", async () => {
		const sqsEvent: SQSEvent = {
			Records: [
				{
					body: JSON.stringify({
						title: "Test Product",
						description: "Test Description",
						price: 100,
						count: 10,
					}),
				},
			],
		} as SQSEvent;

		ddbDocClientMock.on(TransactWriteCommand).resolves({});
		snsClientMock.on(PublishCommand).resolves({});

		await catalogBatchProcess(sqsEvent);

		expect(ddbDocClientMock).toHaveReceivedCommandWith(TransactWriteCommand, {
			TransactItems: expect.any(Array),
		});
		expect(snsClientMock).toHaveReceivedCommandWith(PublishCommand, {
			TopicArn: "test-topic-arn",
			Message: expect.any(String),
			Subject: "New product added",
		});
	});

	it("should handle DynamoDB error", async () => {
		const sqsEvent: SQSEvent = {
			Records: [
				{
					body: JSON.stringify({
						title: "Test Product",
						description: "Test Description",
						price: 100,
						count: 10,
					}),
				},
			],
		} as SQSEvent;

		ddbDocClientMock
			.on(TransactWriteCommand)
			.rejects(new Error("DynamoDB error"));
		snsClientMock.on(PublishCommand).resolves({});

		await expect(catalogBatchProcess(sqsEvent)).rejects.toThrow(
			"DynamoDB error",
		);
	});
});

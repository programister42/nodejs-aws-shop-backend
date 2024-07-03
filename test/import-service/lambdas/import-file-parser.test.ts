import { Readable } from "node:stream";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@smithy/util-stream";
import type { Context, S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";

import { importFileParser } from "../../../import-service/lambdas/import-file-parser";

const s3Mock = mockClient(S3Client);

describe("importFileParser", () => {
	const context = {} as Context;
	const callback = jest.fn();

	beforeEach(() => {
		s3Mock.reset();
	});

	it("should process files correctly", async () => {
		const mockReadStream = new Readable();
		mockReadStream.push("name,age\nJohn Doe,30\nJane Doe,25");
		mockReadStream.push(null);
		const sdkStream = sdkStreamMixin(mockReadStream);

		s3Mock.on(GetObjectCommand).resolves({
			Body: sdkStream,
		});
		s3Mock.on(CopyObjectCommand).resolves({});
		s3Mock.on(DeleteObjectCommand).resolves({});

		const event = {
			Records: [
				{
					s3: {
						bucket: { name: "test-bucket" },
						object: { key: "uploaded/test.csv" },
					},
				},
			],
		} as S3Event;

		await importFileParser(event, context, callback);

		expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
			Bucket: "test-bucket",
			Key: "uploaded/test.csv",
		});
		expect(s3Mock).toHaveReceivedCommandWith(CopyObjectCommand, {
			Bucket: "test-bucket",
			CopySource: "test-bucket/uploaded/test.csv",
			Key: "parsed/test.csv",
		});
		expect(s3Mock).toHaveReceivedCommandWith(DeleteObjectCommand, {
			Bucket: "test-bucket",
			Key: "uploaded/test.csv",
		});
	});
});

import { Readable, Transform } from "node:stream";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { StreamingBlobPayloadOutputTypes } from "@smithy/types";
import type { Context, S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { importFileParser } from "../../../import-service/lambdas/import-file-parser";
import * as csv from "../../../import-service/lambdas/node_modules/csv-parser";

jest.mock("../../../import-service/lambdas/node_modules/csv-parser");

const s3Mock = mockClient(S3Client);

describe("importFileParser", () => {
	const context = {} as Context;
	const callback = () => {};

	beforeEach(() => {
		s3Mock.reset();
		jest.clearAllMocks();
	});

	it("should process files correctly", async () => {
		const mockReadStream = new Readable();
		mockReadStream.push("name,age\nJohn Doe,30\nJane Doe,25");
		mockReadStream.push(null); // End of stream

		s3Mock.on(GetObjectCommand).resolves({
			Body: mockReadStream as StreamingBlobPayloadOutputTypes,
		});

		s3Mock.on(CopyObjectCommand).resolves({});
		s3Mock.on(DeleteObjectCommand).resolves({});

		const mockCsvParser = csv as jest.MockedFunction<typeof csv>;
		mockCsvParser.mockImplementation(() => {
			const transform = new Transform({ read() {}, transform() {} });
			process.nextTick(() => {
				transform.emit("data", { name: "John Doe", age: "30" });
				transform.emit("data", { name: "Jane Doe", age: "25" });
				transform.emit("end");
			});
			return transform;
		});

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

		expect(s3Mock.send).toHaveLength(3); // GetObject, CopyObject, DeleteObject
		expect(mockCsvParser).toHaveBeenCalled();
	});
});

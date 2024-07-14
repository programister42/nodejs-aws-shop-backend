import type { Readable } from "node:stream";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { S3Handler } from "aws-lambda";
import * as csv from "csv-parser";

const SQS_URL = process.env.SQS_URL;
const s3Client = new S3Client();
const sqsClient = new SQSClient();

const sendSQSMessage = async (data: Record<string, string>) => {
	let result = null;
	try {
		const messageBody = JSON.stringify(data);
		result = await sqsClient.send(
			new SendMessageCommand({
				QueueUrl: SQS_URL,
				MessageBody: messageBody,
			}),
		);
		console.log("Message sent to SQS:", messageBody);
	} catch (error) {
		console.error("Error sending message to SQS:", error);
	}
	return result;
};

export const importFileParser: S3Handler = async (event) => {
	console.log("importFileParser event", event);

	try {
		await Promise.all(
			event.Records.map(async (record) => {
				const { bucket, object } = record.s3;

				const { Body } = await s3Client.send(
					new GetObjectCommand({
						Bucket: bucket.name,
						Key: object.key,
					}),
				);
				const readableStream = Body as Readable;

				const sqsPromises: Promise<unknown>[] = [];

				await new Promise((resolve, reject) => {
					readableStream
						.pipe(csv())
						.on("data", async (data) => {
							sqsPromises.push(sendSQSMessage(data));
						})
						.on("end", async () => {
							await Promise.all(sqsPromises);
							console.log(`CSV file ${object.key} processed`);
							resolve(true);
						})
						.on("error", (error) => {
							console.error("Error processing file:", error);
							reject(error);
						});
				});

				const destinationKey = object.key.replace("uploaded/", "parsed/");

				await s3Client.send(
					new CopyObjectCommand({
						Bucket: bucket.name,
						CopySource: `${bucket.name}/${object.key}`,
						Key: destinationKey,
					}),
				);
				console.log(`File copied to ${destinationKey}`);

				await s3Client.send(
					new DeleteObjectCommand({
						Bucket: bucket.name,
						Key: object.key,
					}),
				);
				console.log(`File deleted from ${object.key}`);
			}),
		);
	} catch (error) {
		console.error("Error processing file:", error);
	}
};

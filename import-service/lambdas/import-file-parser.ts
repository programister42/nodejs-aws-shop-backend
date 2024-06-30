import type { Readable } from "node:stream";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { S3Handler } from "aws-lambda";
import * as csv from "csv-parser";

const BUCKET_REGION = process.env.BUCKET_REGION;
const s3Client = new S3Client({ region: BUCKET_REGION });

export const importFileParser: S3Handler = async (event) => {
	console.log("importFileParser event", event);

	for (const record of event.Records) {
		const { bucket, object } = record.s3;

		try {
			const { Body } = await s3Client.send(
				new GetObjectCommand({
					Bucket: bucket.name,
					Key: object.key,
				}),
			);
			const readableStream = Body as Readable;

			readableStream
				.pipe(csv())
				.on("data", console.log)
				.on("end", async () => {
					console.log(`CSV file ${object.key} processed`);

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
				})
				.on("error", (error) => {
					console.error("Error processing file:", error);
				});
		} catch (error) {
			console.error("Error processing file:", error);
		}
	}
};

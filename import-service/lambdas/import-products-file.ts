import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyHandler } from "aws-lambda";

const BUCKET_NAME = process.env.BUCKET_NAME;
const BUCKET_REGION = process.env.BUCKET_REGION;
const s3Client = new S3Client({ region: BUCKET_REGION });

export const importProductsFile: APIGatewayProxyHandler = async (event) => {
	console.log("importProductsFile event", event);

	try {
		const { name } = event.queryStringParameters || {};
		if (!name) {
			return {
				statusCode: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET",
					"Access-Control-Allow-Headers": "Content-Type",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "File name is required" }),
			};
		}

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: `uploaded/${name}`,
			ContentType: "text/csv",
		});
		const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET",
				"Access-Control-Allow-Headers": "Content-Type",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(url),
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return {
			statusCode: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET",
				"Access-Control-Allow-Headers": "Content-Type",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message: "Could not create a signed URL",
				error: errorMessage,
			}),
		};
	}
};

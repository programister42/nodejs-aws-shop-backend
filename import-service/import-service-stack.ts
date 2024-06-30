import {
	Duration,
	RemovalPolicy,
	Stack,
	type StackProps,
	aws_apigateway,
	aws_dynamodb,
	aws_lambda,
	aws_lambda_event_sources,
	aws_s3,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

export class ImportServiceStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const bucket = new aws_s3.Bucket(
			this,
			"NodejsAWSShopProductsImportBucket",
			{
				bucketName: "programister42-nodejs-aws-shop-products-import",
				removalPolicy: RemovalPolicy.DESTROY,
				autoDeleteObjects: true,
				cors: [
					{
						allowedOrigins: ["*"],
						allowedMethods: [aws_s3.HttpMethods.PUT],
						allowedHeaders: ["*"],
					},
				],
			},
		);
		bucket.addLifecycleRule({
			prefix: "uploaded/",
			transitions: [
				{
					storageClass: aws_s3.StorageClass.INFREQUENT_ACCESS,
					transitionAfter: Duration.days(30),
				},
			],
		});

		const importProductsFileLambda = new aws_lambda.Function(
			this,
			"NodejsAWSShopImportProductsFileLambda",
			{
				functionName: "NodejsAWSShopImportProductsFileLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				handler: "import-products-file.importProductsFile",
				code: aws_lambda.Code.fromAsset("import-service/lambdas"),
				environment: {
					BUCKET_NAME: bucket.bucketName,
					BUCKET_REGION: this.region,
				},
			},
		);
		bucket.grantReadWrite(importProductsFileLambda);

		const api = new aws_apigateway.RestApi(
			this,
			"NodejsAWSShopImportServiceApi",
			{
				restApiName: "NodejsAWSShopImportServiceApi",
			},
		);

		const importResource = api.root.addResource("import");
		importResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(importProductsFileLambda),
			{
				requestParameters: {
					"method.request.querystring.name": true,
				},
			},
		);

		const importFileParserLambda = new aws_lambda.Function(
			this,
			"ImportFileParser",
			{
				functionName: "NodejsAWSShopImportFileParserLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				handler: "import-file-parser.importFileParser",
				code: aws_lambda.Code.fromAsset("import-service/lambdas"),
				environment: {
					BUCKET_REGION: this.region,
				},
			},
		);
		bucket.grantReadWrite(importFileParserLambda);
		bucket.grantDelete(importFileParserLambda);

		const s3EventSource = new aws_lambda_event_sources.S3EventSource(bucket, {
			events: [aws_s3.EventType.OBJECT_CREATED],
			filters: [{ prefix: "uploaded/" }],
		});
		importFileParserLambda.addEventSource(s3EventSource);
	}
}

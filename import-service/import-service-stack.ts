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
	aws_sns,
	aws_sns_subscriptions,
	aws_sqs,
} from "aws-cdk-lib";
import { TokenAuthorizer } from "aws-cdk-lib/aws-apigateway";
import type { Construct } from "constructs";
import {
	BASIC_AUTHORIZER_LAMBDA_NAME,
	PRODUCT_TABLE,
	SNS_HIGH_PRICE_SUBSCRIPTION_EMAIL,
	SNS_SUBSCRIPTION_EMAIL,
	STOCK_TABLE,
} from "../shared/constants";

export class ImportServiceStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Bucket configuration

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
		const s3EventSource = new aws_lambda_event_sources.S3EventSource(bucket, {
			events: [aws_s3.EventType.OBJECT_CREATED],
			filters: [{ prefix: "uploaded/" }],
		});

		// API configuration

		const api = new aws_apigateway.RestApi(
			this,
			"NodejsAWSShopImportServiceApi",
			{
				restApiName: "NodejsAWSShopImportServiceApi",
				defaultCorsPreflightOptions: {
					allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
					allowMethods: aws_apigateway.Cors.ALL_METHODS,
					allowHeaders: aws_apigateway.Cors.DEFAULT_HEADERS,
				},
			},
		);
		api.addGatewayResponse(
			"NodejsAWSShopImportServiceGatewayResponseUnauthorized",
			{
				type: aws_apigateway.ResponseType.UNAUTHORIZED,
				responseHeaders: {
					"Access-Control-Allow-Origin": "'*'",
					"Content-Type": "'application/json'",
				},
			},
		);
		api.addGatewayResponse(
			"NodejsAWSShopImportServiceGatewayResponseDefaultForbidden",
			{
				type: aws_apigateway.ResponseType.ACCESS_DENIED,
				responseHeaders: {
					"Access-Control-Allow-Origin": "'*'",
					"Content-Type": "'application/json'",
				},
			},
		);
		const importResource = api.root.addResource("import");

		// DynamoDB configuration

		const productTable = aws_dynamodb.Table.fromTableName(
			this,
			PRODUCT_TABLE.id,
			PRODUCT_TABLE.name,
		);
		const stockTable = aws_dynamodb.Table.fromTableName(
			this,
			STOCK_TABLE.id,
			STOCK_TABLE.name,
		);

		// SQS configuration

		const catalogItemsQueue = new aws_sqs.Queue(
			this,
			"NodejsAWSShopCatalogItemsQueue",
			{
				queueName: "NodejsAWSShopCatalogItemsQueue",
			},
		);
		const sqsEventSource = new aws_lambda_event_sources.SqsEventSource(
			catalogItemsQueue,
			{
				batchSize: 5,
			},
		);

		// SNS configuration

		const createProductTopic = new aws_sns.Topic(
			this,
			"NodejsAWSShopCreateProductSNSTopic",
		);
		createProductTopic.addSubscription(
			new aws_sns_subscriptions.EmailSubscription(SNS_SUBSCRIPTION_EMAIL),
		);
		createProductTopic.addSubscription(
			new aws_sns_subscriptions.EmailSubscription(
				SNS_HIGH_PRICE_SUBSCRIPTION_EMAIL,
				{
					filterPolicy: {
						price: aws_sns.SubscriptionFilter.numericFilter({
							greaterThanOrEqualTo: 100500,
						}),
					},
				},
			),
		);

		// Lambdas configuration

		const basicAuthorizerLambda = aws_lambda.Function.fromFunctionName(
			this,
			BASIC_AUTHORIZER_LAMBDA_NAME,
			BASIC_AUTHORIZER_LAMBDA_NAME,
		);
		const basicTokenAuthorizer = new TokenAuthorizer(
			this,
			"NodejsAWSShopBasicTokenAuthorizer",
			{
				authorizerName: "NodejsAWSShopBasicTokenAuthorizer",
				handler: basicAuthorizerLambda,
				identitySource: "method.request.header.Authorization",
			},
		);

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
		importResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(importProductsFileLambda),
			{
				authorizer: basicTokenAuthorizer,
				authorizationType: aws_apigateway.AuthorizationType.CUSTOM,
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
					SQS_URL: catalogItemsQueue.queueUrl,
				},
			},
		);
		bucket.grantReadWrite(importFileParserLambda);
		bucket.grantDelete(importFileParserLambda);
		catalogItemsQueue.grantSendMessages(importFileParserLambda);
		importFileParserLambda.addEventSource(s3EventSource);

		const catalogBatchProcessLambda = new aws_lambda.Function(
			this,
			"NodejsAWSShopCatalogBatchProcessLambda",
			{
				functionName: "NodejsAWSShopCatalogBatchProcessLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				handler: "catalog-batch-process.catalogBatchProcess",
				code: aws_lambda.Code.fromAsset("import-service/lambdas"),
				environment: {
					TOPIC_ARN: createProductTopic.topicArn,
					PRODUCT_TABLE_NAME: productTable.tableName,
					STOCK_TABLE_NAME: stockTable.tableName,
				},
			},
		);
		productTable.grantWriteData(catalogBatchProcessLambda);
		stockTable.grantWriteData(catalogBatchProcessLambda);
		createProductTopic.grantPublish(catalogBatchProcessLambda);
		catalogBatchProcessLambda.addEventSource(sqsEventSource);
	}
}

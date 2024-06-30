import {
	RemovalPolicy,
	Stack,
	type StackProps,
	aws_apigateway,
	aws_dynamodb,
	aws_lambda,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

export class NodejsAWSShopBackendStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const productTable = new aws_dynamodb.Table(
			this,
			"NodejsAWSShopProductTable",
			{
				tableName: "NodejsAWSShopProductTable",
				partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
				billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
				removalPolicy: RemovalPolicy.DESTROY,
			},
		);

		const stockTable = new aws_dynamodb.Table(this, "NodejsAWSShopStockTable", {
			tableName: "NodejsAWSShopStockTable",
			partitionKey: {
				name: "product_id",
				type: aws_dynamodb.AttributeType.STRING,
			},
			billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		const getProductsListLambda = new aws_lambda.Function(
			this,
			"NodejsAWSShopGetProductsListLambda",
			{
				functionName: "NodejsAWSShopGetProductsListLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				code: aws_lambda.Code.fromAsset("lambdas"),
				handler: "get-products-list.getProductsList",
				environment: {
					PRODUCT_TABLE_NAME: productTable.tableName,
					STOCK_TABLE_NAME: stockTable.tableName,
				},
			},
		);
		productTable.grantReadWriteData(getProductsListLambda);
		stockTable.grantReadWriteData(getProductsListLambda);

		const getProductByIdLambda = new aws_lambda.Function(
			this,
			"NodejsAWSShopGetProductByIdLambda",
			{
				functionName: "NodejsAWSShopGetProductByIdLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				code: aws_lambda.Code.fromAsset("lambdas"),
				handler: "get-product-by-id.getProductById",
				environment: {
					PRODUCT_TABLE_NAME: productTable.tableName,
					STOCK_TABLE_NAME: stockTable.tableName,
				},
			},
		);
		productTable.grantReadWriteData(getProductByIdLambda);
		stockTable.grantReadWriteData(getProductByIdLambda);

		const createProductLambda = new aws_lambda.Function(
			this,
			"NodejsAWSShopCreateProductLambda",
			{
				functionName: "NodejsAWSShopCreateProductLambda",
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				code: aws_lambda.Code.fromAsset("lambdas"),
				handler: "create-product.createProduct",
				environment: {
					PRODUCT_TABLE_NAME: productTable.tableName,
					STOCK_TABLE_NAME: stockTable.tableName,
				},
			},
		);
		productTable.grantReadWriteData(createProductLambda);
		stockTable.grantReadWriteData(createProductLambda);

		const api = new aws_apigateway.LambdaRestApi(
			this,
			"NodejsAWSShopBackendApi",
			{
				restApiName: "NodejsAWSShopBackendApi",
				handler: getProductsListLambda,
				proxy: false,
				defaultCorsPreflightOptions: {
					allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
					allowMethods: aws_apigateway.Cors.ALL_METHODS,
					allowHeaders: ["*"],
				},
			},
		);

		const productModel = api.addModel("NodejsAWSShopProductModel", {
			contentType: "application/json",
			modelName: "NodejsAWSShopProductModel",
			schema: {
				schema: aws_apigateway.JsonSchemaVersion.DRAFT4,
				title: "NodejsAWSShopProductModel",
				type: aws_apigateway.JsonSchemaType.OBJECT,
				properties: {
					title: { type: aws_apigateway.JsonSchemaType.STRING, pattern: "\\S" },
					description: {
						type: aws_apigateway.JsonSchemaType.STRING,
						pattern: "\\S",
					},
					price: { type: aws_apigateway.JsonSchemaType.NUMBER, minimum: 0 },
					count: { type: aws_apigateway.JsonSchemaType.NUMBER, minimum: 0 },
				},
				required: ["title", "price", "count"],
			},
		});

		const requestBodyValidator = api.addRequestValidator(
			"NodejsAWSShopRequestBodyValidator",
			{
				requestValidatorName: "NodejsAWSShopRequestBodyValidator",
				validateRequestBody: true,
			},
		);

		const productsResource = api.root.addResource("products");
		productsResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(getProductsListLambda),
		);
		productsResource.addMethod(
			"POST",
			new aws_apigateway.LambdaIntegration(createProductLambda),
			{
				requestModels: {
					"application/json": productModel,
				},
				requestValidator: requestBodyValidator,
			},
		);

		const productByIdResource = productsResource.addResource("{id}");
		productByIdResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(getProductByIdLambda),
		);
	}
}

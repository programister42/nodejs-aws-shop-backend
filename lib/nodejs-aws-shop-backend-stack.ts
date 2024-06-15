import {
	Stack,
	type StackProps,
	aws_apigateway,
	aws_lambda,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

import { products } from "../mocks/products";

export class NodejsAwsShopBackendStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const getProductsListLambda = new aws_lambda.Function(
			this,
			"get-products-list-lambda",
			{
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				code: aws_lambda.Code.fromAsset("lambdas"),
				handler: "getProductsList.getProductsList",
				environment: {
					PRODUCTS: JSON.stringify(products),
				},
			},
		);

		const getProductByIdLambda = new aws_lambda.Function(
			this,
			"get-product-by-id-lambda",
			{
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				code: aws_lambda.Code.fromAsset("lambdas"),
				handler: "getProductById.getProductById",
				environment: {
					PRODUCTS: JSON.stringify(products),
				},
			},
		);

		const api = new aws_apigateway.RestApi(
			this,
			"nodejs-aws-shop-backend-api",
			{
				defaultCorsPreflightOptions: {
					allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
					allowMethods: aws_apigateway.Cors.ALL_METHODS,
					allowHeaders: ["*"],
				},
			},
		);

		const productsResource = api.root.addResource("products");
		productsResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(getProductsListLambda),
		);

		const productByIdResource = productsResource.addResource("{id}");
		productByIdResource.addMethod(
			"GET",
			new aws_apigateway.LambdaIntegration(getProductByIdLambda),
		);
	}
}

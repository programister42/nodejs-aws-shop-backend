import { Stack, type StackProps, aws_lambda } from "aws-cdk-lib";
import type { Construct } from "constructs";
import "dotenv/config";
import { BASIC_AUTHORIZER_LAMBDA_NAME } from "../shared/constants";

export class AuthorizationServiceStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Lambdas configuration

		const USER_NAME = process.env.USER_NAME as string;
		const USER_PASSWORD = process.env.USER_PASSWORD as string;
		const basicAuthorizerLambda = new aws_lambda.Function(
			this,
			BASIC_AUTHORIZER_LAMBDA_NAME,
			{
				functionName: BASIC_AUTHORIZER_LAMBDA_NAME,
				runtime: aws_lambda.Runtime.NODEJS_20_X,
				handler: "lambdas/basic-authorizer.basicAuthorizer",
				code: aws_lambda.Code.fromAsset("authorization-service/lambdas"),
				environment: {
					[USER_NAME]: USER_PASSWORD,
				},
			},
		);
	}
}

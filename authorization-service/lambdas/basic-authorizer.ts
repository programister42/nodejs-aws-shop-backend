import type {
	APIGatewayTokenAuthorizerEvent,
	CustomAuthorizerResult,
} from "aws-lambda";

type GeneratePolicyEffect = "Allow" | "Deny";

export const basicAuthorizer = async (
	event: APIGatewayTokenAuthorizerEvent,
): Promise<CustomAuthorizerResult> => {
	console.log("basicAuthorizer event", event);

	const authorizationToken = event.authorizationToken;
	let effect: GeneratePolicyEffect = "Allow";

	if (!authorizationToken) {
		effect = "Deny";
	}

	const encodedCredentials = authorizationToken.split(" ")[1];
	const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
		"utf-8",
	);
	const [username, password] = decodedCredentials.split("=");
	const expectedPassword = process.env[username];

	if (password !== expectedPassword) {
		effect = "Deny";
	}

	return generatePolicy(username, effect, event.methodArn);
};

const generatePolicy = (
	principalId: string,
	effect: GeneratePolicyEffect,
	resource: string,
): CustomAuthorizerResult => ({
	principalId,
	policyDocument: {
		Version: "2012-10-17",
		Statement: [
			{
				Action: "execute-api:Invoke",
				Effect: effect,
				Resource: resource,
			},
		],
	},
});

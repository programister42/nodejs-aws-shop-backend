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

	const encodedCredentials = authorizationToken.split(" ").pop();
	if (!encodedCredentials) {
		return generatePolicy("undefined", "Deny", event.methodArn);
	}

	let decodedCredentials: string;
	try {
		decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
			"utf-8",
		);
	} catch (error) {
		console.error("Error decoding credentials:", error);
		return generatePolicy("undefined", "Deny", event.methodArn);
	}

	const [username, password] = decodedCredentials.split(":");
	if (!username || !password) {
		return generatePolicy("undefined", "Deny", event.methodArn);
	}

	const expectedPassword = process.env[username];
	if (password !== expectedPassword) {
		return generatePolicy(username, "Deny", event.methodArn);
	}

	return generatePolicy(username, "Allow", event.methodArn);
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

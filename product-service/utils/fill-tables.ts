import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { faker } from "@faker-js/faker";

const ddbClient = new DynamoDBClient();
const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

const generateProduct = () => ({
	id: faker.string.uuid(),
	title: faker.commerce.productName(),
	description: faker.commerce.productDescription(),
	price: faker.number.int({ min: 1, max: 1000 }),
});

const generateStock = (productId: string) => ({
	product_id: productId,
	count: faker.number.int({ min: 1, max: 10 }),
});

export const fillTables = async (numProducts = 2) => {
	try {
		const products = Array.from({ length: numProducts }, generateProduct);
		const stocks = products.map((product) => generateStock(product.id));

		const putProductPromises = products.map((product) =>
			ddbClient.send(
				new PutItemCommand({
					TableName: PRODUCT_TABLE_NAME,
					Item: {
						id: { S: product.id },
						title: { S: product.title },
						description: { S: product.description },
						price: { N: product.price.toString() },
					},
				}),
			),
		);

		const putStockPromises = stocks.map((stock) =>
			ddbClient.send(
				new PutItemCommand({
					TableName: STOCK_TABLE_NAME,
					Item: {
						product_id: { S: stock.product_id },
						count: { N: stock.count.toString() },
					},
				}),
			),
		);

		await Promise.all([...putProductPromises, ...putStockPromises]);

		console.log("Tables filled successfully");
	} catch (error) {
		console.error("Error filling tables", error);
	}
};

void fillTables();

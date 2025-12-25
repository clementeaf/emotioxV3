import { createSchema, createYoga } from 'graphql-yoga';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// 1. Define Schema
const typeDefs = `
  type Query {
    hello: String
    serverTime: String
  }
`;

// 2. Define Resolvers
const resolvers = {
    Query: {
        hello: () => 'Hello from GraphQL Yoga in Lambda!',
        serverTime: () => new Date().toISOString(),
    },
};

// 3. Create Yoga App
const yoga = createYoga<{
    event: APIGatewayProxyEvent;
    lambdaContext: Context;
}>({
    schema: createSchema({
        typeDefs,
        resolvers,
    }),
    graphqlEndpoint: '/graphql', // Ruta donde escuchará
    landingPage: true, // Habilita GraphiQL
});

// 4. Integración con AWS Lambda
// Esta función adaptará el evento de API Gateway para Yoga
export const graphqlHandler = async (
    event: APIGatewayProxyEvent,
    lambdaContext: Context
): Promise<APIGatewayProxyResult> => {
    const response = await yoga.fetch(
        event.path + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters as any).toString() : ''),
        {
            method: event.httpMethod,
            headers: event.headers as any,
            body: event.body,
        },
        {
            event,
            lambdaContext,
        }
    );

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    return {
        statusCode: response.status,
        headers: responseHeaders,
        body: await response.text(),
        isBase64Encoded: false,
    };
};

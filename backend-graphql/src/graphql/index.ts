import { createSchema, createYoga } from 'graphql-yoga';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { typeDefs as authTypeDefs } from './auth/schema';
import { resolvers as authResolvers } from './auth/resolvers';
import { GraphQLContext } from './context';

// 1. Define Schema (Merged)
const rootTypeDefs = `
  type Query {
    hello: String
    serverTime: String
  }
  type Mutation {
    _empty: String
  }
`;

const rootResolvers = {
    Query: {
        hello: () => 'Hello from GraphQL Yoga in Lambda!',
        serverTime: () => new Date().toISOString(),
    },
};

// 2. Create Yoga App
const yoga = createYoga<{
    event: APIGatewayProxyEvent;
    lambdaContext: Context;
    responseHeaders: Record<string, string | string[]>;
}>({
    schema: createSchema({
        typeDefs: [rootTypeDefs, authTypeDefs],
        resolvers: [rootResolvers, authResolvers],
    }),
    graphqlEndpoint: '/graphql',
    landingPage: true,
});

// 3. AWS Lambda Handler
export const graphqlHandler = async (
    event: APIGatewayProxyEvent,
    lambdaContext: Context
): Promise<APIGatewayProxyResult> => {
    const responseHeaders: Record<string, string | string[]> = {};

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
            responseHeaders, // Pass the mutable headers object to context
        }
    );

    // Map Yoga Response headers
    const resultHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        resultHeaders[key] = value;
    });

    // Handling Cookies specially for API Gateway (multiValueHeaders)
    let multiValueHeaders: Record<string, (string | number | boolean)[]> = {};

    if (responseHeaders['Set-Cookie']) {
        // If resolver set cookies in our context
        const cookies = responseHeaders['Set-Cookie'];
        if (Array.isArray(cookies)) {
            multiValueHeaders['Set-Cookie'] = cookies;
        } else {
            multiValueHeaders['Set-Cookie'] = [cookies];
        }
        delete responseHeaders['Set-Cookie']; // Remove from single headers to avoid overwrite/confusion
    }

    return {
        statusCode: response.status,
        headers: { ...resultHeaders, ...responseHeaders as Record<string, string> },
        multiValueHeaders,
        body: await response.text(),
        isBase64Encoded: false,
    };
};

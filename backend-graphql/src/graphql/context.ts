import { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda';

export interface GraphQLContext {
    event: APIGatewayProxyEvent;
    lambdaContext: LambdaContext;
    // Standard way to set cookies in Yoga/Envelop is typically via plugins,
    // but since we are wrapping in a Lambda handler, we need a way to pass headers back.
    // We will attach a 'headers' object to the context which our handler will read.
    responseHeaders: Record<string, string | string[]>;
}

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, set to specific domains
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
};

export const success = (data: any, statusCode: number = 200) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data),
});

export const error = (message: string, statusCode: number = 400) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
});

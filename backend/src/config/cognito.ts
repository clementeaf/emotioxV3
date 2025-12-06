export const cognitoConfig = {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    region: process.env.APP_AWS_REGION || 'us-east-1',
    issuer: `https://cognito-idp.${process.env.APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
};

if (!cognitoConfig.userPoolId || !cognitoConfig.clientId) {
    console.warn('⚠️  Cognito no está configurado. Las funciones de autenticación no estarán disponibles.');
}

export default cognitoConfig;

export const cognitoConfig = {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    region: process.env.APP_AWS_REGION || 'us-east-1',
    get issuer(): string {
        if (!this.userPoolId) {
            throw new Error('COGNITO_USER_POOL_ID no está configurado. No se puede construir el issuer.');
        }
        return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
    },
};

if (!cognitoConfig.userPoolId || !cognitoConfig.clientId) {
    console.warn('⚠️  Cognito no está configurado. Las funciones de autenticación no estarán disponibles.');
    console.warn(`   COGNITO_USER_POOL_ID: ${cognitoConfig.userPoolId ? '✓' : '✗'}`);
    console.warn(`   COGNITO_CLIENT_ID: ${cognitoConfig.clientId ? '✓' : '✗'}`);
}

export default cognitoConfig;

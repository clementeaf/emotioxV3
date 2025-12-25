import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

interface SsmLoadOptions {
    prefix: string;
    names: string[];
    region: string;
}

/**
 * Loads SecureString/String parameters from AWS SSM Parameter Store.
 * @param options - Load options
 * @returns Record of parameter name to value (only for found parameters)
 */
export const loadSsmParameters = async (options: SsmLoadOptions): Promise<Record<string, string>> => {
    const client = new SSMClient({ region: options.region });
    const fullNames = options.names.map((name) => `${options.prefix}/${name}`);

    const command = new GetParametersCommand({
        Names: fullNames,
        WithDecryption: true,
    });

    const result = await client.send(command);
    const values: Record<string, string> = {};

    (result.Parameters ?? []).forEach((param) => {
        if (!param.Name || typeof param.Value !== 'string') return;
        const shortName = param.Name.startsWith(`${options.prefix}/`)
            ? param.Name.substring(`${options.prefix}/`.length)
            : param.Name;
        values[shortName] = param.Value;
    });

    return values;
};



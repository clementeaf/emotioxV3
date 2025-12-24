import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
import { Client } from "pg";
import fs from "fs";
import path from "path";

async function getSSMParameters(names: string[]) {
    const client = new SSMClient({ region: process.env.AWS_REGION || "us-east-1" });
    const command = new GetParametersCommand({ Names: names, WithDecryption: true });
    const response = await client.send(command);

    if (!response.Parameters) throw new Error("No parameters found");

    const params: Record<string, string> = {};
    response.Parameters.forEach(p => {
        if (p.Name && p.Value) {
            const key = p.Name.split('/').pop()!;
            params[key] = p.Value;
        }
    });
    return params;
}

async function runMigration() {
    console.log("Fetching credentials from SSM...");
    const stage = process.env.API_STAGE || "dev";
    const prefix = `/emotioxv3/${stage}`;

    const paramNames = [
        `${prefix}/DB_HOST`,
        `${prefix}/DB_PORT`,
        `${prefix}/DB_NAME`,
        `${prefix}/DB_USER`,
        `${prefix}/DB_PASSWORD`,
        `${prefix}/DB_SSL`
    ];

    const config = await getSSMParameters(paramNames);

    console.log(`Connecting to database ${config.DB_NAME} at ${config.DB_HOST}...`);

    const client = new Client({
        host: config.DB_HOST,
        port: parseInt(config.DB_PORT),
        database: config.DB_NAME,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        ssl: config.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log("Connected successfully.");

        const migrationPath = path.join(__dirname, '../migrations/011_create_monitoring_connections.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log("Running migration 011_create_monitoring_connections.sql...");
        await client.query(migrationSql);
        console.log("Migration completed successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();

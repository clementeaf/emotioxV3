#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno silenciosamente
// Desactivar mensajes informativos de dotenv que pueden romper el protocolo MCP
process.env.DOTENV_CONFIG_DEBUG = 'false';
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Servidor MCP para base de datos PostgreSQL local
 * Permite consultar y gestionar datos de la base de datos EmotioxV3
 */
class PostgresMCPServer {
    private server: Server;
    private pool: Pool;

    constructor() {
        this.server = new Server(
            {
                name: 'emotiox-database',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );

        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.setupHandlers();
    }

    /**
     * Configura los handlers para las herramientas y recursos
     */
    private setupHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'query',
                    description: 'Ejecuta una consulta SQL en la base de datos PostgreSQL',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sql: {
                                type: 'string',
                                description: 'Consulta SQL a ejecutar',
                            },
                        },
                        required: ['sql'],
                    },
                },
                {
                    name: 'get_research',
                    description: 'Obtiene información detallada de un research por ID',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            researchId: {
                                type: 'string',
                                description: 'ID del research (UUID)',
                            },
                        },
                        required: ['researchId'],
                    },
                },
                {
                    name: 'list_researches',
                    description: 'Lista todos los researches activos',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Número máximo de resultados (default: 10)',
                            },
                        },
                    },
                },
                {
                    name: 'get_research_stages',
                    description: 'Obtiene los stages y módulos de un research',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            researchId: {
                                type: 'string',
                                description: 'ID del research (UUID)',
                            },
                        },
                        required: ['researchId'],
                    },
                },
                {
                    name: 'get_table_schema',
                    description: 'Obtiene el esquema de una tabla',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla',
                            },
                        },
                        required: ['tableName'],
                    },
                },
                {
                    name: 'list_tables',
                    description: 'Lista todas las tablas de la base de datos',
                    inputSchema: {
                        type: 'object',
                    },
                },
                {
                    name: 'generate_migration',
                    description: 'Genera un script de migración SQL basado en cambios de esquema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            description: {
                                type: 'string',
                                description: 'Descripción de la migración',
                            },
                            changes: {
                                type: 'string',
                                description: 'JSON con los cambios a aplicar (add_column, alter_column, add_table, etc.)',
                            },
                        },
                        required: ['description', 'changes'],
                    },
                },
                {
                    name: 'compare_schemas',
                    description: 'Compara el esquema actual con un esquema esperado y genera diferencias',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla a comparar',
                            },
                            expectedSchema: {
                                type: 'string',
                                description: 'JSON con el esquema esperado',
                            },
                        },
                        required: ['tableName', 'expectedSchema'],
                    },
                },
                {
                    name: 'validate_foreign_keys',
                    description: 'Valida la integridad de las foreign keys en la base de datos',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla (opcional, si no se proporciona valida todas)',
                            },
                        },
                    },
                },
                {
                    name: 'suggest_indexes',
                    description: 'Analiza queries y sugiere índices para optimizar rendimiento',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla a analizar',
                            },
                        },
                    },
                },
                {
                    name: 'get_table_relationships',
                    description: 'Obtiene todas las relaciones (foreign keys) de una tabla',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla',
                            },
                        },
                        required: ['tableName'],
                    },
                },
                {
                    name: 'generate_typescript_interface',
                    description: 'Genera una interfaz TypeScript basada en el esquema de una tabla',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla',
                            },
                            interfaceName: {
                                type: 'string',
                                description: 'Nombre de la interfaz TypeScript (opcional)',
                            },
                        },
                        required: ['tableName'],
                    },
                },
                {
                    name: 'analyze_query',
                    description: 'Analiza una query SQL usando EXPLAIN ANALYZE para optimización',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sql: {
                                type: 'string',
                                description: 'Query SQL a analizar',
                            },
                        },
                        required: ['sql'],
                    },
                },
                {
                    name: 'find_orphaned_records',
                    description: 'Encuentra registros huérfanos (FK rotas) en una tabla',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla a verificar',
                            },
                        },
                        required: ['tableName'],
                    },
                },
                {
                    name: 'get_table_statistics',
                    description: 'Obtiene estadísticas de una tabla (tamaño, filas, índices)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla (opcional, todas si no se especifica)',
                            },
                        },
                    },
                },
                {
                    name: 'generate_crud_queries',
                    description: 'Genera queries CRUD básicas (SELECT, INSERT, UPDATE, DELETE) para una tabla',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla',
                            },
                        },
                        required: ['tableName'],
                    },
                },
                {
                    name: 'analyze_table_dependencies',
                    description: 'Analiza dependencias completas de una tabla (tablas que dependen y de las que depende)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableName: {
                                type: 'string',
                                description: 'Nombre de la tabla',
                            },
                        },
                        required: ['tableName'],
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'query':
                        return await this.handleQuery(args?.sql as string);
                    case 'get_research':
                        return await this.handleGetResearch(args?.researchId as string);
                    case 'list_researches':
                        return await this.handleListResearches(args?.limit as number | undefined);
                    case 'get_research_stages':
                        return await this.handleGetResearchStages(args?.researchId as string);
                    case 'get_table_schema':
                        return await this.handleGetTableSchema(args?.tableName as string);
                    case 'list_tables':
                        return await this.handleListTables();
                    case 'generate_migration':
                        return await this.handleGenerateMigration(
                            args?.description as string,
                            args?.changes as string
                        );
                    case 'compare_schemas':
                        return await this.handleCompareSchemas(
                            args?.tableName as string,
                            args?.expectedSchema as string
                        );
                    case 'validate_foreign_keys':
                        return await this.handleValidateForeignKeys(args?.tableName as string | undefined);
                    case 'suggest_indexes':
                        return await this.handleSuggestIndexes(args?.tableName as string | undefined);
                    case 'get_table_relationships':
                        return await this.handleGetTableRelationships(args?.tableName as string);
                    case 'generate_typescript_interface':
                        return await this.handleGenerateTypeScriptInterface(
                            args?.tableName as string,
                            args?.interfaceName as string | undefined
                        );
                    case 'analyze_query':
                        return await this.handleAnalyzeQuery(args?.sql as string);
                    case 'find_orphaned_records':
                        return await this.handleFindOrphanedRecords(args?.tableName as string);
                    case 'get_table_statistics':
                        return await this.handleGetTableStatistics(args?.tableName as string | undefined);
                    case 'generate_crud_queries':
                        return await this.handleGenerateCrudQueries(args?.tableName as string);
                    case 'analyze_table_dependencies':
                        return await this.handleAnalyzeTableDependencies(args?.tableName as string);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        });

        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                {
                    uri: 'postgres://tables',
                    name: 'Database Tables',
                    description: 'Lista de todas las tablas en la base de datos',
                    mimeType: 'application/json',
                },
            ],
        }));

        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;

            if (uri === 'postgres://tables') {
                const tables = await this.getTablesList();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(tables, null, 2),
                        },
                    ],
                };
            }

            throw new Error(`Unknown resource: ${uri}`);
        });
    }

    /**
     * Ejecuta una consulta SQL genérica
     */
    private async handleQuery(sql: string): Promise<{ content: Array<{ type: string; text: string }> }> {
        if (!sql || typeof sql !== 'string') {
            throw new Error('SQL query is required');
        }

        const result = await this.pool.query(sql);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            rows: result.rows,
                            rowCount: result.rowCount,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene información de un research específico
     */
    private async handleGetResearch(researchId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = `
            SELECT 
                r.id,
                r.name,
                r.description,
                r.status,
                r.research_type_id,
                r.research_technique_id,
                rt.name as research_type_name,
                rtech.name as research_technique_name,
                r.created_at,
                r.updated_at
            FROM researches r
            LEFT JOIN research_types rt ON r.research_type_id = rt.id
            LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
            WHERE r.id = $1 AND r.deleted_at IS NULL
        `;
        const result = await this.pool.query(query, [researchId]);

        if (result.rows.length === 0) {
            throw new Error(`Research with ID ${researchId} not found`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result.rows[0], null, 2),
                },
            ],
        };
    }

    /**
     * Lista todos los researches activos
     */
    private async handleListResearches(limit?: number): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = `
            SELECT 
                r.id,
                r.name,
                r.description,
                r.status,
                r.research_type_id,
                r.research_technique_id,
                rt.name as research_type_name,
                rtech.name as research_technique_name,
                r.created_at
            FROM researches r
            LEFT JOIN research_types rt ON r.research_type_id = rt.id
            LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC
            LIMIT $1
        `;
        const result = await this.pool.query(query, [limit || 10]);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            count: result.rows.length,
                            researches: result.rows,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene los stages y módulos de un research
     */
    private async handleGetResearchStages(researchId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
        const stagesQuery = `
            SELECT 
                s.id,
                s.name,
                s.description,
                s.order_index,
                COALESCE(json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'description', m.description,
                        'order_index', m.order_index,
                        'is_from_template', m.is_from_template,
                        'config', m.config,
                        'question_count', (
                            SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id
                        )
                    ) ORDER BY m.order_index
                ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) as modules
            FROM stages s
            LEFT JOIN modules m ON s.id = m.stage_id
            WHERE s.research_id = $1
            GROUP BY s.id, s.name, s.description, s.order_index
            ORDER BY s.order_index
        `;
        const result = await this.pool.query(stagesQuery, [researchId]);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            researchId,
                            stages: result.rows,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene el esquema de una tabla
     */
    private async handleGetTableSchema(tableName: string): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `;
        const result = await this.pool.query(query, [tableName]);

        if (result.rows.length === 0) {
            throw new Error(`Table ${tableName} not found`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            tableName,
                            columns: result.rows,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Lista todas las tablas de la base de datos
     */
    private async handleListTables(): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = `
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;
        const result = await this.pool.query(query);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            tables: result.rows,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene la lista de tablas para el recurso
     */
    private async getTablesList(): Promise<Array<{ name: string; columnCount: number }>> {
        const query = `
            SELECT 
                table_name as name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Genera un script de migración SQL basado en cambios
     */
    private async handleGenerateMigration(
        description: string,
        changesJson: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        try {
            const changes = JSON.parse(changesJson);
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            const migrationNumber = `011_${timestamp}`;
            
            let migrationSQL = `-- Migration: ${description}\n-- Generated: ${new Date().toISOString()}\n\n`;
            
            if (changes.add_table) {
                const table = changes.add_table;
                migrationSQL += `-- Create table ${table.name}\n`;
                migrationSQL += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
                const columns = table.columns.map((col: any) => {
                    let colDef = `    ${col.name} ${col.type}`;
                    if (col.not_null) colDef += ' NOT NULL';
                    if (col.default) colDef += ` DEFAULT ${col.default}`;
                    if (col.primary_key) colDef += ' PRIMARY KEY';
                    return colDef;
                }).join(',\n');
                migrationSQL += columns + '\n);\n\n';
            }
            
            if (changes.add_column) {
                const cols = Array.isArray(changes.add_column) ? changes.add_column : [changes.add_column];
                for (const col of cols) {
                    const columnName = col.name || col.column;
                    if (!columnName) {
                        throw new Error('Column name is required (use "name" or "column" property)');
                    }
                    migrationSQL += `-- Add column ${columnName} to ${col.table}\n`;
                    migrationSQL += `ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${columnName} ${col.type}`;
                    if (col.not_null) migrationSQL += ' NOT NULL';
                    if (col.default) migrationSQL += ` DEFAULT ${col.default}`;
                    if (col.nullable === false) migrationSQL += ' NOT NULL';
                    migrationSQL += ';\n\n';
                }
            }
            
            if (changes.alter_column) {
                const cols = Array.isArray(changes.alter_column) ? changes.alter_column : [changes.alter_column];
                for (const col of cols) {
                    migrationSQL += `-- Alter column ${col.name} in ${col.table}\n`;
                    if (col.new_type) {
                        migrationSQL += `ALTER TABLE ${col.table} ALTER COLUMN ${col.name} TYPE ${col.new_type};\n`;
                    }
                    if (col.set_not_null !== undefined) {
                        migrationSQL += `ALTER TABLE ${col.table} ALTER COLUMN ${col.name} ${col.set_not_null ? 'SET' : 'DROP'} NOT NULL;\n`;
                    }
                    migrationSQL += '\n';
                }
            }
            
            if (changes.add_foreign_key) {
                const fks = Array.isArray(changes.add_foreign_key) ? changes.add_foreign_key : [changes.add_foreign_key];
                for (const fk of fks) {
                    migrationSQL += `-- Add foreign key from ${fk.table}.${fk.column} to ${fk.references_table}.${fk.references_column}\n`;
                    migrationSQL += `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name || `fk_${fk.table}_${fk.column}`} `;
                    migrationSQL += `FOREIGN KEY (${fk.column}) REFERENCES ${fk.references_table}(${fk.references_column})`;
                    if (fk.on_delete) migrationSQL += ` ON DELETE ${fk.on_delete}`;
                    migrationSQL += ';\n\n';
                }
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            migrationNumber,
                            description,
                            sql: migrationSQL,
                            filename: `backend/migrations/${migrationNumber}_${description.toLowerCase().replace(/\s+/g, '_')}.sql`,
                        }, null, 2),
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Error generating migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Compara el esquema actual con uno esperado
     */
    private async handleCompareSchemas(
        tableName: string,
        expectedSchemaJson: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const currentSchema = await this.handleGetTableSchema(tableName);
        const current = JSON.parse(currentSchema.content[0].text);
        const expected = JSON.parse(expectedSchemaJson);
        
        const differences: string[] = [];
        const currentColumns = new Map(current.columns.map((c: any) => [c.column_name, c]));
        const expectedColumns = new Map(expected.columns.map((c: any) => [c.column_name, c]));
        
        // Check for missing columns
        for (const [name, col] of expectedColumns) {
            const expectedCol = col as { column_name: string; data_type: string };
            if (!currentColumns.has(name)) {
                differences.push(`Missing column: ${name} (${expectedCol.data_type})`);
            } else {
                const currentCol = currentColumns.get(name) as { column_name: string; data_type: string };
                if (currentCol.data_type !== expectedCol.data_type) {
                    differences.push(`Type mismatch for ${name}: current=${currentCol.data_type}, expected=${expectedCol.data_type}`);
                }
            }
        }
        
        // Check for extra columns
        for (const [name] of currentColumns) {
            if (!expectedColumns.has(name)) {
                differences.push(`Extra column: ${name}`);
            }
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        differences,
                        match: differences.length === 0,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Valida la integridad de foreign keys
     */
    private async handleValidateForeignKeys(
        tableName?: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = tableName
            ? `
                SELECT 
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
            `
            : `
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                ORDER BY tc.table_name
            `;
        
        const result = await this.pool.query(query, tableName ? [tableName] : []);
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName: tableName || 'all',
                        foreignKeys: result.rows,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Sugiere índices basado en análisis de la tabla
     */
    private async handleSuggestIndexes(
        tableName?: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = tableName
            ? `
                WITH indexed_columns AS (
                    SELECT DISTINCT a.attname as column_name
                    FROM pg_index i
                    JOIN pg_class t ON t.oid = i.indrelid
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
                    WHERE t.relname = $1 
                        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                        AND a.attnum > 0
                )
                SELECT 
                    c.column_name,
                    c.data_type,
                    CASE 
                        WHEN c.column_name LIKE '%_id' THEN 'Foreign key - consider index'
                        WHEN c.data_type IN ('uuid', 'character varying', 'text') THEN 'Consider index for frequent lookups'
                        WHEN c.column_name IN ('created_at', 'updated_at') THEN 'Consider index for date range queries'
                        ELSE 'Review usage patterns'
                    END as suggestion,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM indexed_columns ic 
                            WHERE ic.column_name = c.column_name
                        ) THEN true
                        ELSE false
                    END as has_index
                FROM information_schema.columns c
                WHERE c.table_schema = 'public' AND c.table_name = $1
                ORDER BY c.ordinal_position
            `
            : `
                SELECT 
                    t.table_name,
                    COUNT(DISTINCT c.column_name) as total_columns,
                    COUNT(DISTINCT idx.indexname) as total_indexes
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
                LEFT JOIN pg_indexes idx ON idx.tablename = t.table_name AND idx.schemaname = 'public'
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                GROUP BY t.table_name
                ORDER BY (COUNT(DISTINCT c.column_name) - COUNT(DISTINCT idx.indexname)) DESC
            `;
        
        const result = await this.pool.query(query, tableName ? [tableName] : []);
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        suggestions: result.rows,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Obtiene todas las relaciones de una tabla
     */
    private async handleGetTableRelationships(
        tableName: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = `
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND (tc.table_name = $1 OR ccu.table_name = $1)
        `;
        
        const result = await this.pool.query(query, [tableName]);
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        relationships: result.rows,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Genera una interfaz TypeScript desde el esquema de una tabla
     */
    private async handleGenerateTypeScriptInterface(
        tableName: string,
        interfaceName?: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const schema = await this.handleGetTableSchema(tableName);
        const schemaData = JSON.parse(schema.content[0].text);
        
        const name = interfaceName || `${tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`;
        
        let interfaceCode = `export interface ${name} {\n`;
        
        for (const col of schemaData.columns) {
            const tsType = this.mapPostgresToTypeScript(col.data_type);
            const optional = col.is_nullable === 'YES' ? '?' : '';
            const comment = col.column_default ? ` // default: ${col.column_default}` : '';
            interfaceCode += `    ${col.column_name}${optional}: ${tsType};${comment}\n`;
        }
        
        interfaceCode += '}\n';
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        interfaceName: name,
                        code: interfaceCode,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Mapea tipos de PostgreSQL a TypeScript
     */
    private mapPostgresToTypeScript(pgType: string): string {
        const typeMap: Record<string, string> = {
            'uuid': 'string',
            'varchar': 'string',
            'text': 'string',
            'character varying': 'string',
            'integer': 'number',
            'bigint': 'number',
            'smallint': 'number',
            'numeric': 'number',
            'decimal': 'number',
            'real': 'number',
            'double precision': 'number',
            'boolean': 'boolean',
            'timestamp with time zone': 'string',
            'timestamp without time zone': 'string',
            'date': 'string',
            'time': 'string',
            'jsonb': 'Record<string, unknown>',
            'json': 'Record<string, unknown>',
        };
        
        return typeMap[pgType.toLowerCase()] || 'unknown';
    }

    /**
     * Analiza una query SQL usando EXPLAIN ANALYZE
     */
    private async handleAnalyzeQuery(
        sql: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        try {
            const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${sql}`;
            const result = await this.pool.query(explainQuery);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            query: sql,
                            plan: result.rows[0]?.['QUERY PLAN'] || result.rows,
                            executionTime: this.extractExecutionTime(result.rows),
                        }, null, 2),
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Error analyzing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extrae el tiempo de ejecución del plan
     */
    private extractExecutionTime(rows: unknown[]): string | null {
        if (Array.isArray(rows) && rows.length > 0) {
            const plan = rows[0];
            if (typeof plan === 'object' && plan !== null) {
                const planStr = JSON.stringify(plan);
                const match = planStr.match(/"Execution Time":\s*([\d.]+)/);
                return match ? `${match[1]} ms` : null;
            }
        }
        return null;
    }

    /**
     * Encuentra registros huérfanos (FK rotas)
     */
    private async handleFindOrphanedRecords(
        tableName: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const fkQuery = `
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = $1
        `;
        
        const fkResult = await this.pool.query(fkQuery, [tableName]);
        const orphanedRecords: Array<Record<string, unknown>> = [];
        
        for (const fk of fkResult.rows) {
            const checkQuery = `
                SELECT ${fk.column_name}, COUNT(*) as count
                FROM ${tableName} t
                WHERE t.${fk.column_name} IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM ${fk.foreign_table_name} f
                        WHERE f.${fk.foreign_column_name} = t.${fk.column_name}
                    )
                GROUP BY ${fk.column_name}
                LIMIT 100
            `;
            
            const checkResult = await this.pool.query(checkQuery);
            if (checkResult.rows.length > 0) {
                orphanedRecords.push({
                    foreignKey: `${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
                    orphanedValues: checkResult.rows,
                });
            }
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        orphanedRecords: orphanedRecords.length > 0 ? orphanedRecords : 'No orphaned records found',
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Obtiene estadísticas de una tabla
     */
    private async handleGetTableStatistics(
        tableName?: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const query = tableName
            ? `
                SELECT
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
                    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
                    (SELECT COUNT(*) FROM ${tableName}) AS row_count,
                    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = $1 AND schemaname = 'public') AS index_count
                FROM pg_tables
                WHERE schemaname = 'public' AND tablename = $1
            `
            : `
                SELECT
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
                    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
                    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename AND schemaname = 'public') AS index_count
                FROM pg_tables t
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `;
        
        const result = await this.pool.query(query, tableName ? [tableName] : []);
        
        if (tableName && result.rows.length > 0) {
            const rowCountQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
            const rowCountResult = await this.pool.query(rowCountQuery);
            result.rows[0].row_count = rowCountResult.rows[0]?.count || 0;
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        statistics: result.rows,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Genera queries CRUD básicas para una tabla
     */
    private async handleGenerateCrudQueries(
        tableName: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const schema = await this.handleGetTableSchema(tableName);
        const schemaData = JSON.parse(schema.content[0].text);
        
        const primaryKey = schemaData.columns.find((col: { column_name: string; is_primary: boolean }) => col.is_primary)?.column_name || 'id';
        const columns = schemaData.columns.map((col: { column_name: string }) => col.column_name);
        const insertColumns = columns.filter((col: string) => col !== primaryKey || !schemaData.columns.find((c: { column_name: string }) => c.column_name === col)?.column_default);
        const updateColumns = columns.filter((col: string) => col !== primaryKey && !['created_at', 'updated_at'].includes(col));
        
        const queries = {
            select: {
                all: `SELECT * FROM ${tableName};`,
                byId: `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1;`,
                withLimit: `SELECT * FROM ${tableName} ORDER BY ${primaryKey} DESC LIMIT $1 OFFSET $2;`,
            },
            insert: {
                single: `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${insertColumns.map((_: string, i: number) => `$${i + 1}`).join(', ')}) RETURNING *;`,
            },
            update: {
                byId: `UPDATE ${tableName} SET ${updateColumns.map((col: string, i: number) => `${col} = $${i + 1}`).join(', ')} WHERE ${primaryKey} = $${updateColumns.length + 1} RETURNING *;`,
            },
            delete: {
                byId: `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *;`,
            },
        };
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        primaryKey,
                        queries,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Analiza dependencias completas de una tabla
     */
    private async handleAnalyzeTableDependencies(
        tableName: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        const dependenciesQuery = `
            WITH RECURSIVE dependencies AS (
                SELECT
                    tc.table_name AS dependent_table,
                    kcu.column_name AS dependent_column,
                    ccu.table_name AS referenced_table,
                    ccu.column_name AS referenced_column,
                    1 AS depth
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND ccu.table_name = $1
                
                UNION ALL
                
                SELECT
                    tc.table_name AS dependent_table,
                    kcu.column_name AS dependent_column,
                    ccu.table_name AS referenced_table,
                    ccu.column_name AS referenced_column,
                    d.depth + 1
                FROM dependencies d
                JOIN information_schema.table_constraints AS tc
                    ON tc.table_name = d.dependent_table
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND d.depth < 10
            ),
            dependents AS (
                SELECT DISTINCT dependent_table, depth
                FROM dependencies
                ORDER BY depth, dependent_table
            ),
            references AS (
                SELECT DISTINCT
                    tc.table_name AS referencing_table,
                    kcu.column_name AS referencing_column,
                    ccu.table_name AS referenced_table,
                    ccu.column_name AS referenced_column
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_name = $1
            )
            SELECT
                'dependents' AS type,
                json_agg(json_build_object('table', dependent_table, 'depth', depth)) AS data
            FROM dependents
            UNION ALL
            SELECT
                'references' AS type,
                json_agg(json_build_object('table', referenced_table, 'column', referenced_column)) AS data
            FROM references
        `;
        
        const result = await this.pool.query(dependenciesQuery, [tableName]);
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tableName,
                        dependencies: result.rows,
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Inicia el servidor MCP
     */
    async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        // Usar stderr para logs, nunca stdout (MCP requiere solo JSON en stdout)
        console.error('Emotiox Database MCP Server running on stdio');
    }
}

const server = new PostgresMCPServer();
void server.start();


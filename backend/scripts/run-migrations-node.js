#!/usr/bin/env node

/**
 * Script para ejecutar migraciones SQL usando Node.js
 * Funciona cuando psql no puede conectarse por pg_hba.conf
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
});

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

const MIGRATIONS = [
    '001_initial_schema.sql',
    '002_seed_data.sql',
    '003_research_techniques.sql',
    '004_enterprises.sql',
    '005_research_types_techniques_relation.sql',
    '006_researches_research_technique_id.sql',
    '007_module_templates.sql',
    '011_update_responses_table.sql',
    '012_add_stages_table.sql',
    '013_add_password_hash_to_users.sql',
];

async function runMigration(filename) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  ${filename} - Archivo no encontrado`);
        return false;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
        await pool.query(sql);
        console.log(`  ✅ ${filename}`);
        return true;
    } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('does not exist')) {
            console.log(`  ⚠️  ${filename} - (ya existe o no aplica)`);
            return true;
        } else {
            console.log(`  ❌ ${filename}`);
            console.log(`     Error: ${error.message.split('\n')[0]}`);
            return false;
        }
    }
}

async function main() {
    console.log('🗄️  Ejecutando Migraciones con Node.js');
    console.log('======================================');
    console.log('');
    
    // Verificar conexión
    try {
        const result = await pool.query('SELECT NOW(), version()');
        console.log('✅ Conexión exitosa');
        console.log(`   Base de datos: ${process.env.DB_NAME}`);
        console.log(`   Usuario: ${process.env.DB_USER}`);
        console.log('');
    } catch (error) {
        console.log('❌ Error de conexión:');
        console.log(`   ${error.message}`);
        console.log('');
        console.log('Verifica en .env:');
        console.log('  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
        process.exit(1);
    }
    
    // Ejecutar migraciones
    console.log('Ejecutando migraciones...');
    let success = 0;
    let errors = 0;
    
    for (const migration of MIGRATIONS) {
        const result = await runMigration(migration);
        if (result) {
            success++;
        } else {
            errors++;
        }
    }
    
    console.log('');
    console.log('✅ Migraciones completadas');
    console.log(`   Exitosas: ${success}/${MIGRATIONS.length}`);
    if (errors > 0) {
        console.log(`   Errores: ${errors}`);
    }
    
    await pool.end();
}

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});

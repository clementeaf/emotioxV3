/**
 * Verification script to check that module configuration is saved correctly
 */

import pool from '../src/config/database';

async function verifyModuleSave() {
    try {
        console.log('🔍 Checking last 3 modules created...\n');
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                config,
                created_at,
                updated_at
            FROM modules 
            ORDER BY updated_at DESC 
            LIMIT 3
        `);

        if (result.rows.length === 0) {
            console.log('❌ No modules found in database');
            process.exit(0);
        }

        result.rows.forEach((module: any, index: number) => {
            console.log(`\n📦 Module ${index + 1}:`);
            console.log(`   ID: ${module.id}`);
            console.log(`   Name: ${module.name}`);
            console.log(`   Created: ${module.created_at}`);
            console.log(`   Updated: ${module.updated_at}`);
            console.log(`   Config:`);
            console.log(JSON.stringify(module.config, null, 4));
            
            // Verify the test data we sent
            if (module.config?.structure?.components) {
                const hasTestTitle = module.config.structure.components.some(
                    (c: any) => c.value === 'Updated Title from Frontend'
                );
                const hasTestDescription = module.config.structure.components.some(
                    (c: any) => c.value === 'Updated Description from Frontend'
                );
                const hasNewField = module.config.structure.components.some(
                    (c: any) => c.value === 'Newly Added Field'
                );
                
                if (hasTestTitle && hasTestDescription && hasNewField) {
                    console.log('   ✅ TEST DATA VERIFIED! Configuration saved correctly from frontend.');
                }
            }
        });

        console.log('\n✅ Verification complete!');
        process.exit(0);
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyModuleSave();

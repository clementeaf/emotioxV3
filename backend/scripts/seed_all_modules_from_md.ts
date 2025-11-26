/**
 * Script maestro para seed de todos los módulos
 * Basado estrictamente en SMART_VOC_MODULES.md y COGNITIVE_TASKS_MODULES.md
 * 
 * Ejecuta:
 * 1. seed_smart_voc_modules_from_md.ts - 6 módulos Smart VOC
 * 2. seed_cognitive_tasks_modules_from_md.ts - 8 módulos Cognitive Tasks
 * 
 * Total: 14 módulos
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const runScript = async (scriptPath: string, scriptName: string) => {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${scriptName}`);
        console.log('='.repeat(60));
        
        const { stdout, stderr } = await execAsync(`npx ts-node ${scriptPath}`, {
            cwd: path.join(__dirname, '../..'),
            env: process.env
        });

        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.error(stderr);
        }

        console.log(`✅ ${scriptName} completed successfully\n`);
    } catch (error: any) {
        console.error(`❌ Error running ${scriptName}:`, error.message);
        if (error.stdout) console.error('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
        throw error;
    }
};

const seedAllModules = async () => {
    console.log('\n🚀 Starting seed for all modules from .md documentation');
    console.log('   Based on: SMART_VOC_MODULES.md and COGNITIVE_TASKS_MODULES.md\n');

    try {
        // Run Smart VOC modules seed
        await runScript(
            path.join(__dirname, 'seed_smart_voc_modules_from_md.ts'),
            'Smart VOC Modules Seed'
        );

        // Run Cognitive Tasks modules seed
        await runScript(
            path.join(__dirname, 'seed_cognitive_tasks_modules_from_md.ts'),
            'Cognitive Tasks Modules Seed'
        );

        console.log('\n' + '='.repeat(60));
        console.log('✅ All modules seed completed successfully!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log('  - Smart VOC: 6 modules');
        console.log('  - Cognitive Tasks: 8 modules');
        console.log('  - Total: 14 modules\n');

    } catch (error) {
        console.error('\n❌ Seed process failed:', error);
        process.exit(1);
    }
};

seedAllModules();


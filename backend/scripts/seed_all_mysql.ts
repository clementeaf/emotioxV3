import path from 'path';
import dotenv from 'dotenv';

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Master seed script that runs all MySQL seed scripts in order
 */
const seedAll = async (): Promise<void> => {
    console.log('🌱 Starting complete seed process for MySQL...\n');

    try {
        // 1. Seed research techniques
        console.log('📝 Step 1: Seeding research techniques...');
        const { seedResearchTechniques } = await import('./seed_research_techniques_mysql');
        await seedResearchTechniques();
        console.log('');

        // 2. Seed research types
        console.log('📝 Step 2: Seeding research types...');
        const { seedResearchTypes } = await import('./seed_research_types_mysql');
        await seedResearchTypes();
        console.log('');

        // 3. Link techniques to all types
        console.log('📝 Step 3: Linking techniques to research types...');
        const { linkTechniquesToAllTypes } = await import('./link_techniques_to_all_types_mysql');
        await linkTechniquesToAllTypes();
        console.log('');

        console.log('✅ All seeds completed successfully!');
    } catch (error) {
        console.error('❌ Seed process failed:', error);
        throw error;
    }
};

seedAll().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

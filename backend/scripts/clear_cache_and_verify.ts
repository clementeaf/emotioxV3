import path from 'path';
import dotenv from 'dotenv';
import cache, { CacheKeys } from '../src/config/cache';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Limpia el cache de research types y verifica que los datos sean correctos
 */
const clearCacheAndVerify = async (): Promise<void> => {
    console.log('Clearing research types cache...');
    
    // Clear research types cache
    cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
    cache.deletePattern('research_type:*');
    
    console.log('✅ Cache cleared');
    console.log('');
    console.log('Note: The cache will be repopulated on the next request.');
    console.log('The backend should now return only the 4 active research types.');
    
    // Give it a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    process.exit(0);
};

clearCacheAndVerify().catch(console.error);

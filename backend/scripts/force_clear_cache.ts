import path from 'path';
import dotenv from 'dotenv';
import cache, { CacheKeys } from '../src/config/cache';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Fuerza la limpieza del cache de research types
 * Este script debe ejecutarse en el mismo proceso que el servidor
 * o el cache se limpiará en un proceso diferente
 */
const forceClearCache = (): void => {
    console.log('Force clearing research types cache...');
    
    // Clear all research types related cache
    const deleted1 = cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
    const deleted2 = cache.deletePattern('research_type:*');
    
    console.log(`✓ Deleted RESEARCH_TYPES_LIST: ${deleted1}`);
    console.log(`✓ Deleted pattern matches: ${deleted2}`);
    console.log('');
    console.log('Cache cleared. Next request will fetch fresh data from database.');
};

forceClearCache();

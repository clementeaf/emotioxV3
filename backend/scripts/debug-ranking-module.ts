// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

// Load .env file if it exists
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import pool from '../src/config/database';

/**
 * Script temporal para debug: consultar módulo Ranking de la investigación "Probando"
 * 
 * INSTRUCCIONES:
 * 1. Asegúrate de que las variables DB_* estén configuradas en .env
 * 2. Si hay timeout, verifica que el servidor MySQL sea accesible
 * 3. Alternativamente, ejecuta las consultas SQL directamente en phpMyAdmin
 */
async function debugRankingModule() {
  try {
    console.log('🔍 Buscando investigación "Probando"...\n');
    
    // 1. Buscar la investigación "Probando"
    const researchQuery = `
      SELECT id, name, description, status
      FROM researches
      WHERE name = 'Probando' AND deleted_at IS NULL
      LIMIT 1
    `;
    const researchResult = await pool.query(researchQuery);
    
    if (researchResult.rows.length === 0) {
      console.log('❌ No se encontró la investigación "Probando"');
      return;
    }
    
    const research = researchResult.rows[0] as { id: string; name: string; description: string; status: string };
    console.log('✅ Investigación encontrada:', research);
    
    // 2. Buscar el módulo Ranking en esa investigación
    const moduleQuery = `
      SELECT m.id, m.name, m.description, m.config, m.order_index, s.name as stage_name
      FROM modules m
      INNER JOIN stages s ON m.stage_id = s.id
      WHERE s.research_id = ? AND m.name = 'Ranking'
      ORDER BY m.order_index
    `;
    const moduleResult = await pool.query(moduleQuery, [research.id]);
    
    if (moduleResult.rows.length === 0) {
      console.log('❌ No se encontró ningún módulo Ranking en la investigación');
      return;
    }
    
    console.log(`\n✅ Se encontraron ${moduleResult.rows.length} módulo(s) Ranking:\n`);
    
    for (const module of moduleResult.rows) {
      const mod = module as {
        id: string;
        name: string;
        description: string;
        config: string | unknown;
        order_index: number;
        stage_name: string;
      };
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Módulo ID: ${mod.id}`);
      console.log(`Nombre: ${mod.name}`);
      console.log(`Stage: ${mod.stage_name}`);
      console.log(`Order: ${mod.order_index}`);
      
      // Parsear config
      let config: unknown = mod.config;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {
          console.log('⚠️  Error parseando config JSON:', e);
        }
      }
      
      console.log('\n📦 Config completo:');
      console.log(JSON.stringify(config, null, 2));
      
      // Extraer estructura
      if (typeof config === 'object' && config !== null) {
        const configObj = config as Record<string, unknown>;
        
        // Buscar structure
        const structure = configObj.structure;
        if (structure && typeof structure === 'object') {
          const structureObj = structure as Record<string, unknown>;
          const components = structureObj.components;
          
          if (Array.isArray(components)) {
            console.log(`\n📋 Componentes (${components.length}):`);
            components.forEach((comp: unknown, index: number) => {
              if (typeof comp === 'object' && comp !== null) {
                const compObj = comp as Record<string, unknown>;
                console.log(`\n  Componente ${index + 1}:`);
                console.log(`    ID: ${compObj.id || 'N/A'}`);
                console.log(`    Type: ${compObj.type || 'N/A'}`);
                console.log(`    Label: ${compObj.label || 'N/A'}`);
                console.log(`    Value: ${compObj.value !== undefined ? JSON.stringify(compObj.value) : 'undefined'}`);
                console.log(`    Options: ${compObj.options ? JSON.stringify(compObj.options) : 'undefined'}`);
                console.log(`    Settings: ${compObj.settings ? JSON.stringify(compObj.settings) : 'undefined'}`);
                console.log(`    DefaultValue: ${compObj.defaultValue || 'undefined'}`);
              }
            });
          } else {
            console.log('⚠️  Components no es un array');
          }
        } else {
          console.log('⚠️  No se encontró structure en config');
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // No cerrar el pool, se cierra automáticamente
    process.exit(0);
  }
}

debugRankingModule();

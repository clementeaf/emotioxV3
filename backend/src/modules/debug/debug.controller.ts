import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error, getCorsHeaders } from '../../utils/response';
import pool from '../../config/database';

/**
 * Handler para rutas de debug
 */
export const handleDebugRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path } = event;
  const origin = event.headers.Origin || event.headers.origin || null;

  if (path === '/debug/ranking-module' && httpMethod === 'GET') {
    try {
      // 1. Buscar la investigación "Probando"
      const researchQuery = `
        SELECT id, name, description, status
        FROM researches
        WHERE name = 'Probando' AND deleted_at IS NULL
        LIMIT 1
      `;
      const researchResult = await pool.query(researchQuery);
      
      if (researchResult.rows.length === 0) {
        return error('No se encontró la investigación "Probando"', 404, undefined, origin);
      }
      
      const research = researchResult.rows[0] as { id: string; name: string; description: string; status: string };
      
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
        return error('No se encontró ningún módulo Ranking en la investigación', 404, undefined, origin);
      }
      
      // Parsear config de cada módulo
      const modules = moduleResult.rows.map((mod: Record<string, unknown>) => {
        let config: unknown = mod.config;
        if (typeof config === 'string') {
          try {
            config = JSON.parse(config);
          } catch (e) {
            // Si falla el parse, mantener como string
          }
        }
        
        return {
          id: mod.id,
          name: mod.name,
          description: mod.description,
          order_index: mod.order_index,
          stage_name: mod.stage_name,
          config,
          // Extraer componentes si existen
          components: typeof config === 'object' && config !== null && 'structure' in config
            ? (config as { structure?: { components?: unknown[] } }).structure?.components || []
            : []
        };
      });
      
      return success({
        research,
        modules,
        moduleCount: modules.length
      }, 200, undefined, origin);
    } catch (err: unknown) {
      console.error('Error en debug ranking module:', err);
      const message = err instanceof Error ? err.message : 'Error al consultar módulo Ranking';
      return error(message, 500, undefined, origin);
    }
  }

  return error('Debug route not found', 404, undefined, origin);
};

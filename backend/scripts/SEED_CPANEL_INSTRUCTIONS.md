# Instrucciones para Ejecutar Seeds en cPanel

## Opción 1: SSH en cPanel (Recomendado)

1. Conéctate por SSH a tu servidor de cPanel
2. Navega al directorio del backend:
   ```bash
   cd ~/backend  # o la ruta donde esté tu backend
   ```

3. Configura las variables de entorno:
   ```bash
   export DB_HOST=tu_host_mysql_cpanel
   export DB_PORT=3306
   export DB_NAME=emotiox
   export DB_USER=tu_usuario_mysql
   export DB_PASSWORD=tu_password_mysql
   export DB_SSL=false
   ```

4. Ejecuta el script maestro:
   ```bash
   npx tsx scripts/seed_all_mysql.ts
   ```

## Opción 2: Terminal de cPanel

1. Ve a "Terminal" en cPanel
2. Sigue los mismos pasos que en la Opción 1

## Opción 3: Node.js App en cPanel

Si tienes una aplicación Node.js configurada en cPanel:

1. Ve a "Node.js" en cPanel
2. Selecciona tu aplicación
3. En "Console", ejecuta:
   ```bash
   cd backend
   export DB_HOST=tu_host_mysql_cpanel
   export DB_PORT=3306
   export DB_NAME=emotiox
   export DB_USER=tu_usuario_mysql
   export DB_PASSWORD=tu_password_mysql
   export DB_SSL=false
   npx tsx scripts/seed_all_mysql.ts
   ```

## Verificación

Después de ejecutar, verifica que funcionó:

```sql
-- Ver técnicas creadas
SELECT * FROM research_techniques;

-- Ver tipos creados
SELECT * FROM research_types;

-- Ver relaciones
SELECT 
    rt.name as research_type,
    rtech.name as technique
FROM research_types_techniques rtt
INNER JOIN research_types rt ON rtt.research_type_id = rt.id
INNER JOIN research_techniques rtech ON rtt.research_technique_id = rtech.id
ORDER BY rt.name, rtech.name;
```

## Notas

- Asegúrate de tener `tsx` instalado: `npm install -g tsx` o `npx tsx`
- Los scripts son idempotentes: puedes ejecutarlos múltiples veces sin problemas
- Requiere que exista al menos un usuario en la tabla `users`

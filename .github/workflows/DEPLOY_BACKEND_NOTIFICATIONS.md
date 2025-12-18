# Solución para Notificaciones de Deploy Backend

## Problema

El workflow `deploy-backend.yml` muestra "failure" cuando no hay cambios en `backend/**`, lo que genera notificaciones por email innecesarias.

## Causa

Este es un comportamiento conocido de GitHub Actions: cuando un workflow tiene un filtro `paths:` y no hay cambios que coincidan, GitHub a veces marca el workflow como "failure" aunque no debería ejecutarse.

## Solución Implementada

El workflow ahora:
1. Siempre se ejecuta en cada push a `main`
2. Verifica internamente si hay cambios en `backend/**` usando `git diff`
3. Solo ejecuta el deploy si hay cambios o si se dispara manualmente
4. Siempre termina exitosamente gracias al job `workflow-success`

## Configuración de Notificaciones (Recomendado)

Para evitar notificaciones por email de workflows que no se ejecutan:

1. Ve a: https://github.com/settings/notifications
2. En la sección "Actions", configura:
   - **"Workflow runs"**: Solo recibir notificaciones cuando un workflow falla realmente (no cuando se omite)
   - O desactiva las notificaciones por email para workflows

## Alternativa: Filtro de Email

Puedes configurar un filtro en tu cliente de email para:
- Asunto contiene: "Workflow run failed for emotioxV3"
- Y moverlo a una carpeta específica o marcarlo como leído automáticamente


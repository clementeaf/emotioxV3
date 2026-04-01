# Deploy Skill — EmotioX V3

## Conexión SSH
- **Alias:** `cpanel-emotio` (definido en `~/.ssh/config`)
- **Key, passphrase, user:** ver `.env.claude`
- **Requiere:** `sshpass` para auto-cargar la key en los scripts de frontend

## Scripts disponibles

| Script | Qué despliega | Ejecutar desde |
|---|---|---|
| `scripts/deploy-backend-cpanel.sh` | Backend API | local |
| `scripts/deploy-research-frontend-cpanel.sh` | Research Frontend | local |
| `scripts/deploy-participant-frontend-cpanel.sh` | Participant Frontend | local |
| `scripts/deploy-to-cpanel.sh` | Los 3 componentes (interactivo, pide API URL) | local |
| `scripts/run-seeds-cpanel.sh` | Seeds de BD (research_types, techniques) | local |
| `scripts/connect-cpanel-ssh.sh` | Configuración inicial de SSH (interactivo) | local |
| `scripts/verify-cpanel-capabilities.sh` | Diagnóstico del servidor | remoto (SSH) |

## Orden de ejecución recomendado

```bash
# 1. Backend
./scripts/deploy-backend-cpanel.sh

# 2. Research Frontend
./scripts/deploy-research-frontend-cpanel.sh

# 3. Participant Frontend
./scripts/deploy-participant-frontend-cpanel.sh

# 4. Verificar
curl -s https://emotio.cx/api/health | jq .
curl -s -o /dev/null -w "%{http_code}" https://emotio.cx/research
curl -s -o /dev/null -w "%{http_code}" https://emotio.cx/participant
curl -s https://emotio.cx/research/runtime-config.json | jq .
```

## Flujo detallado por componente

### Backend (`scripts/deploy-backend-cpanel.sh`)
1. Verifica conexión SSH a `cpanel-emotio`
2. `mkdir -p ~/emotioxv3/backend`
3. `rsync -avz --exclude node_modules --exclude dist --exclude .env backend/` → `~/emotioxv3/backend/`
4. Verifica que `.env` existe en remoto (si no, crea `.env.example` y pregunta si continuar)
5. `ssh cpanel-emotio "cd ~/emotioxv3/backend && npm install --production=false"`
6. `ssh cpanel-emotio "cd ~/emotioxv3/backend && npm run build"`
7. Verifica `server-cpanel.js` y `passenger_startup.js` (si no existen, los copia via `scp`)
8. Test: `ssh cpanel-emotio "cd ~/emotioxv3/backend && timeout 5 npm start"`
9. **Post-deploy manual:** `ssh cpanel-emotio "cd ~/emotioxv3/backend && touch tmp/restart.txt"`

### Research Frontend (`scripts/deploy-research-frontend-cpanel.sh`)
1. Auto-carga SSH key via `sshpass` (passphrase en `.env.claude`)
2. Configura SSH ControlMaster (`-o ControlMaster=auto -o ControlPersist=300`)
3. Escribe `research-frontend/public/runtime-config.json`:
   ```json
   {"apiBaseUrl":"https://emotio.cx/api","participantBaseUrl":"https://emotio.cx/participant"}
   ```
4. `npm install` local (si falta `node_modules`)
5. `npm run build` local (Vite → `dist/`)
6. Backup remoto: `cp -r ~/public_html/research ~/public_html/research.backup.YYYYMMDD_HHMMSS`
7. Limpia `~/public_html/research/` (preserva `.well-known`):
   `find . -mindepth 1 ! -name ".well-known" -exec rm -rf {} +`
8. `rsync -avz --delete dist/` → `~/public_html/research/`
9. `scp public/runtime-config.json` → `~/public_html/research/runtime-config.json`
10. Escribe `.htaccess` remoto (SPA rewrite + cache busting + security headers + gzip)
11. Verifica conteo de archivos en remoto

### Participant Frontend (`scripts/deploy-participant-frontend-cpanel.sh`)
Mismo flujo que research, con estas diferencias:
- `runtime-config.json`: `{"apiBaseUrl":"https://emotio.cx/api"}` (sin `participantBaseUrl`)
- Destino: `~/public_html/participant/`
- Limpieza preserva `.well-known` y `cgi-bin`

### Seeds (`scripts/run-seeds-cpanel.sh`)
1. Verifica SSH y `.env` en remoto
2. `rsync` de 4 archivos de seed → `~/emotioxv3/backend/scripts/`
3. `npm install` si falta `node_modules`
4. `ssh cpanel-emotio "cd ~/emotioxv3/backend && npx tsx scripts/seed_all_mysql.ts"`
5. Crea script temporal de verificación, ejecuta, y lo elimina

### Deploy completo (`scripts/deploy-to-cpanel.sh`)
1. Verifica SSH
2. `mkdir -p ~/emotioxv3/{backend,research-frontend,participant-frontend,scripts}` + `~/public_html/{research,participant,api}`
3. `rsync --delete` de los 3 componentes completos (incluye node_modules)
4. `npm install` + `npm run build` de los 3 en remoto
5. `rsync --delete dist/` de frontends → `~/public_html/{research,participant}/`
6. Pide URL del API (default `https://emotio.cx/api`), escribe `runtime-config.json`
7. Verifica archivos

## CI/CD (GitHub Actions)

| Workflow | Trigger | Build location |
|---|---|---|
| `deploy-backend-cpanel.yml` | push a `main` en `backend/**` | remoto |
| `deploy-research-frontend-cpanel.yml` | push a `main` en `research-frontend/**` | CI (Node 20) |
| `deploy-participant-frontend-cpanel.yml` | push a `main` en `participant-frontend/**` | CI (Node 20) |

Rama **`dev`** (solo `dev.emotio.cx`; no modifica producción):

| Workflow | Trigger | Destino remoto |
|---|---|---|
| `deploy-backend-cpanel-dev.yml` | push a `dev` en `backend/**` | `~/emotioxv3/backend-dev/` |
| `deploy-research-frontend-cpanel-dev.yml` | push a `dev` en `research-frontend/**` | `~/public_html/dev/research/` |
| `deploy-participant-frontend-cpanel-dev.yml` | push a `dev` en `participant-frontend/**` | `~/public_html/dev/participant/` |

Todos soportan `workflow_dispatch`.

**Secrets:** `CPANEL_SSH_PRIVATE_KEY`, `CPANEL_SSH_HOST`, `CPANEL_SSH_USER`, `CPANEL_SSH_PORT`

### Diferencias CI vs scripts locales
- Frontends: CI hace `npm ci` + build en runner, rsync del `dist/`. Scripts locales hacen `npm install` + build local.
- Backend: ambos hacen rsync del source y build en remoto.
- CI producción (`main`) no escribe `.htaccess` para research (solo participant). Los workflows **dev** escriben `.htaccess` en research y participant bajo `public_html/dev/`. Scripts locales escriben `.htaccess` para ambos en prod.

## Rutas remotas

```
~/emotioxv3/backend/
  ├── server-cpanel.js         # Entry point Passenger
  ├── passenger_startup.js     # Wrapper Passenger
  ├── dist/                    # TypeScript compilado
  ├── src/                     # Source
  ├── .env                     # Variables (NO en repo)
  ├── node_modules/
  └── tmp/restart.txt          # Touch para restart Passenger

~/public_html/research/
  ├── index.html
  ├── runtime-config.json
  ├── .htaccess
  └── assets/

~/public_html/participant/
  ├── index.html
  ├── runtime-config.json
  ├── .htaccess
  └── assets/
```

## Rollback

### Frontend
```bash
ssh cpanel-emotio
ls -la ~/public_html/research.backup.*
rm -rf ~/public_html/research
mv ~/public_html/research.backup.YYYYMMDD_HHMMSS ~/public_html/research
```

### Backend
```bash
ssh cpanel-emotio
cd ~/emotioxv3/backend
git log --oneline -5
git checkout <commit-anterior>
npm install --production=false && npm run build
touch tmp/restart.txt
```

### Base de datos
Forward-only. SQL inverso manual via phpMyAdmin o `npx tsx`.

## Comandos útiles

```bash
# Restart Passenger
ssh cpanel-emotio "cd ~/emotioxv3/backend && touch tmp/restart.txt"

# Ejecutar migración
ssh cpanel-emotio "cd ~/emotioxv3/backend && npx tsx scripts/<migration>.ts"

# Ver logs
ssh cpanel-emotio "cat ~/emotioxv3/backend/logs/error.log"

# Verificar .env
ssh cpanel-emotio "test -f ~/emotioxv3/backend/.env && echo OK"

# Health check
curl -s https://emotio.cx/api/health | jq .
```

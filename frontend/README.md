# EmotioXV2 Frontend

Frontend de la aplicación EmotioXV2, una plataforma para investigaciones sobre emociones y comportamiento humano.

## Requisitos

- Node.js >= 16.x
- npm >= 8.x

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone <repo-url>
   cd emotioXV2/frontend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Crear archivo de variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
   
   Edita el archivo `.env.local` con tus configuraciones locales.

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Construcción

Para construir la aplicación para producción:

```bash
npm run build
```

Para previsualizar la versión de producción localmente:

```bash
npm run preview
```

## Pruebas

Para ejecutar las pruebas unitarias:

```bash
npm run test
```

Para ejecutar las pruebas con cobertura:

```bash
npm run test:coverage
```

## Despliegue en AWS

El frontend de EmotioXV2 está configurado para desplegarse en AWS utilizando S3 y CloudFront. Se proporcionan scripts y configuraciones para automatizar este proceso.

### Configuración Inicial

1. Asegúrate de tener la CLI de AWS instalada y configurada:
   ```bash
   aws configure
   ```

2. Crea la infraestructura necesaria en AWS:
   ```bash
   ./scripts/create-aws-infrastructure.sh
   ```
   
   Este script te guiará a través del proceso de creación de buckets S3, distribuciones CloudFront y otras configuraciones necesarias.

### Despliegue Manual

Para desplegar manualmente la aplicación:

```bash
./scripts/deploy-frontend.sh
```

Este script compilará la aplicación y la desplegará en el bucket S3 configurado, además de invalidar la caché de CloudFront.

### Despliegue Automático (CI/CD)

El repositorio está configurado con GitHub Actions para desplegar automáticamente cuando se fusionan cambios en las ramas principales:

- La rama `develop` se despliega al entorno de desarrollo
- La rama `main` se despliega al entorno de producción

Para más detalles, consulta el archivo de workflow en `.github/workflows/deploy-frontend.yml`.

## Documentación

La documentación adicional está disponible en el directorio `docs/`:

- [Guía de Despliegue en AWS](docs/aws-deployment.md)
- [Infraestructura AWS](aws/README.md)

## Estructura del Proyecto

```
frontend/
├── public/               # Archivos estáticos
├── src/                  # Código fuente
│   ├── assets/           # Imágenes, fuentes, etc.
│   ├── components/       # Componentes React reutilizables
│   ├── contexts/         # Contextos de React
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Componentes de página
│   ├── services/         # Servicios para comunicación con API
│   ├── styles/           # Estilos globales
│   ├── types/            # Definiciones de TypeScript
│   ├── utils/            # Funciones utilitarias
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Punto de entrada
├── aws/                  # Configuración de AWS
│   └── cloudformation-template.yml # Template de infraestructura
├── scripts/              # Scripts utilitarios
│   ├── create-aws-infrastructure.sh # Crea infraestructura en AWS
│   └── deploy-frontend.sh # Despliega la aplicación a AWS
├── .github/              # Configuración de GitHub
│   └── workflows/        # Workflows de GitHub Actions
├── .env.example          # Ejemplo de variables de entorno
├── package.json          # Dependencias y scripts
└── README.md             # Este archivo
```

## Variables de Entorno

| Variable | Descripción | Valores Posibles |
|----------|-------------|------------------|
| REACT_APP_API_URL | URL base de la API | https://api.emotioxv2.com |
| REACT_APP_ENV | Entorno de ejecución | development, testing, production |

## Contribuir

1. Crea una rama para tu característica:
   ```bash
   git checkout -b feature/nombre-caracteristica
   ```

2. Realiza tus cambios y haz commit:
   ```bash
   git commit -m "feat: descripción del cambio"
   ```

3. Envía tus cambios a la rama:
   ```bash
   git push origin feature/nombre-caracteristica
   ```

4. Abre un Pull Request en GitHub.

## Convenciones

Este proyecto sigue las convenciones de Conventional Commits para mensajes de commit y Angular para estilos de código.

## Licencia

Este proyecto está licenciado bajo [LICENCIA]. 
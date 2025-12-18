# Guía para Solucionar Problemas de GitHub Actions

## Estado Actual
- ✅ Todos los builds locales son exitosos
- ❌ Los workflows de GitHub Actions están fallando
- El problema probablemente está en la configuración de secrets o permisos

## Pasos para Solucionar

### 1. Verificar Secrets de GitHub

Ejecuta el siguiente comando para ver los secrets configurados:

```bash
gh secret list
```

Deberías ver los siguientes secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `PARTICIPANT_FRONTEND_S3_BUCKET`
- `PARTICIPANT_FRONTEND_CLOUDFRONT_ID`
- `RESEARCH_FRONTEND_S3_BUCKET`
- `RESEARCH_FRONTEND_CLOUDFRONT_ID`
- `VITE_PARTICIPANT_FRONTEND_URL`

Nota: las variables sensibles del backend (por ejemplo `DB_PASSWORD`) ya no deben existir como GitHub Secrets.
Ahora se leen desde AWS SSM Parameter Store en el path `/emotioxv3/production/*` (o el stage correspondiente).

### 2. Configurar Secrets Faltantes

Si faltan secrets, puedes agregarlos con:

```bash
gh secret set NOMBRE_DEL_SECRET
```

### 3. Verificar Permisos de IAM

La clave de acceso AWS necesita estos permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/emotioxv3/production/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nombre-del-bucket",
        "arn:aws:s3:::nombre-del-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:PassRole",
        "lambda:*",
        "apigateway:*",
        "logs:*",
        "ec2:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4. Verificar Recursos de AWS

Confirma que existan:
- Buckets de S3 para ambos frontends
- Distribuciones de CloudFront para ambos frontends
- Que los nombres/IDs coincidan con los secrets

### 5. Probar Manualmente

Puedes probar el despliegue manualmente ejecutando:

```bash
# Para participant-frontend
cd participant-frontend
npm run build
aws s3 sync dist/ s3://NOMBRE_DEL_BUCKET --delete

# Para research-frontend
cd ../research-frontend
npm run build
aws s3 sync dist/ s3://NOMBRE_DEL_BUCKET --delete
```

## Información Adicional

### Archivos de Workflow
- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-participant-frontend.yml`
- `.github/workflows/deploy-research-frontend.yml`

### Documentación de Referencia
- [GitHub Actions](https://docs.github.com/en/actions)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/)
- [Serverless Framework](https://www.serverless.com/framework/docs/)
# Configuración de Dominio Personalizado para Frontends

Esta guía explica cómo configurar el dominio `emotiox.org` para `research-frontend` y `participant-frontend`.

## Opciones de Configuración

### Opción 1: Subdominios (Recomendado)
- `research.emotiox.org` → Research Frontend
- `participant.emotiox.org` → Participant Frontend

### Opción 2: Rutas
- `emotiox.org/research` → Research Frontend
- `emotiox.org/participant` → Participant Frontend

**Recomendamos la Opción 1 (subdominios)** por ser más limpia y fácil de mantener.

---

## Configuración con Subdominios

### Requisitos Previos
- Dominio `emotiox.org` gestionado en Namecheap
- Acceso a AWS Console con permisos para:
  - ACM (Certificate Manager)
  - CloudFront
  - Route53 (opcional, pero recomendado)
- AWS CLI configurado localmente

### Paso 1: Crear Certificados SSL en AWS ACM

Los certificados SSL deben estar en la región **us-east-1** (requerido por CloudFront).

#### 1.1 Crear certificado para research.emotiox.org

```bash
# Opción A: Usando AWS CLI
aws acm request-certificate \
  --domain-name research.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --subject-alternative-names www.research.emotiox.org
```

#### 1.2 Crear certificado para participant.emotiox.org

```bash
aws acm request-certificate \
  --domain-name participant.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --subject-alternative-names www.participant.emotiox.org
```

#### 1.3 Validar certificados

1. Ve a AWS Console → **Certificate Manager** (us-east-1)
2. Encuentra los certificados solicitados
3. Expande cada certificado para ver los registros DNS de validación
4. En Namecheap, agrega los registros CNAME de validación:
   - Ve a **Advanced DNS** en el panel de Namecheap
   - Agrega cada registro CNAME de validación
   - Espera a que el estado del certificado cambie a **Issued** (puede tomar 5-30 minutos)

### Paso 2: Obtener IDs de Distribuciones CloudFront

Necesitas los IDs de las distribuciones CloudFront existentes:

```bash
# Listar todas las distribuciones
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Comment]' \
  --output table
```

O desde los secrets de GitHub:
- `RESEARCH_FRONTEND_CLOUDFRONT_ID`
- `PARTICIPANT_FRONTEND_CLOUDFRONT_ID`

### Paso 3: Configurar Dominios Personalizados en CloudFront

#### 3.1 Obtener configuración actual

```bash
# Para Research Frontend
RESEARCH_DIST_ID="tu-research-cloudfront-id"
aws cloudfront get-distribution-config \
  --id $RESEARCH_DIST_ID > research-dist-config.json

# Para Participant Frontend
PARTICIPANT_DIST_ID="tu-participant-cloudfront-id"
aws cloudfront get-distribution-config \
  --id $PARTICIPANT_DIST_ID > participant-dist-config.json
```

#### 3.2 Actualizar configuración con dominios personalizados

Necesitas editar los archivos JSON y agregar:

1. **Aliases**: Agregar los dominios personalizados
2. **ViewerCertificate**: Agregar el certificado ACM

**Ejemplo para research-frontend:**

```json
{
  "CallerReference": "...",
  "Aliases": {
    "Quantity": 1,
    "Items": ["research.emotiox.org"]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID",
    "CertificateSource": "acm"
  }
}
```

#### 3.3 Aplicar configuración actualizada

```bash
# Obtener ETag actual (requerido para actualizar)
ETAG=$(aws cloudfront get-distribution-config \
  --id $RESEARCH_DIST_ID \
  --query 'ETag' \
  --output text)

# Actualizar distribución
aws cloudfront update-distribution \
  --id $RESEARCH_DIST_ID \
  --distribution-config file://research-dist-config.json \
  --if-match $ETAG
```

**⚠️ IMPORTANTE**: Las actualizaciones de CloudFront pueden tomar 15-30 minutos en propagarse.

### Paso 4: Configurar DNS en Namecheap

Una vez que CloudFront esté configurado, necesitas apuntar los subdominios a las distribuciones.

#### 4.1 Obtener CloudFront Domain Names

Después de actualizar las distribuciones, obtén los domain names:

```bash
aws cloudfront get-distribution \
  --id $RESEARCH_DIST_ID \
  --query 'Distribution.DomainName' \
  --output text

aws cloudfront get-distribution \
  --id $PARTICIPANT_DIST_ID \
  --query 'Distribution.DomainName' \
  --output text
```

Estos serán algo como: `d1234567890abc.cloudfront.net`

#### 4.2 Configurar CNAME en Namecheap

1. Ve a Namecheap → **Domain List** → **emotiox.org** → **Advanced DNS**
2. Agrega los siguientes registros CNAME:

```
Type: CNAME
Host: research
Value: d1234567890abc.cloudfront.net (tu CloudFront domain name de research)
TTL: Automatic

Type: CNAME
Host: participant
Value: d9876543210xyz.cloudfront.net (tu CloudFront domain name de participant)
TTL: Automatic
```

#### 4.3 Eliminar redirección existente (si aplica)

Si tienes una redirección de `emotiox.org` a `www.emotiox.org` en Namecheap:

1. Ve a **Domain List** → **emotiox.org** → **Domain** tab
2. En la sección **REDIRECT DOMAIN**, elimina la redirección existente si no la necesitas
3. O mantén la redirección si quieres que `emotiox.org` redirija a `www.emotiox.org`

**Nota**: Si quieres usar `emotiox.org` directamente (sin subdominios), necesitarías configurar CloudFront con el dominio raíz, lo cual requiere una configuración adicional.

### Paso 5: Verificar Configuración

Espera 15-30 minutos para que los cambios de DNS y CloudFront se propaguen, luego verifica:

```bash
# Verificar research.emotiox.org
curl -I https://research.emotiox.org

# Verificar participant.emotiox.org
curl -I https://participant.emotiox.org
```

Ambos deben responder con `200 OK` y mostrar el certificado SSL válido.

---

## Script de Automatización

Puedes usar el siguiente script para automatizar parte del proceso:

```bash
#!/bin/bash
# configure-frontend-domains.sh

set -e

RESEARCH_DIST_ID="${RESEARCH_FRONTEND_CLOUDFRONT_ID}"
PARTICIPANT_DIST_ID="${PARTICIPANT_FRONTEND_CLOUDFRONT_ID}"
RESEARCH_CERT_ARN="${RESEARCH_CERT_ARN}"
PARTICIPANT_CERT_ARN="${PARTICIPANT_CERT_ARN}"

if [ -z "$RESEARCH_DIST_ID" ] || [ -z "$PARTICIPANT_DIST_ID" ]; then
  echo "Error: RESEARCH_FRONTEND_CLOUDFRONT_ID y PARTICIPANT_FRONTEND_CLOUDFRONT_ID deben estar configurados"
  exit 1
fi

echo "Configurando dominios personalizados..."

# Obtener y actualizar Research Frontend
echo "Actualizando Research Frontend..."
ETAG=$(aws cloudfront get-distribution-config \
  --id $RESEARCH_DIST_ID \
  --query 'ETag' \
  --output text)

aws cloudfront get-distribution-config \
  --id $RESEARCH_DIST_ID > /tmp/research-config.json

# Editar JSON para agregar alias y certificado (requiere jq)
# ... (implementar edición del JSON)

echo "✅ Configuración completada"
echo "⏳ Espera 15-30 minutos para que los cambios se propaguen"
```

---

## Actualización de Workflows de GitHub Actions

Los workflows de deployment ya están configurados para usar CloudFront. No necesitas cambios adicionales, pero puedes agregar variables de entorno para los dominios personalizados si lo deseas.

---

## Troubleshooting

### El certificado no se valida
- Verifica que los registros CNAME de validación estén correctamente configurados en Namecheap
- Espera hasta 30 minutos para la propagación DNS
- Verifica que el certificado esté en la región `us-east-1`

### CloudFront muestra error de certificado
- Verifica que el certificado esté en estado **Issued**
- Verifica que el ARN del certificado sea correcto
- Asegúrate de que el certificado esté en `us-east-1`

### DNS no resuelve
- Verifica que los registros CNAME estén correctos
- Espera hasta 48 horas para la propagación completa (normalmente 15-30 minutos)
- Usa `dig research.emotiox.org` o `nslookup research.emotiox.org` para verificar

### Error 403 Forbidden
- Verifica que el bucket S3 tenga las políticas correctas
- Verifica que CloudFront tenga acceso al bucket
- Revisa los logs de CloudFront en AWS Console

---

## Referencias

- [AWS CloudFront Custom Domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [AWS ACM Certificate Manager](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html)
- [Namecheap DNS Management](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)


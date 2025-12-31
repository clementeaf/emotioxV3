# Configuración Rápida de Dominios para Frontends

Guía rápida para configurar `emotiox.org` para research-frontend y participant-frontend.

## Resumen

Configuraremos:
- `research.emotiox.org` → Research Frontend
- `participant.emotiox.org` → Participant Frontend

## Pasos Rápidos

### 1. Crear Certificados SSL

```bash
cd scripts
./create-frontend-certificates.sh
```

Este script:
- Solicita certificados SSL en AWS ACM (us-east-1)
- Muestra los registros DNS de validación que necesitas agregar en Namecheap

**Acción requerida**: Agrega los registros CNAME de validación en Namecheap y espera 5-30 minutos hasta que el estado del certificado sea "ISSUED".

### 2. Configurar CloudFront con Dominios Personalizados

Una vez que los certificados estén validados:

```bash
cd scripts
./configure-frontend-domains.sh \
  <RESEARCH_CLOUDFRONT_ID> \
  <PARTICIPANT_CLOUDFRONT_ID>
```

O usando variables de entorno:

```bash
export RESEARCH_FRONTEND_CLOUDFRONT_ID="E1234567890ABC"
export PARTICIPANT_FRONTEND_CLOUDFRONT_ID="E9876543210XYZ"
./configure-frontend-domains.sh
```

Este script:
- Actualiza las distribuciones CloudFront con los dominios personalizados
- Configura los certificados SSL
- Muestra los registros CNAME que necesitas agregar en Namecheap

**Acción requerida**: Agrega los registros CNAME en Namecheap apuntando a los dominios de CloudFront.

### 3. Configurar DNS en Namecheap

1. Ve a Namecheap → **Domain List** → **emotiox.org** → **Advanced DNS**
2. Agrega los registros CNAME que te mostraron los scripts:
   - `research` → CloudFront domain name de research
   - `participant` → CloudFront domain name de participant

### 4. Verificar

Espera 15-30 minutos y verifica:

```bash
curl -I https://research.emotiox.org
curl -I https://participant.emotiox.org
```

Ambos deben responder con `200 OK`.

## Obtener IDs de CloudFront

Si no conoces los IDs de las distribuciones CloudFront:

```bash
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Comment]' \
  --output table
```

O desde los secrets de GitHub Actions:
- `RESEARCH_FRONTEND_CLOUDFRONT_ID`
- `PARTICIPANT_FRONTEND_CLOUDFRONT_ID`

## Verificar Estado de Certificados

```bash
aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[*].[DomainName,Status]' \
  --output table
```

## Troubleshooting

### Certificado no se valida
- Verifica que los registros CNAME de validación estén correctos en Namecheap
- Espera hasta 30 minutos
- Verifica que el certificado esté en `us-east-1`

### DNS no resuelve
- Verifica los registros CNAME en Namecheap
- Espera 15-30 minutos para propagación
- Usa `dig research.emotiox.org` para verificar

### CloudFront muestra error
- Verifica que el certificado esté en estado "ISSUED"
- Verifica que el certificado esté en `us-east-1`
- Espera 15-30 minutos después de actualizar CloudFront

## Documentación Completa

Para más detalles, consulta: [FRONTEND_DOMAIN_SETUP.md](./FRONTEND_DOMAIN_SETUP.md)


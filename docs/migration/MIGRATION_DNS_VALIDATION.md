# Registros DNS para Validación de Certificados SSL

**Generado**: 2026-01-12  
**Región**: us-east-1

⚠️ **IMPORTANTE**: Estos registros DNS deben agregarse para validar los certificados SSL de ACM.

---

## 📋 Registros CNAME a Agregar

### 1. Certificado para api.emotiox.org

```
Tipo: CNAME
Nombre: _b7fca75e78d267150f333f17d04af8d9.api.emotiox.org
Valor: _4b183920cb5bd0a2adec8f1e40f5aec9.jkddzztszm.acm-validations.aws.
TTL: 300 (o el mínimo permitido)
```

### 2. Certificado para research.emotiox.org

```
Tipo: CNAME
Nombre: _c58e5565426898ac6b8b4ff71ac25b4d.research.emotiox.org
Valor: _730b2e1b8cf7f3280768c18e086c45aa.jkddzztszm.acm-validations.aws.
TTL: 300 (o el mínimo permitido)
```

### 3. Certificado para participant.emotiox.org

```
Tipo: CNAME
Nombre: _23b2c77d642f715011d9b6a18e8f6bc5.participant.emotiox.org
Valor: _c2220f57cf18b783850ac1ce8a53717a.jkddzztszm.acm-validations.aws.
TTL: 300 (o el mínimo permitido)
```

---

## 🔧 Cómo Agregar los Registros

### Opción 1: Si usas Route53 en AWS

```bash
# Obtener Hosted Zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='emotiox.org.'].Id | [0]" \
  --output text \
  --profile cefal)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"

# Crear archivo de cambios
cat > /tmp/dns_validation_changes.json <<'EOF'
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_b7fca75e78d267150f333f17d04af8d9.api.emotiox.org",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_4b183920cb5bd0a2adec8f1e40f5aec9.jkddzztszm.acm-validations.aws."
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_c58e5565426898ac6b8b4ff71ac25b4d.research.emotiox.org",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_730b2e1b8cf7f3280768c18e086c45aa.jkddzztszm.acm-validations.aws."
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_23b2c77d642f715011d9b6a18e8f6bc5.participant.emotiox.org",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_c2220f57cf18b783850ac1ce8a53717a.jkddzztszm.acm-validations.aws."
          }
        ]
      }
    }
  ]
}
EOF

# Aplicar cambios
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/dns_validation_changes.json \
  --profile cefal

echo "✅ Registros DNS agregados"
```

### Opción 2: Si usas otro proveedor de DNS

1. Accede al panel de control de tu proveedor DNS
2. Busca la zona `emotiox.org`
3. Agrega los 3 registros CNAME listados arriba
4. Guarda los cambios

---

## ⏱️ Tiempo de Validación

- **Propagación DNS**: 5-30 minutos
- **Validación ACM**: 5-30 minutos después de propagación
- **Total estimado**: 10-60 minutos

---

## ✅ Verificar Estado de Certificados

### Comando para verificar estado

```bash
# API Certificate
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/8a3c4eda-4a7c-4334-ad68-e8ac4d3104f5 \
  --region us-east-1 \
  --profile cefal \
  --query 'Certificate.Status' \
  --output text

# Research Certificate
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/359cf658-890f-4740-b2e7-0451748fc635 \
  --region us-east-1 \
  --profile cefal \
  --query 'Certificate.Status' \
  --output text

# Participant Certificate
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/baa999cf-bd36-4a18-9587-30e363e2e6bb \
  --region us-east-1 \
  --profile cefal \
  --query 'Certificate.Status' \
  --output text
```

**Estados posibles**:
- `PENDING_VALIDATION` - Esperando validación DNS
- `ISSUED` - ✅ Certificado validado y listo
- `FAILED` - Error en validación

### Script de verificación continua

```bash
#!/bin/bash
# Verificar estado cada 30 segundos hasta que estén validados

echo "⏳ Esperando validación de certificados..."

while true; do
  API_STATUS=$(aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/8a3c4eda-4a7c-4334-ad68-e8ac4d3104f5 \
    --region us-east-1 \
    --profile cefal \
    --query 'Certificate.Status' \
    --output text)
  
  RESEARCH_STATUS=$(aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/359cf658-890f-4740-b2e7-0451748fc635 \
    --region us-east-1 \
    --profile cefal \
    --query 'Certificate.Status' \
    --output text)
  
  PARTICIPANT_STATUS=$(aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/baa999cf-bd36-4a18-9587-30e363e2e6bb \
    --region us-east-1 \
    --profile cefal \
    --query 'Certificate.Status' \
    --output text)
  
  echo "Estado: API=$API_STATUS | Research=$RESEARCH_STATUS | Participant=$PARTICIPANT_STATUS"
  
  if [ "$API_STATUS" = "ISSUED" ] && [ "$RESEARCH_STATUS" = "ISSUED" ] && [ "$PARTICIPANT_STATUS" = "ISSUED" ]; then
    echo "✅ Todos los certificados validados!"
    break
  fi
  
  sleep 30
done
```

---

## 🔄 Después de la Validación

Una vez que los certificados estén validados (`ISSUED`):

### 1. Actualizar CloudFront Distributions con Aliases y Certificados

```bash
# Research Frontend
aws cloudfront update-distribution --id E66LOBLVM27WD ...

# Participant Frontend
aws cloudfront update-distribution --id E3GOM6XIXR36J4 ...
```

Ver script completo en: `scripts/migration/05-configure-cloudfront-aliases.sh`

### 2. Configurar Custom Domain para API Gateway

```bash
# Crear custom domain
aws apigateway create-domain-name \
  --domain-name api.emotiox.org \
  --certificate-arn arn:aws:acm:us-east-1:058310292956:certificate/8a3c4eda-4a7c-4334-ad68-e8ac4d3104f5 \
  --region us-east-1 \
  --profile cefal
```

Ver script completo en: `scripts/migration/06-configure-api-custom-domain.sh`

### 3. Actualizar Registros DNS Principales

```bash
# Agregar registros A (alias) para:
# - api.emotiox.org → API Gateway Custom Domain
# - research.emotiox.org → CloudFront Research
# - participant.emotiox.org → CloudFront Participant
```

---

## 🆘 Troubleshooting

### Los certificados no se validan después de 1 hora

1. **Verificar que los registros DNS existen**:
```bash
dig _b7fca75e78d267150f333f17d04af8d9.api.emotiox.org CNAME +short
```

2. **Verificar que los valores son exactos** (incluyendo el punto final)

3. **Esperar más tiempo** - A veces toma hasta 2-3 horas

### Error "FAILED" en certificado

1. Eliminar certificado fallido
2. Solicitar nuevo certificado
3. Verificar que los registros DNS son correctos antes de agregarlo

---

**Generado automáticamente por migración CLI**

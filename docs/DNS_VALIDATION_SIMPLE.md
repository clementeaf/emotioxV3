# 🔐 Validación SSL - Registros DNS Requeridos

## ¿Qué necesito hacer?

Agregar **3 registros CNAME** en el panel DNS de tu dominio `emotiox.org`.

---

## 📋 Los 3 Registros a Agregar

### Registro 1: Para `api.emotiox.org`

| Campo | Valor |
|-------|-------|
| **Tipo** | `CNAME` |
| **Nombre/Host** | `_b7fca75e78d267150f333f17d04af8d9.api` |
| **Valor/Destino** | `_4b183920cb5bd0a2adec8f1e40f5aec9.jkddzztszm.acm-validations.aws.` |
| **TTL** | `300` (o Automático) |

---

### Registro 2: Para `research.emotiox.org`

| Campo | Valor |
|-------|-------|
| **Tipo** | `CNAME` |
| **Nombre/Host** | `_c58e5565426898ac6b8b4ff71ac25b4d.research` |
| **Valor/Destino** | `_730b2e1b8cf7f3280768c18e086c45aa.jkddzztszm.acm-validations.aws.` |
| **TTL** | `300` (o Automático) |

---

### Registro 3: Para `participant.emotiox.org`

| Campo | Valor |
|-------|-------|
| **Tipo** | `CNAME` |
| **Nombre/Host** | `_23b2c77d642f715011d9b6a18e8f6bc5.participant` |
| **Valor/Destino** | `_c2220f57cf18b783850ac1ce8a53717a.jkddzztszm.acm-validations.aws.` |
| **TTL** | `300` (o Automático) |

---

## 🎯 Dónde Agregarlos

1. **Ir al panel de administración DNS** de tu dominio `emotiox.org`
   - Puede ser: Namecheap, GoDaddy, Cloudflare, etc.

2. **Buscar la sección "DNS Records" o "Registros DNS"**

3. **Hacer clic en "Add Record" o "Agregar Registro"**

4. **Llenar el formulario para cada registro** (hacer esto 3 veces)

---

## ⚠️ Importante: Campo "Nombre/Host"

**NO incluyas `.emotiox.org` en el campo Nombre/Host.**

### ✅ CORRECTO:
```
_b7fca75e78d267150f333f17d04af8d9.api
```

### ❌ INCORRECTO:
```
_b7fca75e78d267150f333f17d04af8d9.api.emotiox.org
```

El dominio base se agrega automáticamente por el panel DNS.

---

## 📸 Ejemplo Visual

Así se vería un registro en tu panel DNS:

```
┌─────────────────────────────────────────────────────────────┐
│ Agregar Registro DNS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tipo: [CNAME ▼]                                            │
│                                                             │
│ Nombre: [_b7fca75e78d267150f333f17d04af8d9.api          ]  │
│                                                             │
│ Valor:  [_4b183920cb5bd0a2adec8f1e40f5aec9.jkddzztszm.  ]  │
│         [acm-validations.aws.                           ]  │
│                                                             │
│ TTL:    [300] segundos                                     │
│                                                             │
│         [Cancelar]  [Guardar Registro]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ ¿Cuánto Tarda?

1. **Agregar los registros**: 5 minutos (manual)
2. **Propagación DNS**: 10-30 minutos (automático)
3. **Validación AWS**: 5-10 minutos (automático)

**Total: 20-45 minutos**

---

## ✅ Verificar Estado

Después de 20-30 minutos, ejecuta:

```bash
aws acm list-certificates --region us-east-1 --profile cefal \
  --query 'CertificateSummaryList[*].[DomainName,Status]' \
  --output table
```

Deberías ver:

```
+--------------------------+----------------------+
|  api.emotiox.org         |  ISSUED              |  ✅
|  research.emotiox.org    |  ISSUED              |  ✅
|  participant.emotiox.org |  ISSUED              |  ✅
+--------------------------+----------------------+
```

---

## 🆘 ¿Necesitas Ayuda?

### Si tu proveedor DNS es Cloudflare:
- Campo "Name": Usa exactamente lo que está en la tabla
- Campo "Content": Copia el valor completo incluyendo el punto final
- Proxy status: **DNS only** (nube gris)

### Si tu proveedor DNS es Namecheap:
- Campo "Host": Usa exactamente lo que está en la tabla
- Campo "Value": Copia el valor completo
- Tipo: CNAME Record

### Si tu proveedor DNS es GoDaddy:
- Campo "Host": Usa exactamente lo que está en la tabla
- Campo "Points to": Copia el valor completo
- TTL: 1 Hour (3600) está bien

---

## 📞 Avísame Cuando

1. ✅ Hayas agregado los 3 registros
2. ⏳ Hayan pasado 20-30 minutos
3. 🔍 Estés listo para verificar

Entonces continúo con los siguientes pasos de la migración.

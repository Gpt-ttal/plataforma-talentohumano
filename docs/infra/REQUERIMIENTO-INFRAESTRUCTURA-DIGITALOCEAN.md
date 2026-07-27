# Requerimiento de Infraestructura — Plataforma de Talento Humano

> **Para:** Área de TIC · **De:** Leonardo Reales (Talento Humano)
> **Objetivo:** Migrar la Plataforma de Talento Humano a la infraestructura de DigitalOcean
> que administra TIC. Este documento describe **qué necesita la aplicación y de qué tamaño**,
> para que TIC seleccione el plan exacto según los precios de su cuenta.

---

## 1. Qué es la aplicación

Plataforma web interna de Talento Humano (trámite de paz y salvo, administración de personal /
hoja de vida, capacitaciones, cursos, vacantes y desvinculaciones). Es de **uso interno** de la
institución — no es un sitio público de tráfico masivo. La usan funcionarios de Talento Humano,
Control Interno y las distintas áreas, con **baja concurrencia** (decenas de usuarios, no miles).

**Tecnología:** aplicación web (frontend) + servidor (backend en Node.js) + base de datos
**PostgreSQL**. Requiere además un espacio para guardar **archivos** (fotos de empleados).

---

## 2. Qué necesitamos de DigitalOcean

Dos recursos:

| # | Recurso DigitalOcean | Función |
|---|---|---|
| 1 | **Droplet** (servidor) | Ejecuta la aplicación (backend + frontend + sincronía en vivo) |
| 2 | **Managed Database — PostgreSQL** | Almacena todos los datos de forma segura y respaldada |

---

## 3. Tamaño recomendado de cada recurso

### 3.1 Servidor (Droplet)
- **Recomendado:** 2 vCPU · 4 GB RAM · 80 GB SSD.
- **Por qué:** cubre con holgura el backend, la sincronía en vivo (WebSocket) y servir la
  aplicación, con margen para compilar y para crecer. Es el punto de equilibrio entre costo y
  comodidad para una carga interna.
- **Archivos/fotos:** para el MVP se guardan en el disco del propio servidor (los 80 GB alcanzan
  de sobra). No se requiere un servicio de almacenamiento aparte por ahora.

### 3.2 Base de datos (Managed PostgreSQL)
- **Recomendado para arrancar:** 1 GB RAM · 1 vCPU · 10 GB de disco (nodo único).
- **Alternativa con margen:** 2 GB RAM · 1 vCPU · 30 GB (más cómodo en conexiones y memoria).
- **Versión:** PostgreSQL 16, 17 o 18 (cualquiera sirve; usar la más reciente estable de la cuenta).
- **Por qué:** nuestros datos son **livianos** (ver §4). El disco de 10 GB da varios años de
  margen. El tier de 2 GB solo se justifica si TIC quiere holgura extra desde el día uno.

---

## 4. Cuánto pesa realmente nuestra información

Medición hecha sobre el esquema real de la base de datos (30 tablas), proyectada a **500 funcionarios**
con su hoja de vida completa (datos personales, formación, experiencia, familia, contrato, salario):

| Concepto | Tamaño estimado |
|---|---|
| Datos de los 500 funcionarios + hoja de vida (texto) | **~5 MB** |
| Actividad institucional (capacitaciones, cursos, asistencias) — primer año | ~5–10 MB |
| Histórico de auditoría (crece con el uso) | ~80–100 MB por año |
| **Total en la base de datos — primer año** | **~100 MB** (muy por debajo de 1 GB) |
| **Total en la base de datos — a 5 años** | **~0.5–1 GB** |
| Fotos de empleados (en el disco del servidor, no en la base de datos) | **~150 MB** |

**Conclusión:** es una carga de datos **liviana**. Los planes de entrada de DigitalOcean son
suficientes durante años; no hace falta comprar tiers grandes.

---

## 5. Estimado de costo mensual (referencia)

> Precios de lista de DigitalOcean (julio 2026, USD). **TIC tiene los precios exactos de su cuenta**
> y define la elección final. Conversión aproximada a COP usada aquí: 1 USD ≈ 3.700 COP.

**Para el MVP (lo que se recomienda comprar ahora):**

| Recurso | Plan | USD/mes | Aprox. COP/mes |
|---|---|---|---|
| Servidor (Droplet) | 2 vCPU · 4 GB · 80 GB | $24 | ~89.000 |
| Base de datos (PostgreSQL) | 1 GB · 1 vCPU · 10 GB | $15 | ~56.000 |
| **Total** | | **~$39** | **~145.000** |

Más adelante, si el uso lo pide, se puede **subir la base de datos a 2 GB** (~$30/mes) o **agregar
un nodo de respaldo** para tolerancia a fallos — ambos con un clic, sin reinstalar nada.

---

## 6. Preguntas / decisiones para TIC

1. **Alta disponibilidad:** ¿la base de datos requiere un **nodo standby** (tolerancia a fallos)?
   Duplica el costo de la base de datos. Para una herramienta interna suele bastar el nodo único
   al inicio.
2. **Backups y retención:** ¿qué política de respaldos y por cuánto tiempo? (DigitalOcean incluye
   backups automáticos; conviene confirmar la ventana de recuperación).
3. **Región / datacenter:** ¿en cuál datacenter se aloja? (relevante para tratamiento de datos —
   Ley 1581 de 2012). Confirmar que el contrato de tratamiento de datos (DPA) esté aceptado.
4. **Administración del servidor:** ¿TIC administra el sistema operativo del Droplet (actualizaciones,
   seguridad, certificado TLS) o lo coordinamos con el equipo de desarrollo?
5. **Dominio:** ¿qué subdominio institucional se asignará a la aplicación?

---

## 7. Resumen en una línea

Aplicación interna de carga liviana. Para el MVP se necesita **un servidor mediano (2 vCPU / 4 GB)**
y una **base de datos PostgreSQL de entrada (1 GB)**. Costo estimado **~$39/mes**. TIC define el
plan exacto según su cuenta.

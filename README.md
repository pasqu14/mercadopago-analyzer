# MercadoPago Analyzer 🧾🤖

Sistema completo de análisis de consumo en Mercado Pago con IA integrada (Claude / Gemini). Dashboard interactivo, sync automático cada 6h, categorización automática y análisis por lenguaje natural.

## Stack

- **Runtime**: Node.js 20+
- **Lenguaje**: TypeScript (strict)
- **API**: Express.js
- **ORM**: Prisma + PostgreSQL (Neon)
- **IA**: Anthropic Claude (`claude-sonnet-4-6`) con fallback a Gemini
- **Frontend**: HTML + Tailwind CDN + Chart.js
- **Deploy**: Render (web service + cron job)

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/mercadopago-analysis.git
cd mercadopago-analysis
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` y completá:

| Variable | Descripción |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago (panel de developers) |
| `DATABASE_URL` | Connection string de Neon PostgreSQL |
| `ANTHROPIC_API_KEY` | API key de Anthropic (opcional, para IA) |
| `GEMINI_API_KEY` | API key de Google Gemini (fallback opcional) |
| `PORT` | Puerto del servidor (default: 3000) |

### 4. Crear y migrar la base de datos

```bash
# Crear schema en Neon
npx prisma migrate dev --name init

# Generar cliente Prisma
npx prisma generate
```

### 5. Poblar con datos de prueba (opcional)

```bash
npm run seed
```

Crea 80 pagos ficticios con comercios reales (Carrefour, Spotify, Uber, etc.) para testear sin credenciales de MP.

### 6. Iniciar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000` para ver el dashboard.

---

## Obtener credenciales de Mercado Pago

1. Ir a [developers.mercadopago.com](https://developers.mercadopago.com)
2. Crear una aplicación o usar una existente
3. Copiar el **Access Token** (test o producción)
4. Pegarlo en `MP_ACCESS_TOKEN` en tu `.env`

> Para modo **test**, usá el Access Token que empieza con `TEST-`. Para producción, el que empieza con `APP_USR-`.

---

## Deploy en Render

### Opción A: usando `render.yaml` (recomendado)

1. Hacer push del repo a GitHub
2. En Render → **New → Blueprint**
3. Conectar el repositorio
4. Render detecta `render.yaml` automáticamente y crea:
   - Un **Web Service** (API + frontend)
   - Un **Cron Job** (sync cada 6h)
5. Completar las variables de entorno en el dashboard de Render
6. Deploy 🚀

### Opción B: manual

1. Render → **New → Web Service**
2. Conectar repo → seleccionar rama `main`
3. Configurar:
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Runtime**: Node 20
4. Agregar variables de entorno
5. Para el cron: **New → Cron Job**, mismo repo, schedule `0 0,6,12,18 * * *`, start command: `node dist/cron/run-sync.js`

---

## Endpoints API

### Sincronización

```
POST /api/sync
```
Fuerza sync con Mercado Pago. Body opcional: `{ "days": 30, "full": false }`.

```
GET /api/sync/status
```
Estado del último sync.

### Gastos

```
GET /api/expenses/summary
```
Resumen del mes actual + mes anterior + últimas 10 transacciones.

```
GET /api/expenses/monthly/{year}/{month}
```
Desglose completo de un mes: total, categorías, transacciones.

```
GET /api/expenses?page=1&limit=20&category=Alimentación&year=2024&month=7
```
Listado paginado con filtros.

### Pagos

```
PATCH /api/payments/{id}/category
Body: { "category": "Alimentación" }
```
Actualiza la categoría manualmente.

### Análisis IA

```
POST /api/analyze
Body: { "question": "¿Dónde gasté más este mes?", "period": { "year": 2024, "month": 7 } }
```
Análisis por lenguaje natural con Claude/Gemini.

### Tendencias

```
GET /api/trends?days=90
```
Datos para gráfico: promedio diario, proyección mensual, outliers.

---

## Categorías automáticas

El sistema categoriza automáticamente por nombre de comercio:

| Categoría | Ejemplos |
|---|---|
| Alimentación | Carrefour, Coto, Rappi, McDonald's |
| Transporte | Uber, Cabify, YPF, Shell |
| Suscripciones | Netflix, Spotify, Disney+, Steam |
| Servicios | Edesur, Personal, Fibertel |
| Salud | Farmacity, OSDE, médicos |
| Entretenimiento | Cines, bares, boliches |
| Ropa | Zara, H&M, Nike |
| Otros | Resto |

Podés reclasificar cualquier pago manualmente desde la tabla.

---

## Tests

```bash
npm test
```

Cubre:
- `sync.test.ts` — sincronización: nuevos pagos, duplicados, logs
- `categorizer.test.ts` — categorización automática
- `api.test.ts` — endpoints REST (health, summary, sync, analyze)

---

## Estructura del proyecto

```
├── prisma/
│   ├── schema.prisma          # Modelos: Payment, Category, AnalyticsCache, SyncLog
│   ├── seed.ts                # Datos de prueba
│   └── migrations/
├── src/
│   ├── app.ts                 # Express + cron init
│   ├── config/
│   │   ├── env.ts             # Validación de env vars (Zod)
│   │   └── logger.ts          # Pino logger
│   ├── db/
│   │   └── prisma.ts          # PrismaClient singleton
│   ├── services/
│   │   ├── mercadopago.service.ts  # API de MP + paginación + rate limiting
│   │   ├── sync.service.ts         # Sync + deduplicación
│   │   ├── ai.service.ts           # Claude + Gemini fallback
│   │   └── analytics.service.ts   # Resúmenes, tendencias, outliers
│   ├── routes/
│   │   ├── sync.routes.ts
│   │   ├── expenses.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── analyze.routes.ts
│   │   └── trends.routes.ts
│   ├── middleware/
│   │   └── error.middleware.ts
│   ├── utils/
│   │   ├── categorizer.ts     # Heurística de categorización
│   │   └── retry.ts           # Backoff exponencial
│   └── cron/
│       ├── sync.cron.ts       # Cron interno (node-cron)
│       └── run-sync.ts        # Entry point para Render Cron Job
├── public/
│   └── index.html             # Dashboard (Tailwind + Chart.js)
├── tests/
├── .env.example
├── render.yaml
├── Procfile
└── README.md
```

---

## Flujo completo

1. **Deploy** → Render ejecuta `npm run build && prisma migrate deploy && npm start`
2. **Startup** → Cron interno arranca (sync 00:00/06:00/12:00/18:00 UTC)
3. **Sync** → Trae pagos de MP, elimina duplicados por `mp_id`, categoriza, guarda en DB
4. **Dashboard** → Usuario ve tabla + gráficos con datos reales
5. **Análisis IA** → `POST /api/analyze` → construye contexto con top categorías + anomalías → llama Claude → retorna insight en markdown
6. **Chat** → Usuario pregunta en lenguaje natural, respuesta contextualizada al mes activo

---

## Licencia

MIT

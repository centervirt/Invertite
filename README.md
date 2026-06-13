# 🇦🇷 Invertite — Plataforma de Educación Financiera Argentina

Aprendé a invertir tu dinero con cursos interactivos, simulador y tutor con IA.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 24 + Express 4 |
| Base de datos | PostgreSQL 15 |
| Cache / Sesiones | Redis 7 |
| Autenticación | JWT + Bcrypt |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| IA Tutor | Gemini 1.5 Flash (Google AI) |
| Pagos | MercadoPago SDK + Ualá Bis |
| Deploy | PM2 + Nginx en VPS |

## Requisitos previos

- Node.js >= 20 LTS
- PostgreSQL 15
- Redis 7
- Git

## Setup local rápido

### 1. Clonar repositorio
```bash
git clone https://github.com/TU_USUARIO/invertite.git
cd invertite
```

### 2. Configurar variables de entorno
```bash
cp .env.example backend/.env
# Editar backend/.env con tus credenciales locales
```

### 3. Instalar dependencias
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Crear base de datos PostgreSQL
```sql
CREATE USER invertite_user WITH PASSWORD 'tu_password';
CREATE DATABASE invertite_db OWNER invertite_user;
```

### 5. Ejecutar migraciones
```bash
cd backend
psql -U invertite_user -d invertite_db -f migrations/001_init.sql
```

### 6. Iniciar en desarrollo
```bash
# Terminal 1 — Backend (puerto 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend && npm run dev
```

### 7. Verificar
- Frontend: http://localhost:5173
- API Health: http://localhost:3001/api/health

## Estructura del proyecto

```
invertite/
├── backend/
│   ├── src/
│   │   ├── config/       → db.js, redis.js, gemini.js
│   │   ├── controllers/  → Lógica de rutas
│   │   ├── middlewares/  → auth, errorHandler, rateLimiter
│   │   ├── models/       → Queries SQL
│   │   ├── routes/       → Definición de endpoints
│   │   ├── services/     → Lógica de negocio
│   │   └── utils/        → Helpers y validadores
│   ├── migrations/       → Scripts SQL
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/   → UI reutilizables
│   │   ├── pages/        → Vistas
│   │   ├── hooks/        → Custom hooks
│   │   ├── context/      → Auth, Theme, etc.
│   │   ├── services/     → Clientes Axios
│   │   └── assets/       → Imágenes, íconos
│   ├── vite.config.js
│   └── package.json
│
├── nginx/                → Configuración para VPS
├── .env.example
├── .gitignore
└── README.md
```

## Scripts disponibles

### Backend
```bash
npm run dev       # Desarrollo con nodemon
npm start         # Producción
npm test          # Tests con Jest
npm run test:coverage
```

### Frontend
```bash
npm run dev       # Vite dev server (port 5173)
npm run build     # Build de producción
npm run preview   # Preview del build
```

## Etapas de desarrollo

- [x] Etapa 1: Estructura inicial e inicialización
- [ ] Etapa 2: Autenticación (JWT + Bcrypt)
- [ ] Etapa 3: Módulos de aprendizaje (cursos + lecciones)
- [ ] Etapa 4: Simulador de inversiones
- [ ] Etapa 5: IA Tutor (Gemini)
- [ ] Etapa 6: Pagos (MercadoPago + Ualá Bis)
- [ ] Etapa 7: Deploy en VPS

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa documentada.

> ⚠️ **Nunca commitear el archivo `.env` real al repositorio.**

## Licencia

Privado — Todos los derechos reservados © 2026 Invertite

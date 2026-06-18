# INVERTITE 📈

INVERTITE es una plataforma web interactiva de educación financiera y simulación de inversiones, diseñada específicamente para el público de Argentina que desea dar sus primeros pasos en el mundo de las finanzas y los mercados locales. 

Es una creación exclusiva de **NeuraSolutions**.

---

## 🎯 ¿A dónde apunta el proyecto?

El objetivo principal de INVERTITE es democratizar la educación financiera, permitiendo que cualquier persona aprenda a gestionar su capital, comprender los instrumentos financieros locales e internacionales y experimentar el trading real en un entorno controlado y libre de riesgos.

Apunta a resolver la brecha de conocimiento en finanzas a través de:
* **Módulos Educativos**: Lecciones estructuradas sobre renta fija, renta variable, cauciones, CEDEARs y criptomonedas.
* **Tutoría con IA**: Un asistente inteligente contextualizado que responde dudas y acompaña el progreso educativo del usuario en lenguaje claro y adaptado al ecosistema argentino.
* **Simulador de Cartera en Tiempo Real**: Un sistema transaccional de *paper trading* que inicia con $1.000.000 ARS virtuales, pero que utiliza **precios de mercado 100% reales** extraídos de fuentes oficiales para que los usuarios pongan a prueba sus estrategias sin arriesgar capital real.
* **Gamificación y Rankings**: Tablas de posiciones comunitarias anónimas (semanal, mensual e histórica) para fomentar una competencia sana basada en rendimientos efectivos de las carteras virtuales.

---

## 🛠️ Tecnologías del Proyecto

El ecosistema de INVERTITE está construido con una arquitectura moderna:

### Backend
* **Node.js** & **Express** para el servidor API REST.
* **PostgreSQL** como base de datos relacional para el manejo seguro de usuarios, transacciones, portfolios y progresos.
* **Redis** como base de caché en memoria para optimizar la velocidad de carga de las cotizaciones y sesiones.
* Integración con APIs de mercado y scraping resiliente para cotizaciones en vivo (Dólar MEP, CCL, Blue, CEDEARs, Criptomonedas, FCIs y Cauciones).

### Frontend
* **React** con **Vite** para una experiencia SPA (Single Page Application) rápida y dinámica.
* **Tailwind CSS** para un diseño moderno con estéticas oscuras de alto rendimiento visual.
* **Chart.js** para renderizar gráficos interactivos del historial y evolución del portfolio.

---

## 🚀 Despliegue Local

### Requisitos Previos
* Node.js (v18 o superior)
* PostgreSQL
* Redis

### 1. Clonar el repositorio
```bash
git clone https://github.com/centervirt/Invertite.git
cd Invertite
```

### 2. Configurar Variables de Entorno (.env)
Crea un archivo `.env` en la carpeta `backend/` basándote en las variables requeridas (como credenciales de DB, Redis y API Keys de IA) y asegúrate de no subirlo al repositorio.

### 3. Iniciar el Servidor Backend
```bash
cd backend
npm install
npm run dev
```

### 4. Iniciar el Servidor Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Abre **[http://localhost:5173](http://localhost:5173)** en tu navegador para empezar.

---

*Creado con orgullo por **NeuraSolutions** © 2026.*

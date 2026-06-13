# Workflow N8N RAG — invertite-tutor-rag

Este documento describe la arquitectura y nodos del workflow de N8N diseñado para actuar como motor de RAG (Retrieval-Augmented Generation) del Tutor IA en **INVERTITE**.

## Detalles del Workflow

- **Nombre**: `invertite-tutor-rag`
- **Trigger**: Webhook POST `/webhook/invertite-tutor`
- **Formato de entrada esperado**:
  ```json
  {
    "question": "¿Qué es un CEDEAR y cómo cubre el tipo de cambio?",
    "lesson_module": "CEDEARs y Mercado Global",
    "user_level": "beginner"
  }
  ```

---

## Estructura del Pipeline de N8N

### Nodo 1: Webhook Trigger (HTTP POST)
- **Ruta**: `/webhook/invertite-tutor`
- **Acción**: Recibe la pregunta (`question`), la lección activa (`lesson_module`) y el nivel del usuario (`user_level`).

### Nodo 2: HTTP Request (Dolarito API)
- **Endpoint**: `https://api.dolarito.ar/v2/actual` (u otra API cambiaria configurada)
- **Acción**: Trae las cotizaciones actualizadas del dólar oficial, dólar MEP y dólar CCL en pesos argentinos.

### Nodo 3: HTTP Request (BCRA API)
- **Endpoint**: `https://api.bcra.gob.ar/estadisticas/v2.0/principales`
- **Acción**: Obtiene las tasas de política monetaria (Leliqs/pases) y la tasa promedio de Plazos Fijos vigentes.

### Nodo 4: HTTP Request (CAFCI API / Web Scraping)
- **Endpoint**: API o sitio de CAFCI (Cámara Argentina de Fondos Comunes de Inversión)
- **Acción**: Recupera el rendimiento reciente de fondos destacados del tipo Money Market (ej: Mercado Pago, Ualá, FIMA).

### Nodo 5: Qdrant Vector Store Query
- **Vector Store**: Qdrant Cloud / Local
- **Acción**: Realiza una búsqueda semántica de los chunks de contenido educativo de Invertite más relevantes para la pregunta del usuario.
- **Embeddings Model**: `text-embedding-004` (Google Vertex/AI) o similar.

### Nodo 6: Code Node (Ensamblado del Contexto)
- **Lenguaje**: JavaScript (Sandbox de N8N)
- **Acción**: Fusiona el contenido estático recuperado de Qdrant con los datos financieros en tiempo real (dólar MEP, tasas BCRA, rendimientos FCI) en un bloque estructurado de texto markdown.
- **Ejemplo de compilado**:
  ```markdown
  - CEDEARs son certificados representativos de acciones extranjeras...
  - Tipo de Cambio Actual: Dólar MEP: $1250 ARS | Dólar CCL: $1280 ARS.
  - Tasa de Plazo Fijo Actual: 35% TNA.
  ```

### Nodo 7: Respond to Webhook (Respuesta)
- **Formato**: JSON
- **Estructura devuelta**:
  ```json
  {
    "context": "[Contexto estructurado en markdown para Gemini]",
    "sources": [
      { "title": "Módulo 7 Lección 1: ¿Qué son los CEDEARs?", "url": "https://invertite.ar/modules/7/lessons/1" }
    ],
    "market_data": {
      "mep": 1250,
      "ccl": 1280,
      "plazo_fijo_tna": 35
    }
  }
  ```

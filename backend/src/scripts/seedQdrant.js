/**
 * INVERTITE — Script de Sincronización con Qdrant Vector DB
 * Lee las lecciones de la base de datos PostgreSQL, genera embeddings con Gemini
 * y las sube a la base de datos vectorial Qdrant en EasyPanel.
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { queryAll } = require('../config/database');
const crypto = require('crypto');

const QDRANT_URL = 'https://proyecto-qdrant-db.tmmjdr.easypanel.host';
const COLLECTION_NAME = 'invertite_knowledge';

// Inicializar Gemini
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY no configurada en el archivo .env');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Función para obtener embeddings de Gemini
async function getEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error(`❌ Error al generar embedding para el texto: "${text.substring(0, 30)}..."`, error.message);
    throw error;
  }
}

// Función para procesar y limpiar content_json de cada lección
function extractTextChunks(lesson) {
  const chunks = [];
  const content = lesson.content_json;
  
  if (!Array.isArray(content)) return chunks;

  let currentChunk = '';
  let headingText = '';

  for (const block of content) {
    if (block.type === 'heading') {
      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: `Módulo: ${lesson.module_title}\nLección: ${lesson.title}\n${headingText ? `Tema: ${headingText}\n` : ''}${currentChunk.trim()}`,
          lessonId: lesson.id,
          title: lesson.title,
          moduleTitle: lesson.module_title
        });
        currentChunk = '';
      }
      headingText = block.text;
    } else if (block.type === 'paragraph' || block.type === 'intro' || block.type === 'highlight') {
      currentChunk += block.text + '\n';
    } else if (block.type === 'example') {
      currentChunk += `Ejemplo (${block.title || 'Ejemplo'}): ${block.text}\n`;
    } else if (block.type === 'summary' && Array.isArray(block.items)) {
      currentChunk += `Resumen:\n` + block.items.map(item => `- ${item}`).join('\n') + '\n';
    } else if (block.type === 'steps' && Array.isArray(block.items)) {
      currentChunk += `Pasos:\n` + block.items.map(item => `${item.step}. ${item.title}: ${item.text}`).join('\n') + '\n';
    } else if (block.type === 'comparison' && Array.isArray(block.rows)) {
      currentChunk += `Tabla comparativa:\n` + block.rows.map(row => row.join(' | ')).join('\n') + '\n';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: `Módulo: ${lesson.module_title}\nLección: ${lesson.title}\n${headingText ? `Tema: ${headingText}\n` : ''}${currentChunk.trim()}`,
      lessonId: lesson.id,
      title: lesson.title,
      moduleTitle: lesson.module_title
    });
  }

  return chunks;
}

async function run() {
  try {
    console.log('🔄 Iniciando inicialización de Qdrant...');
    
    // 1. Eliminar colección existente si hay (para hacer refresh limpio)
    console.log(`🗑️ Eliminando colección "${COLLECTION_NAME}" si existe...`);
    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'DELETE'
    }).catch(() => {});

    // 2. Crear nueva colección
    console.log(`➕ Creando colección "${COLLECTION_NAME}" en Qdrant...`);
    const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vectors: {
          size: 768,
          distance: 'Cosine'
        }
      })
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`Error al crear colección: ${JSON.stringify(createData)}`);
    }
    console.log('✅ Colección creada exitosamente.');

    // 3. Obtener lecciones de Postgres
    console.log('🔍 Cargando lecciones desde PostgreSQL...');
    const lessons = await queryAll(
      `SELECT l.id, l.title, m.title AS module_title, l.content_json 
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       WHERE l.is_published = true`
    );

    console.log(`📚 Se encontraron ${lessons.length} lecciones publicadas.`);

    // 4. Procesar y cargar a Qdrant
    let totalPoints = 0;
    const points = [];

    for (const lesson of lessons) {
      const chunks = extractTextChunks(lesson);
      console.log(`   └─ Procesando "${lesson.title}": ${chunks.length} chunks extraídos.`);

      for (const chunk of chunks) {
        console.log(`      ⚡ Generando embedding de Gemini para el chunk de "${chunk.title}"...`);
        const vector = await getEmbedding(chunk.text);
        
        // Generar UUID basado en hash del texto para consistencia
        const pointId = crypto.createHash('md5').update(chunk.text).digest('hex');
        const formattedUuid = `${pointId.substring(0,8)}-${pointId.substring(8,12)}-${pointId.substring(12,16)}-${pointId.substring(16,20)}-${pointId.substring(20,32)}`;

        points.push({
          id: formattedUuid,
          vector,
          payload: {
            text: chunk.text,
            lessonId: chunk.lessonId,
            title: chunk.title,
            moduleTitle: chunk.moduleTitle
          }
        });
        totalPoints++;
      }
    }

    // 5. Enviar en lotes a Qdrant
    if (points.length > 0) {
      console.log(`📤 Subiendo ${points.length} vectores de conocimiento a Qdrant...`);
      
      const upsertRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points })
      });

      const upsertData = await upsertRes.json();
      if (!upsertRes.ok) {
        throw new Error(`Error al subir puntos a Qdrant: ${JSON.stringify(upsertData)}`);
      }
      console.log(`✅ ¡Conocimiento cargado exitosamente en Qdrant! total de puntos: ${totalPoints}`);
    } else {
      console.log('⚠️ No hay chunks para cargar.');
    }

    console.log('🎉 Sincronización completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error general durante la sincronización:', error.message);
    process.exit(1);
  }
}

run();

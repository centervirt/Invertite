-- ============================================================
-- INVERTITE — Migración 002: Seed de datos iniciales
-- ============================================================

-- ============================================================
-- PLANES DE SUSCRIPCIÓN
-- ============================================================
INSERT INTO plans (name, slug, price_ars, interval, features, is_active) VALUES
(
  'Gratis',
  'free',
  0.00,
  'monthly',
  '["Acceso a Módulo 1 completo","Simulador básico","Tutor IA (5 consultas/día)","Comunidad de Discord"]',
  true
),
(
  'Mensual',
  'monthly',
  4990.00,
  'monthly',
  '["Acceso a todos los módulos","Simulador avanzado con portafolio","Tutor IA ilimitado","Certificados de completion","Sin publicidad","Soporte prioritario"]',
  true
),
(
  'Anual',
  'yearly',
  39990.00,
  'yearly',
  '["Todo lo del plan Mensual","Ahorrás 2 meses gratis","Acceso anticipado a nuevos módulos","Sesión 1-a-1 mensual con tutor","Badge exclusivo Inversor Anual"]',
  true
),
(
  'Vitalicio',
  'lifetime',
  149990.00,
  'lifetime',
  '["Acceso de por vida a todo el contenido","Todas las funciones premium","Actualizaciones gratuitas para siempre","Badge exclusivo Inversor Vitalicio","Acceso a grupo VIP de Telegram"]',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MÓDULOS DE APRENDIZAJE (10 módulos)
-- ============================================================
INSERT INTO modules (order_index, title, slug, description, color_accent, estimated_hours, is_published) VALUES
(1,
 'Fundamentos del Dinero',
 'fundamentos-dinero',
 'Entendé cómo funciona el dinero, la inflación y por qué invertir es esencial en Argentina.',
 'emerald',
 3.5,
 true
),
(2,
 'El Sistema Financiero Argentino',
 'sistema-financiero-argentino',
 'Conocé los actores del mercado: BCRA, CNV, BYMA, Merval y cómo regulan las inversiones.',
 'teal',
 4.0,
 true
),
(3,
 'Plazo Fijo y Depósitos',
 'plazo-fijo-depositos',
 'La inversión más simple del país. Aprendé TNA, TEA, inflación real y cuándo conviene.',
 'cyan',
 3.0,
 true
),
(4,
 'Fondos Comunes de Inversión',
 'fondos-comunes-inversion',
 'Diversificá desde el primer peso. FCI money market, renta fija y renta variable.',
 'blue',
 4.5,
 true
),
(5,
 'Bonos y Renta Fija',
 'bonos-renta-fija',
 'Letras del Tesoro, bonos soberanos, obligaciones negociables y cómo leer su rendimiento.',
 'indigo',
 5.0,
 true
),
(6,
 'Acciones del Merval',
 'acciones-merval',
 'Comprá tu primera acción argentina. Análisis fundamental, P/E, dividendos y sectores.',
 'violet',
 6.0,
 true
),
(7,
 'CEDEARs y Mercado Global',
 'cedears-mercado-global',
 'Invertí en Apple, Google y ETFs desde Argentina. Cobertura de tipo de cambio.',
 'purple',
 5.5,
 true
),
(8,
 'Dólar Financiero y Cobertura',
 'dolar-financiero-cobertura',
 'MEP, CCL, futuros y cómo proteger tus ahorros de la devaluación.',
 'fuchsia',
 4.0,
 true
),
(9,
 'Construcción de Portafolio',
 'construccion-portafolio',
 'Armá tu estrategia de inversión según tu perfil de riesgo, plazo y objetivos.',
 'rose',
 5.0,
 true
),
(10,
 'Impuestos y Aspecto Legal',
 'impuestos-aspecto-legal',
 'Bienes personales, impuesto a las ganancias sobre inversiones y declaración jurada.',
 'amber',
 3.5,
 false
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- LECCIONES (5 por módulo = 50 lecciones)
-- Nota: Se usan subqueries para obtener los IDs de módulos
-- ============================================================

-- MÓDULO 1: Fundamentos del Dinero
WITH m AS (SELECT id FROM modules WHERE slug = 'fundamentos-dinero')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, '¿Qué es el dinero y para qué sirve?',          'que-es-el-dinero',            20),
  (2, 'La inflación en Argentina: historia y realidad', 'inflacion-argentina',         25),
  (3, '¿Por qué no alcanza con ahorrar en efectivo?',  'ahorrar-efectivo-problema',   20),
  (4, 'Tu primer presupuesto personal',                 'primer-presupuesto',          30),
  (5, 'El poder del interés compuesto',                 'interes-compuesto',           25)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 2: Sistema Financiero Argentino
WITH m AS (SELECT id FROM modules WHERE slug = 'sistema-financiero-argentino')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'El BCRA: qué es y qué regula',                  'bcra-que-es',                 20),
  (2, 'La CNV y el mercado de capitales',               'cnv-mercado-capitales',       20),
  (3, 'BYMA y el Merval: la bolsa argentina',           'byma-merval-bolsa',           25),
  (4, 'Brokers y cuentas comitentes: cómo operar',     'brokers-cuenta-comitente',    30),
  (5, 'Regulaciones y protección al inversor',          'regulaciones-proteccion',     20)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 3: Plazo Fijo y Depósitos
WITH m AS (SELECT id FROM modules WHERE slug = 'plazo-fijo-depositos')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Cómo funciona un plazo fijo tradicional',       'como-funciona-plazo-fijo',    20),
  (2, 'TNA vs TEA: la tasa que importa',               'tna-vs-tea',                  25),
  (3, 'Plazo fijo UVA: ajustado por inflación',        'plazo-fijo-uva',              25),
  (4, '¿Conviene el plazo fijo hoy?',                  'conviene-plazo-fijo',         20),
  (5, 'Cuentas remuneradas y FIMA Plus',               'cuentas-remuneradas-fima',    20)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 4: Fondos Comunes de Inversión
WITH m AS (SELECT id FROM modules WHERE slug = 'fondos-comunes-inversion')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, '¿Qué es un FCI y cómo funciona?',              'que-es-fci',                  20),
  (2, 'FCI Money Market: el efectivo que rinde',       'fci-money-market',            25),
  (3, 'FCI de Renta Fija: bonos accesibles',           'fci-renta-fija',              25),
  (4, 'FCI de Renta Variable: para el largo plazo',   'fci-renta-variable',          30),
  (5, 'Cómo elegir y comparar FCI en Argentina',      'como-elegir-fci',             25)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 5: Bonos y Renta Fija
WITH m AS (SELECT id FROM modules WHERE slug = 'bonos-renta-fija')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Qué es un bono y cómo se negocia',             'que-es-un-bono',              20),
  (2, 'LECAPs y LEDEs: letras del Tesoro',             'lecaps-ledes',                25),
  (3, 'Bonos soberanos en pesos y dólares',            'bonos-soberanos',             30),
  (4, 'Obligaciones Negociables (ON)',                  'obligaciones-negociables',    25),
  (5, 'Duration, TIR y precio: cómo leerlos',         'duration-tir-precio',         35)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 6: Acciones del Merval
WITH m AS (SELECT id FROM modules WHERE slug = 'acciones-merval')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Comprar acciones: conceptos básicos',           'comprar-acciones-basicos',    20),
  (2, 'Análisis fundamental: valuando una empresa',   'analisis-fundamental',        35),
  (3, 'Dividendos: cobrar sin vender',                 'dividendos-cobrar',           25),
  (4, 'Sectores del Merval: energía, bancos, retail',  'sectores-merval',             30),
  (5, 'Errores comunes del inversor principiante',    'errores-comunes-inversor',    25)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 7: CEDEARs y Mercado Global
WITH m AS (SELECT id FROM modules WHERE slug = 'cedears-mercado-global')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Qué son los CEDEARs y cómo funcionan',         'que-son-cedears',             20),
  (2, 'CEDEARs más populares: AAPL, GOOGL, SPY',      'cedears-populares',           25),
  (3, 'Ratio de conversión y tipo de cambio CCL',      'ratio-conversion-ccl',        30),
  (4, 'ETFs globales accesibles desde Argentina',     'etfs-globales-argentina',     25),
  (5, 'Estrategia: carteras con CEDEARs + locales',   'estrategia-cedears-locales',  30)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 8: Dólar Financiero y Cobertura
WITH m AS (SELECT id FROM modules WHERE slug = 'dolar-financiero-cobertura')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Los tipos de dólar en Argentina',              'tipos-de-dolar',              20),
  (2, 'Dólar MEP: comprarlo legalmente desde casa',   'dolar-mep-como-comprar',      30),
  (3, 'CCL y su diferencia con MEP',                  'ccl-diferencia-mep',          25),
  (4, 'Futuros de dólar: cobertura avanzada',         'futuros-dolar',               30),
  (5, 'Estrategias de cobertura cambiaria',           'estrategias-cobertura',       25)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 9: Construcción de Portafolio
WITH m AS (SELECT id FROM modules WHERE slug = 'construccion-portafolio')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, true, '[]'::jsonb
FROM m, (VALUES
  (1, 'Tu perfil de inversor: conservador, moderado, agresivo', 'perfil-inversor',   25),
  (2, 'Diversificación: no pongas todos los huevos en un canasto', 'diversificacion', 25),
  (3, 'Armando una cartera desde $10.000 ARS',        'cartera-desde-10k',           30),
  (4, 'Rebalanceo: mantener tu estrategia',            'rebalanceo-portafolio',       25),
  (5, 'Seguimiento y métricas de tu portafolio',      'seguimiento-metricas',        30)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- MÓDULO 10: Impuestos y Aspecto Legal
WITH m AS (SELECT id FROM modules WHERE slug = 'impuestos-aspecto-legal')
INSERT INTO lessons (module_id, order_index, title, slug, estimated_minutes, is_published, content_json)
SELECT m.id, l.order_index, l.title, l.slug, l.mins, false, '[]'::jsonb
FROM m, (VALUES
  (1, 'Impuesto a las Ganancias sobre inversiones',   'ganancias-inversiones',       25),
  (2, 'Bienes Personales: qué declarar y cómo',       'bienes-personales',           25),
  (3, 'Exenciones: bonos y acciones locales',         'exenciones-bonos-acciones',   20),
  (4, 'CEDEARs y las retenciones internacionales',    'cedears-retenciones',         25),
  (5, 'Declaración jurada: guía práctica',            'declaracion-jurada-guia',     30)
) AS l(order_index, title, slug, mins)
ON CONFLICT (module_id, order_index) DO NOTHING;

-- ============================================================
-- BADGES (logros)
-- ============================================================
INSERT INTO badges (name, description, icon, trigger_type, trigger_value) VALUES
-- Progreso de lecciones
('Primer Paso',          'Completaste tu primera lección en Invertite.',            '🎯', 'lesson_completed', '{"lesson_order": 1}'::jsonb),
('Estudiante Activo',    'Completaste 10 lecciones.',                               '📚', 'lessons_count',    '{"count": 10}'::jsonb),
('Medio Camino',         'Completaste 25 lecciones. ¡Vas por la mitad!',            '🏃', 'lessons_count',    '{"count": 25}'::jsonb),
('Inversor Certificado', 'Completaste los 10 módulos de Invertite.',                '🏆', 'modules_all',      '{}'::jsonb),

-- Módulos completos (uno por cada módulo)
('Experto en Fundamentos',    'Completaste el Módulo 1: Fundamentos del Dinero.',          '💰', 'module_completed', '{"module_order": 1}'::jsonb),
('Conocedor del Sistema',     'Completaste el Módulo 2: Sistema Financiero Argentino.',    '🏦', 'module_completed', '{"module_order": 2}'::jsonb),
('Maestro del Plazo Fijo',    'Completaste el Módulo 3: Plazo Fijo y Depósitos.',          '📆', 'module_completed', '{"module_order": 3}'::jsonb),
('Gurú de los FCI',           'Completaste el Módulo 4: Fondos Comunes de Inversión.',     '📊', 'module_completed', '{"module_order": 4}'::jsonb),
('Lector de Bonos',           'Completaste el Módulo 5: Bonos y Renta Fija.',              '📜', 'module_completed', '{"module_order": 5}'::jsonb),
('Accionista del Merval',     'Completaste el Módulo 6: Acciones del Merval.',             '📈', 'module_completed', '{"module_order": 6}'::jsonb),
('Operador de CEDEARs',       'Completaste el Módulo 7: CEDEARs y Mercado Global.',        '🌎', 'module_completed', '{"module_order": 7}'::jsonb),
('Experto Cambiario',         'Completaste el Módulo 8: Dólar Financiero y Cobertura.',    '💵', 'module_completed', '{"module_order": 8}'::jsonb),
('Arquitecto de Portafolios', 'Completaste el Módulo 9: Construcción de Portafolio.',      '🏗️', 'module_completed', '{"module_order": 9}'::jsonb),
('Experto Fiscal',            'Completaste el Módulo 10: Impuestos y Aspecto Legal.',      '📋', 'module_completed', '{"module_order": 10}'::jsonb),

-- Rachas de estudio
('Racha 7 Días',        '7 días consecutivos estudiando en Invertite.',             '🔥', 'streak_days',      '{"days": 7}'::jsonb),
('Racha 30 Días',       '30 días consecutivos. Sos un inversor disciplinado.',      '💎', 'streak_days',      '{"days": 30}'::jsonb),

-- Quiz
('Perfecto en Quiz',    'Obtuviste 100% en un quiz.',                               '⭐', 'quiz_perfect',     '{}'::jsonb),
('Quiz Master',         'Aprobaste 20 quizzes.',                                    '🧠', 'quiz_count',       '{"count": 20}'::jsonb),

-- Suscripción
('Inversor Premium',    'Te suscribiste a un plan pago de Invertite.',              '👑', 'subscription',     '{"plans": ["monthly","yearly","lifetime"]}'::jsonb),
('Inversor Vitalicio',  'Adquiriste el plan Vitalicio.',                            '♾️', 'subscription',     '{"plans": ["lifetime"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- Fin del seed
SELECT
  (SELECT COUNT(*) FROM plans)   AS planes_insertados,
  (SELECT COUNT(*) FROM modules) AS modulos_insertados,
  (SELECT COUNT(*) FROM lessons) AS lecciones_insertadas,
  (SELECT COUNT(*) FROM badges)  AS badges_insertados;

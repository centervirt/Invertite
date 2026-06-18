-- ============================================================
-- INVERTITE — Migración 003: Contenido de Módulo 1 y Quizzes
-- ============================================================

-- 1. Actualizar el módulo 1 (order_index = 1) para reflejar el nuevo tema y slug
UPDATE modules 
SET title = 'Fundamentos del Sistema Financiero Argentino',
    slug = 'fundamentos-sistema-financiero',
    description = 'Conocé cómo funciona el mercado de capitales, los reguladores CNV y BCRA, y los conceptos clave de inversión.'
WHERE order_index = 1;

-- 2. Actualizar las 5 lecciones del módulo 1 con sus slugs correctos
UPDATE lessons SET order_index = 1, title = 'Cómo funciona el mercado de capitales en Argentina', slug = 'como-funciona-mercado-capitales', estimated_minutes = 30 WHERE module_id = (SELECT id FROM modules WHERE order_index = 1) AND order_index = 1;
UPDATE lessons SET order_index = 2, title = 'Qué es la CNV, el BCRA y las ALyCs', slug = 'cnv-bcra-alycs', estimated_minutes = 25 WHERE module_id = (SELECT id FROM modules WHERE order_index = 1) AND order_index = 2;
UPDATE lessons SET order_index = 3, title = 'Cómo abrir una cuenta comitente', slug = 'como-abrir-cuenta-comitente', estimated_minutes = 35 WHERE module_id = (SELECT id FROM modules WHERE order_index = 1) AND order_index = 3;
UPDATE lessons SET order_index = 4, title = 'Diferencia entre banco, broker y billetera digital', slug = 'banco-broker-billetera-diferencias', estimated_minutes = 25 WHERE module_id = (SELECT id FROM modules WHERE order_index = 1) AND order_index = 4;
UPDATE lessons SET order_index = 5, title = 'Conceptos clave — liquidez, riesgo, rendimiento y plazo', slug = 'conceptos-clave-inversor', estimated_minutes = 30 WHERE module_id = (SELECT id FROM modules WHERE order_index = 1) AND order_index = 5;

-- 3. Limpiar quizzes previos de este módulo para evitar duplicados al re-ejecutar
DELETE FROM quizzes WHERE module_id = (SELECT id FROM modules WHERE order_index = 1);

-- 4. Crear los Quizzes y Preguntas usando un bloque PL/pgSQL
DO $$
DECLARE
  m1_id UUID;
  l1_id UUID;
  l2_id UUID;
  l3_id UUID;
  l4_id UUID;
  l5_id UUID;
  q1_id UUID;
  q2_id UUID;
  q3_id UUID;
  q4_id UUID;
  q5_id UUID;
  qm_id UUID;
BEGIN
  -- Obtener IDs
  SELECT id INTO m1_id FROM modules WHERE slug = 'fundamentos-sistema-financiero';
  SELECT id INTO l1_id FROM lessons WHERE module_id = m1_id AND order_index = 1;
  SELECT id INTO l2_id FROM lessons WHERE module_id = m1_id AND order_index = 2;
  SELECT id INTO l3_id FROM lessons WHERE module_id = m1_id AND order_index = 3;
  SELECT id INTO l4_id FROM lessons WHERE module_id = m1_id AND order_index = 4;
  SELECT id INTO l5_id FROM lessons WHERE module_id = m1_id AND order_index = 5;

  -- Insertar quizzes de lección
  INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score) VALUES (l1_id, m1_id, 'lesson', 70) RETURNING id INTO q1_id;
  INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score) VALUES (l2_id, m1_id, 'lesson', 70) RETURNING id INTO q2_id;
  INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score) VALUES (l3_id, m1_id, 'lesson', 70) RETURNING id INTO q3_id;
  INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score) VALUES (l4_id, m1_id, 'lesson', 70) RETURNING id INTO q4_id;
  INSERT INTO quizzes (lesson_id, module_id, quiz_type, pass_score) VALUES (l5_id, m1_id, 'lesson', 70) RETURNING id INTO q5_id;

  -- Insertar quiz de módulo
  INSERT INTO quizzes (module_id, quiz_type, pass_score) VALUES (m1_id, 'module', 75) RETURNING id INTO qm_id;

  -- ============================================================
  -- LECCIÓN 1.1: content_json
  -- ============================================================
  UPDATE lessons SET content_json = jsonb_build_array(
    jsonb_build_object('type', 'intro', 'text', 'En esta lección vas a entender por qué existe la Bolsa, quiénes participan y cómo tu plata puede trabajar para vos dentro del sistema financiero argentino.'),
    jsonb_build_object('type', 'heading', 'text', '¿Por qué existe el mercado de capitales?'),
    jsonb_build_object('type', 'paragraph', 'text', 'El mercado de capitales es el lugar donde las empresas y el Estado consiguen dinero para crecer, y donde los inversores ponen su plata a trabajar a cambio de un rendimiento. Es muy similar a un mercado de frutas tradicional, pero en vez de frutas, acá se intercambian partes de empresas (acciones) y préstamos de deuda.'),
    jsonb_build_object('type', 'highlight', 'icon', '💡', 'text', 'La Bolsa no es solo para ricos. Hoy cualquier argentino puede invertir desde $1.000 con un celular y una cuenta comitente gratuita.'),
    jsonb_build_object('type', 'heading', 'text', '¿Quiénes participan en el mercado?'),
    jsonb_build_object('type', 'comparison', 'headers', jsonb_build_array('Participante', 'Qué hace', 'Ejemplo'), 'rows', jsonb_build_array(
      jsonb_build_array('Inversor', 'Pone dinero esperando un rendimiento', 'Vos con tus ahorros'),
      jsonb_build_array('Empresa', 'Emite acciones u ONs para conseguir capital', 'YPF, Mercado Libre'),
      jsonb_build_array('Estado', 'Emite bonos para financiarse', 'Bonos del Tesoro argentino'),
      jsonb_build_array('Broker / ALyC', 'Intermediario que ejecuta las órdenes', 'Rava, IOL, Bull Market'),
      jsonb_build_array('CNV', 'Regulador que controla que todo sea legal', 'Como la AFIP pero de la Bolsa'),
      jsonb_build_array('ByMA', 'La Bolsa en sí, donde se cruzan compradores y vendedores', 'El mercado físico/digital')
    )),
    jsonb_build_object('type', 'heading', 'text', 'El flujo de tu dinero paso a paso'),
    jsonb_build_object('type', 'steps', 'items', jsonb_build_array(
      jsonb_build_object('step', 1, 'title', 'Abrís una cuenta comitente', 'text', 'En un broker como Rava o IOL, gratis y en 10 minutos desde tu celular'),
      jsonb_build_object('step', 2, 'title', 'Transferís pesos desde tu banco', 'text', 'El dinero llega a tu cuenta comitente en minutos via CBU'),
      jsonb_build_object('step', 3, 'title', 'Elegís dónde invertir', 'text', 'CEDEARs, ONs, FCIs, acciones — lo que mejor se adapte a tu perfil'),
      jsonb_build_object('step', 4, 'title', 'Comprás el instrumento', 'text', 'El broker ejecuta la orden en ByMA. La operación liquida en 24-48hs'),
      jsonb_build_object('step', 5, 'title', 'Tu plata trabaja', 'text', 'Recibís rendimientos, dividendos o ganancia por diferencia de precio')
    )),
    jsonb_build_object('type', 'chart', 'chartType', 'bar', 'dataKey', 'inflacion_vs_plazo_fijo'),
    jsonb_build_object('type', 'example', 'title', 'El caso de Martina', 'text', 'Martina tiene $200.000 parados en caja de ahorro. Un banco amigo le ofrece plazo fijo al 38% TNA. Con inflación al 55% anual, Martina está perdiendo 17 puntos de poder adquisitivo por año sin saberlo. Con ese mismo dinero en CEDEARs del SPY, sus pesos se ajustarían al tipo de cambio además de capturar la suba del mercado americano.'),
    jsonb_build_object('type', 'tutor_cta', 'prompt', '¿Querés que te ayude a calcular cuánto está perdiendo tu plata en el plazo fijo comparado con otras opciones?'),
    jsonb_build_object('type', 'quiz_inline', 'quizId', q1_id::text),
    jsonb_build_object('type', 'summary', 'items', jsonb_build_array(
      'El mercado de capitales conecta tu ahorro con empresas y el Estado',
      'Los brokers (ALyCs) son los intermediarios regulados por la CNV',
      'Invertir ya no requiere grandes sumas ni conocimiento avanzado',
      'El plazo fijo tradicional suele perder contra la inflación real'
    ))
  ) WHERE id = l1_id;

  -- ============================================================
  -- LECCIÓN 1.2: content_json
  -- ============================================================
  UPDATE lessons SET content_json = jsonb_build_array(
    jsonb_build_object('type', 'intro', 'text', 'Antes de invertir un peso, conviene saber quién cuida tu dinero y quién pone las reglas. En esta lección conocés los tres pilares institucionales que hacen posible el mercado financiero argentino.'),
    jsonb_build_object('type', 'heading', 'text', 'El BCRA — El banco de los bancos'),
    jsonb_build_object('type', 'paragraph', 'text', 'El Banco Central de la República Argentina (BCRA) regula las entidades bancarias tradicionales, controla la emisión de pesos, gestiona las reservas internacionales y define normativas de política monetaria. Es fundamental entender que el BCRA no regula la Bolsa de Comercio de Buenos Aires.'),
    jsonb_build_object('type', 'highlight', 'icon', '⚠️', 'text', 'Error frecuente: el BCRA no regula la Bolsa. Regula los bancos y la política monetaria. Para el mercado de capitales, la autoridad es la CNV.'),
    jsonb_build_object('type', 'heading', 'text', 'La CNV — El árbitro del mercado de capitales'),
    jsonb_build_object('type', 'paragraph', 'text', 'La Comisión Nacional de Valores (CNV) es el organismo estatal que autoriza la oferta pública de valores, fiscaliza a los brokers y protege al inversor minoritario controlando la transparencia y persiguiendo fraudes en el mercado bursátil. Es como la AFIP, pero abocada puramente al orden y cumplimiento bursátil.'),
    jsonb_build_object('type', 'heading', 'text', 'Las ALyCs — Tus intermediarios habilitados'),
    jsonb_build_object('type', 'paragraph', 'text', 'Los Agentes de Liquidación y Compensación (ALyCs) son los brokers de bolsa tradicionales o digitales. No podés operar de forma individual directamente en BYMA; es obligatorio canalizar tu orden a través de un broker habilitado por la CNV. Ejemplos populares son Rava Bursátil, IOL, Bull Market, Balanz, o Cocos Capital.'),
    jsonb_build_object('type', 'comparison', 'headers', jsonb_build_array('Institución', 'Qué regula', 'Qué NO regula'), 'rows', jsonb_build_array(
      jsonb_build_array('BCRA', 'Bancos, emisión de pesos, tasas, reservas, cepo cambiario', 'La Bolsa, los brokers, los CEDEARs'),
      jsonb_build_array('CNV', 'Brokers (ALyCs), acciones, CEDEARs, ONs, FCIs, mercado de capitales', 'Los bancos, el tipo de cambio oficial'),
      jsonb_build_array('ALyC/Broker', 'Ejecuta tus órdenes, custodia tus títulos', 'Nada — es un intermediario, no un regulador'),
      jsonb_build_array('ByMA', 'Opera la Bolsa como plataforma técnica', 'No regula a nadie, es la infraestructura')
    )),
    jsonb_build_object('type', 'highlight', 'icon', '🔒', 'text', '¿Es seguro tener acciones en un broker? Sí. Tus títulos valores están a tu nombre en la CNV y Caja de Valores. Si el broker quiebra, tus acciones siguen siendo tuyas.'),
    jsonb_build_object('type', 'example', 'title', '¿Qué pasa si mi broker quiebra?', 'text', 'Este es el miedo más común de los nuevos inversores. La respuesta corta: tus títulos (acciones, CEDEARs, ONs) están registrados a tu nombre en la Caja de Valores S.A., que es una entidad de custodia independiente al broker. Si Rava o IOL cierran mañana, tus activos siguen siendo tuyos y podés transferirlos a otra ALyC de forma legal. Lo único en riesgo es el saldo líquido que tengas sin invertir en el broker.'),
    jsonb_build_object('type', 'tutor_cta', 'prompt', '¿Tenés dudas sobre cómo se resguarda tu dinero en Caja de Valores cuando tenés activos a tu nombre? Preguntame.'),
    jsonb_build_object('type', 'quiz_inline', 'quizId', q2_id::text),
    jsonb_build_object('type', 'summary', 'items', jsonb_build_array(
      'El BCRA regula bancos y política monetaria, no la Bolsa',
      'La CNV es el regulador del mercado de capitales y protege al inversor',
      'Las ALyCs son brokers habilitados por la CNV para operar en ByMA',
      'Tus títulos valores están custodiados en Caja de Valores, no en el broker',
      'Si el broker quiebra, tus acciones y CEDEARs siguen siendo tuyas'
    ))
  ) WHERE id = l2_id;

  -- ============================================================
  -- LECCIÓN 1.3: content_json
  -- ============================================================
  UPDATE lessons SET content_json = jsonb_build_array(
    jsonb_build_object('type', 'intro', 'text', 'La cuenta comitente es tu puerta de entrada al mercado de capitales. En esta lección vas a aprender qué es, cómo abrirla y cuál broker elegir según tu perfil.'),
    jsonb_build_object('type', 'heading', 'text', '¿Qué es una cuenta comitente?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Es una cuenta especial (similar a tu cuenta bancaria) pero destinada a operar y custodiar títulos valores bursátiles (CEDEARs, ONs, bonos, acciones). Está asociada a tu CUIT/CUIL y registrada en la CNV. Su apertura y mantenimiento es gratuito en casi todos los brokers principales del país.'),
    jsonb_build_object('type', 'highlight', 'icon', '🆓', 'text', 'Abrir una cuenta comitente es 100% gratuito en todos los brokers principales de Argentina. No tiene costo de mantenimiento mensual.'),
    jsonb_build_object('type', 'heading', 'text', 'Comparativa de los principales brokers'),
    jsonb_build_object('type', 'comparison', 'headers', jsonb_build_array('Broker', 'App', 'Comisión compra/venta', 'Diferencial', 'Para quién'), 'rows', jsonb_build_array(
      jsonb_build_array('Rava Bursátil', '⭐⭐⭐⭐', '0.5% - 1%', 'Más veterano, muchos instrumentos', 'Todos los perfiles'),
      jsonb_build_array('IOL (InvertirOnline)', '⭐⭐⭐⭐⭐', '0.5% - 1%', 'La mejor app, más educación', 'Principiantes y avanzados'),
      jsonb_build_array('Bull Market', '⭐⭐⭐⭐', '0.3% - 0.8%', 'Comisiones bajas, buen soporte', 'Inversores activos'),
      jsonb_build_array('Balanz', '⭐⭐⭐', 'Variable', 'Más orientado a grandes inversores', 'Perfiles con más capital'),
      jsonb_build_array('Cocos Capital', '⭐⭐⭐⭐', '0.5%', 'Interfaz moderna, buena UX', 'Jóvenes inversores')
    )),
    jsonb_build_object('type', 'heading', 'text', 'Paso a paso: abrir tu cuenta en IOL'),
    jsonb_build_object('type', 'steps', 'items', jsonb_build_array(
      jsonb_build_object('step', 1, 'title', 'Entrá a invertironline.com', 'text', 'Desde la web o descargá la app en iOS/Android'),
      jsonb_build_object('step', 2, 'title', 'Hacé click en Abrir cuenta', 'text', 'El proceso es 100% online, no necesitás ir a ninguna sucursal'),
      jsonb_build_object('step', 3, 'title', 'Completá tus datos personales', 'text', 'Nombre, CUIT/CUIL, DNI, domicilio y datos de contacto'),
      jsonb_build_object('step', 4, 'title', 'Subí fotos de tu DNI', 'text', 'Frente y dorso. El proceso de validación tarda entre 24 y 48 horas hábiles'),
      jsonb_build_object('step', 5, 'title', 'Declaración de perfil inversor', 'text', 'Te hacen preguntas sobre tu experiencia y tolerancia al riesgo. Respondé con honestidad'),
      jsonb_build_object('step', 6, 'title', '¡Listo! Recibís tu número de comitente', 'text', 'Ya podés transferir pesos y empezar a operar')
    )),
    jsonb_build_object('type', 'highlight', 'icon', '⏱️', 'text', 'El proceso completo tarda entre 10 y 20 minutos en completarse. La validación de identidad puede demorar hasta 48 horas hábiles, pero después podés operar de inmediato.'),
    jsonb_build_object('type', 'heading', 'text', '¿Cómo transferís pesos a tu cuenta?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Una vez activa la cuenta, verás asignado un CBU/CVU exclusivo en el broker. Hacés una transferencia común de pesos desde tu homebanking o billetera virtual. La acreditación toma pocos minutos y ya podés adquirir tus activos. La mayoría permite iniciar con sólo $1.000.'),
    jsonb_build_object('type', 'example', 'title', 'Primera transferencia de Jorge', 'text', 'Jorge abrió su cuenta en IOL el lunes a las 10 AM. A las 10:20 ya tenía su número de comitente. Transfirió $50.000 desde Mercado Pago al CVU de IOL. El dinero apareció en su cuenta en menos de 2 minutos. El miércoles a las 14hs ya había comprado sus primeros CEDEARs del SPY.'),
    jsonb_build_object('type', 'tutor_cta', 'prompt', '¿Tenés dudas sobre qué broker elegir según tu perfil o cuánto dinero tenés para empezar?'),
    jsonb_build_object('type', 'quiz_inline', 'quizId', q3_id::text),
    jsonb_build_object('type', 'summary', 'items', jsonb_build_array(
      'La cuenta comitente es gratuita y se abre 100% online en 10-20 minutos',
      'IOL, Rava y Bull Market son los brokers más recomendados para principiantes',
      'Necesitás DNI, CUIT/CUIL y un banco o billetera para transferir los pesos',
      'Podés empezar a invertir desde $1.000',
      'El dinero transferido llega en minutos vía CVU o CBU'
    ))
  ) WHERE id = l3_id;

  -- ============================================================
  -- LECCIÓN 1.4: content_json
  -- ============================================================
  UPDATE lessons SET content_json = jsonb_build_array(
    jsonb_build_object('type', 'intro', 'text', 'Banco, broker, billetera digital... todos guardan tu plata pero son completamente distintos. Saber la diferencia te ayuda a usar cada uno para lo que fue diseñado.'),
    jsonb_build_object('type', 'heading', 'text', 'Los tres mundos del dinero digital'),
    jsonb_build_object('type', 'comparison', 'headers', jsonb_build_array('Característica', 'Banco', 'Broker (ALyC)', 'Billetera Digital'), 'rows', jsonb_build_array(
      jsonb_build_array('Ejemplo', 'Galicia, Nación, BBVA', 'IOL, Rava, Bull Market', 'Mercado Pago, Ualá, Lemon'),
      jsonb_build_array('Regula', 'BCRA', 'CNV', 'BCRA (como entidades de pago)'),
      jsonb_build_array('Para qué sirve', 'Cuentas, créditos, débito', 'Invertir en Bolsa', 'Pagos, transferencias, cobros'),
      jsonb_build_array('Rendimiento', 'Caja de ahorro: casi 0%', 'Según instrumento elegido', 'Cuenta remunerada ~TNA variable'),
      jsonb_build_array('Garantía depósitos', 'Hasta $6M por Sedesa', 'Títulos en Caja de Valores', 'Sin garantía de depósitos'),
      jsonb_build_array('Inversiones', 'Plazo fijo y FCIs propios', 'Todo el mercado de capitales', 'FCIs propios (ej: Mercado Fondo)'),
      jsonb_build_array('Costo', 'Comisiones y mantenimiento', 'Comisión por operación', 'Gratuita en general')
    )),
    jsonb_build_object('type', 'highlight', 'icon', '🏦', 'text', 'El banco es ideal para el dinero que usás en el día a día. El broker es para tu dinero que trabaja a largo plazo. La billetera es para pagos y movimientos cotidianos.'),
    jsonb_build_object('type', 'heading', 'text', '¿Dónde está más seguro tu dinero?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Los depósitos en bancos tradicionales poseen garantía de Sedesa hasta $6.000.000. Las billeteras virtuales no son bancos, no tienen esa garantía directa de depósito (por eso conviene no dejar sumas líquidas muy grandes estancadas). En los brokers no hay un límite de seguro por Sedesa porque los activos bursátiles no pertenecen a su balance, sino que son de tu propiedad custodiados en Caja de Valores.'),
    jsonb_build_object('type', 'heading', 'text', 'La estrategia de los tres bolsillos'),
    jsonb_build_object('type', 'steps', 'items', jsonb_build_array(
      jsonb_build_object('step', 1, 'title', 'Bolsillo 1 — Gastos del mes (Banco o billetera)', 'text', 'El dinero que sabés que vas a gastar en 30 días. Caja de ahorro o cuenta digital. Sin inversión.'),
      jsonb_build_object('step', 2, 'title', 'Bolsillo 2 — Fondo de emergencia (Caución o FCI money market)', 'text', '3 a 6 meses de gastos. Invertido en algo líquido que podés retirar en 24-48hs.'),
      jsonb_build_object('step', 3, 'title', 'Bolsillo 3 — Ahorro e inversión (Broker)', 'text', 'Todo lo que no necesitás en el corto plazo. CEDEARs, ONs, acciones según tu perfil.')
    )),
    jsonb_build_object('type', 'example', 'title', 'Cómo lo organiza Lucía', 'text', 'Lucía gana $400.000/mes. Su estrategia: $200.000 en banco (Galicia) para gastos del mes. $800.000 en caución 7 días via IOL (fondo de emergencia, rinde 38% TNA y puede sacarlo cuando quiera). $1.500.000 en CEDEARs SPY + ON Pampa (ahorro de largo plazo). Lucía no deja plata parada. Cada peso tiene un trabajo.'),
    jsonb_build_object('type', 'tutor_cta', 'prompt', '¿Querés ayuda para organizar tus tres bolsillos según tus ingresos y gastos actuales?'),
    jsonb_build_object('type', 'quiz_inline', 'quizId', q4_id::text),
    jsonb_build_object('type', 'summary', 'items', jsonb_build_array(
      'El banco es para gastos diarios y créditos, regula el BCRA',
      'El broker es para inversiones en el mercado de capitales, regula la CNV',
      'La billetera digital es para pagos y cobros cotidianos',
      'Tus títulos en el broker están protegidos en Caja de Valores',
      'La estrategia de tres bolsillos optimiza cada peso según su horizonte de tiempo'
    ))
  ) WHERE id = l4_id;

  -- ============================================================
  -- LECCIÓN 1.5: content_json
  -- ============================================================
  UPDATE lessons SET content_json = jsonb_build_array(
    jsonb_build_object('type', 'intro', 'text', 'Estos cuatro conceptos son el idioma básico del inversor. Entenderlos bien te va a permitir comparar cualquier instrumento financiero y tomar decisiones con criterio.'),
    jsonb_build_object('type', 'heading', 'text', '1. Liquidez — ¿Cuándo podés recuperar tu plata?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Es la velocidad con la que un instrumento puede ser convertido de vuelta a pesos líquidos disponibles sin perder valor en el proceso. Las billeteras son instantáneas; los CEDEARs liquidan en 48hs hábiles (T+2); y los bienes inmuebles o plazos fijos tradicionales a 30 días son ilíquidos por inmovilidad obligatoria.'),
    jsonb_build_object('type', 'highlight', 'icon', '💧', 'text', 'Regla de oro: nunca invertir en activos ilíquidos el dinero que podrías necesitar en el corto plazo. La liquidez tiene un precio: a menor liquidez, mayor rendimiento potencial.'),
    jsonb_build_object('type', 'heading', 'text', '2. Riesgo — ¿Qué tan probable es perder?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Es la incertidumbre o probabilidad de pérdida en una inversión. Existe riesgo de mercado (que fluctúe el precio), riesgo de crédito (impago de un bono o ON), riesgo de devaluación y riesgo regulatorio (gobiernos alterando reglas cambiarias). A mayor riesgo, mayor rentabilidad potencial exigida por el inversor.'),
    jsonb_build_object('type', 'heading', 'text', '3. Rendimiento — ¿Cuánto ganás?'),
    jsonb_build_object('type', 'paragraph', 'text', 'Es el beneficio económico generado. Se expresa comúnmente en TNA (Tasa Nominal Anual) o TEA (Tasa Efectiva Anual, que contempla capitalización periódica). Se debe analizar la ganancia real descontada la inflación local.'),
    jsonb_build_object('type', 'heading', 'text', '4. Plazo — ¿Por cuánto tiempo invertís?'),
    jsonb_build_object('type', 'paragraph', 'text', 'El horizonte temporal (corto plazo: menor a 3 meses; mediano plazo: 3 a 24 meses; largo plazo: mayor a 2 años). Define directamente el nivel de volatilidad que podés tolerar y qué tipo de activos te corresponden.'),
    jsonb_build_object('type', 'heading', 'text', 'La relación fundamental: Riesgo vs Rendimiento'),
    jsonb_build_object('type', 'chart', 'chartType', 'bar', 'dataKey', 'riesgo_vs_rendimiento'),
    jsonb_build_object('type', 'comparison', 'headers', jsonb_build_array('Instrumento', 'Liquidez', 'Riesgo', 'Rendimiento esperado', 'Plazo ideal'), 'rows', jsonb_build_array(
      jsonb_build_array('Caución 1-7 días', '🟢 Alta', '🟢 Muy bajo', '~TNA mercado', 'Corto'),
      jsonb_build_array('FCI Money Market', '🟢 Alta', '🟢 Muy bajo', '~TNA mercado', 'Corto'),
      jsonb_build_array('Plazo fijo', '🔴 Baja (inmovilizado)', '🟢 Bajo', 'TNA fija', 'Corto'),
      jsonb_build_array('ON en dólares', '🟡 Media', '🟡 Bajo-medio', '6-10% USD anual', 'Mediano'),
      jsonb_build_array('CEDEAR SPY/QQQ', '🟢 Alta', '🟡 Medio', 'Mercado USA + dólar', 'Mediano-largo'),
      jsonb_build_array('Acción argentina', '🟢 Alta', '🔴 Alto', 'Variable, puede ser muy alto o negativo', 'Largo'),
      jsonb_build_array('Cripto (BTC/ETH)', '🟢 Alta', '🔴 Muy alto', 'Variable extremo', 'Largo con tolerancia')
    )),
    jsonb_build_object('type', 'example', 'title', 'El error de Rodrigo', 'text', 'Rodrigo tenía $500.000 y quería ganar mucho rápido. Invirtió todo en acciones de una empresa junior minera argentina. En 3 meses necesitó la plata para pagar una deuda inesperada. Las acciones habían caído 35% y tuvo que vender con pérdida. El problema no fue el instrumento — fue el plazo. Ese dinero debería haber estado en caución o FCI, no en acciones de alto riesgo con dinero que podía necesitar.'),
    jsonb_build_object('type', 'tutor_cta', 'prompt', 'Contame cuánto dinero querés invertir, en qué plazo lo podrías necesitar y qué nivel de riesgo tolerás. Te ayudo a identificar qué instrumentos van con vos.'),
    jsonb_build_object('type', 'quiz_inline', 'quizId', q5_id::text),
    jsonb_build_object('type', 'summary', 'items', jsonb_build_array(
      'Liquidez: qué tan rápido podés convertir tu inversión en efectivo',
      'Riesgo: la posibilidad de obtener un resultado diferente al esperado',
      'Rendimiento: la ganancia total considerando precio, dividendos y tipo de cambio',
      'Plazo: el horizonte de tiempo define qué instrumentos son apropiados',
      'A mayor riesgo y menor liquidez, mayor rendimiento potencial — no hay atajos',
      'Nunca invertir en activos ilíquidos el dinero que podrías necesitar pronto'
    ))
  ) WHERE id = l5_id;

  -- ============================================================
  -- PREGUNTAS DEL QUIZ 1.1 (5 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (q1_id, 1, '¿Qué organismo regula el mercado de capitales en Argentina?', 
   '["El BCRA", "La CNV", "La AFIP", "El Ministerio de Economía"]', 
   1, 'La CNV (Comisión Nacional de Valores) es el organismo que regula y supervisa el mercado de capitales en Argentina, protegiendo a los inversores y garantizando la transparencia.'),
  (q1_id, 2, '¿Qué es un broker o ALyC?', 
   '["Un banco que guarda tu dinero", "Una empresa que intermedia entre vos y el mercado para ejecutar órdenes", "Un organismo del Estado que regula las inversiones", "Una app para transferir dinero entre amigos"]', 
   1, 'Los ALyCs (Agentes de Liquidación y Compensación) son intermediarios habilitados por la CNV para ejecutar órdenes de compra y venta en el mercado. Rava, IOL y Bull Market son ejemplos.'),
  (q1_id, 3, '¿En qué plazo suelen liquidar las operaciones bursátiles en Argentina?', 
   '["Inmediatamente", "En 24 a 48 horas hábiles", "En una semana", "En 30 días"]', 
   1, 'La mayoría de las operaciones en ByMA liquidan en T+1 o T+2, es decir, 1 o 2 días hábiles después de la operación. Esto significa que el dinero o los títulos tardan ese tiempo en acreditarse.'),
  (q1_id, 4, '¿Qué es ByMA?', 
   '["Un broker digital para invertir desde el celular", "La Bolsa y Mercados Argentinos, donde se cruzan compradores y vendedores", "Un fondo de inversión del Estado argentino", "Una billetera virtual para pagos en pesos"]', 
   1, 'ByMA (Bolsa y Mercados Argentinos) es la principal bolsa de valores de Argentina. Es la plataforma donde se negocian acciones, CEDEARs, bonos y otros instrumentos financieros.'),
  (q1_id, 5, 'Si la inflación anual es 55% y tu plazo fijo rinde 38% TNA, ¿qué está pasando con tu poder adquisitivo?', 
   '["Está creciendo porque tenés más pesos", "Se mantiene igual porque al menos estás ganando algo", "Está disminuyendo porque perdés 17 puntos contra la inflación", "No se puede saber sin más información"]', 
   2, 'Aunque tu saldo en pesos crece, lo que importa es el poder adquisitivo real. Si la inflación supera tu rendimiento, podés comprar menos cosas con ese dinero aunque el número sea mayor. En este caso perdés 17 puntos (55% - 38%) de poder adquisitivo por año.');

  -- ============================================================
  -- PREGUNTAS DEL QUIZ 1.2 (5 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (q2_id, 1, '¿Cuál de estas funciones corresponde al BCRA?', 
   '["Autorizar la emisión de acciones de empresas", "Regular y supervisar a los brokers bursátiles", "Fijar la tasa de política monetaria y regular los bancos", "Controlar el funcionamiento de la Bolsa de Buenos Aires"]', 
   2, 'El BCRA fija la tasa de política monetaria, regula a los bancos comerciales y controla las reservas internacionales. La Bolsa y los brokers son competencia de la CNV.'),
  (q2_id, 2, 'Si tu broker (ALyC) quiebra, ¿qué pasa con tus acciones y CEDEARs?', 
   '["Los perdés porque estaban bajo custodia del broker", "Siguen siendo tuyas, están registradas en Caja de Valores a tu nombre", "El Estado te los devuelve después de un proceso legal largo", "Depende del contrato que hayas firmado con el broker"]', 
   1, 'Tus títulos valores están registrados en la Caja de Valores S.A. a tu nombre, no en el balance del broker. Por eso, si el broker quiebra, tus activos están protegidos y podés transferirlos a otro broker.'),
  (q2_id, 3, '¿Podés operar en ByMA (la Bolsa) directamente sin un broker?', 
   '["Sí, desde la app de ByMA cualquier persona puede operar", "No, necesitás operar a través de una ALyC habilitada por la CNV", "Sí, pero solo si tenés más de $1.000.000 para invertir", "No, primero necesitás aprobar un examen de la CNV"]', 
   1, 'Los inversores individuales no pueden operar directamente en ByMA. Necesitás hacerlo a través de una ALyC (broker) habilitada y supervisada por la CNV.'),
  (q2_id, 4, '¿Qué significa ALyC?', 
   '["Asociación Latinoamericana de Capitales", "Agente de Liquidación y Compensación", "Autoridad Legal y de Control", "Agencia de Licencias y Comercio"]', 
   1, 'ALyC significa Agente de Liquidación y Compensación. Son las entidades habilitadas por la CNV para actuar como intermediarios en el mercado de capitales argentino.'),
  (q2_id, 5, '¿Cuál es la diferencia principal entre el BCRA y la CNV?', 
   '["El BCRA es nacional y la CNV es provincial", "El BCRA regula bancos y política monetaria; la CNV regula el mercado de capitales", "El BCRA protege al inversor; la CNV protege al depositante bancario", "No hay diferencia, ambos regulan el sistema financiero en conjunto"]', 
   1, 'Son dos reguladores con ámbitos distintos. El BCRA se ocupa del sistema bancario y la política monetaria. La CNV se ocupa del mercado de capitales: brokers, acciones, CEDEARs, ONs y fondos de inversión.');

  -- ============================================================
  -- PREGUNTAS DEL QUIZ 1.3 (5 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (q3_id, 1, '¿Qué cuesta abrir una cuenta comitente en Argentina?', 
   '["$5.000 de costo inicial", "$500 por mes de mantenimiento", "Es completamente gratuita", "Depende del broker, algunos cobran hasta $2.000"]', 
   2, 'Abrir una cuenta comitente es gratuito en todos los brokers principales de Argentina (IOL, Rava, Bull Market, etc.). No hay costo de apertura ni mantenimiento mensual.'),
  (q3_id, 2, '¿Qué necesitás para abrir una cuenta comitente?', 
   '["Ir personalmente a una sucursal con DNI original y tres recibos de sueldo", "DNI, CUIT o CUIL y conexión a internet — el proceso es 100% online", "Tener al menos $100.000 para depositar como capital mínimo", "Una carta de recomendación de tu banco actual"]', 
   1, 'El proceso es completamente online. Solo necesitás tu DNI (para sacarle fotos), tu CUIT o CUIL y completar el formulario digital. No hay capital mínimo obligatorio en la mayoría de los brokers.'),
  (q3_id, 3, '¿Cómo transferís pesos a tu cuenta comitente?', 
   '["Solo podés depositar en efectivo en las sucursales del broker", "Transferís desde tu banco o billetera al CBU o CVU del broker como cualquier transferencia", "Necesitás un cheque certificado a nombre del broker", "Solo podés cargar dinero con tarjeta de crédito desde la app"]', 
   1, 'Cada broker tiene un CBU o CVU donde podés transferir pesos desde tu banco o billetera digital (Mercado Pago, Ualá, etc.) como cualquier transferencia común. El dinero llega en minutos a horas según el método.'),
  (q3_id, 4, '¿Con cuánto dinero podés empezar a invertir en la Bolsa?', 
   '["Mínimo $500.000", "Mínimo $50.000", "Mínimo $10.000", "Desde $1.000 o incluso menos en algunos brokers"]', 
   3, 'No hay un mínimo obligatorio para empezar. En la mayoría de los brokers podés invertir desde $1.000 o incluso menos. La Bolsa ya no es exclusiva para grandes capitales.'),
  (q3_id, 5, '¿Cuánto tiempo tarda en abrirse una cuenta comitente?', 
   '["Entre 2 y 4 semanas hábiles", "Exactamente 7 días corridos por regulación de la CNV", "El formulario tarda 10-20 minutos y la validación de identidad hasta 48hs hábiles", "Un mes, porque el broker debe verificarte ante la CNV"]', 
   2, 'El formulario de apertura se completa en 10 a 20 minutos online. La validación de identidad (revisión del DNI) puede tardar hasta 48 horas hábiles. Después ya podés operar.');

  -- ============================================================
  -- PREGUNTAS DEL QUIZ 1.4 (5 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (q4_id, 1, '¿Cuál es la principal diferencia entre un banco y un broker?', 
   '["El banco es más seguro porque está regulado por el Estado", "El banco sirve para créditos y gastos diarios; el broker para invertir en el mercado de capitales", "El broker te da mejores tasas de interés que el banco siempre", "No hay diferencia real, ambos ofrecen los mismos servicios"]', 
   1, 'El banco está diseñado para guardar dinero, otorgar créditos y facilitar pagos cotidianos. El broker (ALyC) está diseñado específicamente para invertir en el mercado de capitales: acciones, CEDEARs, ONs, etc.'),
  (q4_id, 2, '¿Hasta qué monto garantiza el sistema bancario argentino tus depósitos?', 
   '["Hasta $1.000.000", "Hasta $6.000.000 por Sedesa", "Sin límite, el Estado garantiza todo", "No hay garantía de depósitos en Argentina"]', 
   1, 'El Seguro de Depósitos (Sedesa) garantiza los depósitos bancarios hasta $6.000.000 por persona por entidad. Esto aplica a bancos, no a brokers ni billeteras digitales.'),
  (q4_id, 3, '¿El dinero en Mercado Pago tiene garantía de depósitos?', 
   '["Sí, hasta $6.000.000 igual que un banco", "Sí, pero solo hasta $1.000.000", "No, las billeteras digitales no son bancos y no tienen esa garantía", "Depende de si tenés cuenta bancaria vinculada"]', 
   2, 'Las billeteras digitales como Mercado Pago, Ualá o Lemon no son bancos. El dinero parado en ellas no tiene garantía de depósitos de Sedesa. Por eso conviene no dejar grandes sumas sin invertir en una billetera.'),
  (q4_id, 4, 'En la estrategia de tres bolsillos, ¿dónde va el fondo de emergencia?', 
   '["En la caja de ahorro del banco para tenerlo siempre disponible", "En CEDEARs del SPY porque rinden más a largo plazo", "En caución o FCI money market — líquido y con rendimiento", "En dólares físicos debajo del colchón"]', 
   2, 'El fondo de emergencia debe estar en algo líquido (que podés retirar en 24-48hs) pero que también rinda. La caución bursátil o un FCI money market son ideales: rendís ~TNA de mercado y podés acceder rápido si lo necesitás.'),
  (q4_id, 5, '¿Cuál de estas opciones describe mejor el uso correcto de una billetera digital?', 
   '["Guardar todos tus ahorros ahí porque tiene cuenta remunerada", "Pagos cotidianos, cobros y transferencias rápidas — no para ahorrar grandes sumas", "Invertir en CEDEARs y ONs desde la app", "Reemplazar completamente al banco para todo"]', 
   1, 'Las billeteras digitales son excelentes para pagos, cobros y movimientos del día a día. No son el lugar ideal para grandes ahorros ya que no tienen garantía de depósitos y sus rendimientos suelen ser inferiores a otras alternativas.');

  -- ============================================================
  -- PREGUNTAS DEL QUIZ 1.5 (5 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (q5_id, 1, '¿Qué significa que un activo tiene alta liquidez?', 
   '["Que rinde mucho porque es muy demandado", "Que podés convertirlo en efectivo rápidamente sin perder valor", "Que está respaldado por el gobierno argentino", "Que tiene bajo riesgo de pérdida de capital"]', 
   1, 'Liquidez es la facilidad y velocidad con la que podés convertir un activo en efectivo. Alta liquidez significa que podés vender rápido sin sacrificar precio. Los CEDEARs y la caución son ejemplos de activos líquidos.'),
  (q5_id, 2, '¿Cuál de estos instrumentos tiene MENOR liquidez?', 
   '["Caución bursátil a 1 día", "FCI money market", "CEDEAR del SPY", "Plazo fijo a 30 días"]', 
   3, 'El plazo fijo tradicional inmoviliza tu dinero por el plazo contratado (30, 60, 90 días). Si necesitás el dinero antes, o no podés rescatarlo o perdés intereses. Los otros tres instrumentos tienen mayor liquidez.'),
  (q5_id, 3, '¿Qué es la TNA?', 
   '["Tasa Neta Argentina — la tasa después de impuestos", "Tasa Nominal Anual — la tasa base sin capitalización de intereses", "Tasa Nacional de Ahorro — el promedio de tasas de los bancos", "Tasa Neta Ajustada — la tasa ajustada por inflación"]', 
   1, 'TNA significa Tasa Nominal Anual. Es la tasa base que se usa para comparar instrumentos. No incluye la capitalización de intereses. La TEA (Tasa Efectiva Anual) sí incluye la capitalización y suele ser más alta que la TNA.'),
  (q5_id, 4, 'Tenés $200.000 que sabés que vas a necesitar en 2 meses para pagar una cuota. ¿Dónde los invertís?', 
   '["En acciones de YPF porque están baratas y pueden subir mucho", "En CEDEARs del SPY para aprovechar el dólar", "En caución bursátil a 7 días o FCI money market — líquido y seguro", "En una ON a 2 años para maximizar el rendimiento"]', 
   2, 'Si sabés que vas a necesitar esa plata en 2 meses, necesitás liquidez y bajo riesgo. La caución o un FCI money market te dan rendimiento diario y podés retirar en 24-48hs. Acciones y CEDEARs pueden caer 20% en ese plazo.'),
  (q5_id, 5, '¿Por qué el riesgo no es necesariamente algo malo en inversiones?', 
   '["Que los activos de alto riesgo siempre rinden más", "Porque el riesgo es la fuente del rendimiento — sin riesgo no hay retorno significativo", "Porque en Argentina todos los activos tienen riesgo igual", "Porque el gobierno garantiza las pérdidas por riesgo de mercado"]', 
   1, 'El riesgo y el rendimiento son dos caras de la misma moneda. Los activos más riesgosos ofrecen mayor rendimiento potencial como compensación por ese riesgo. El objetivo del inversor no es evitar el riesgo sino gestionarlo según su perfil y horizonte.');

  -- ============================================================
  -- PREGUNTAS DEL QUIZ DE MÓDULO 1 (15 preguntas)
  -- ============================================================
  INSERT INTO quiz_questions (quiz_id, order_index, question_text, options, correct_option, explanation) VALUES
  (qm_id, 1, 'Ana tiene $300.000 que no va a necesitar por 2 años mínimo y busca resguardo contra la devaluación. ¿Cuál de estas estrategias es más adecuada para su perfil?', 
   '["Dejarlo en Mercado Pago rindiendo tasa de cuenta remunerada", "Comprar CEDEARs diversificados o una Obligación Negociable en dólares", "Colocar un plazo fijo tradicional renovable cada 30 días", "Adquirir acciones altamente especulativas del Merval"]', 
   1, 'Con un horizonte de 2 años, Ana puede asumir volatilidad de mediano plazo e invertir en CEDEARs o renta fija corporativa en dólares para protegerse de la devaluación e inflación.'),
  
  (qm_id, 2, '¿Qué pasa con los CEDEARs de Martín si su broker (ALyC) cierra de forma imprevista?', 
   '["Pierde su inversión ya que el broker era dueño legal de los títulos", "Martín puede transferirlos a otra ALyC porque están resguardados a su nombre en Caja de Valores", "El Estado le reintegra los pesos convertidos al tipo de cambio oficial", "Caja de Valores vende los activos al instante y le liquida en su banco"]', 
   1, 'Los CEDEARs y títulos valores están custodiados a nombre de cada inversor en Caja de Valores S.A., un ente independiente. La quiebra del intermediario (broker) no afecta la propiedad de tus activos.'),
  
  (qm_id, 3, '¿Qué diferencia hay entre invertir en el FCI de un banco y comprar un CEDEAR a través de un broker?', 
   '["El banco no cobra comisiones; el broker sí", "El FCI del banco diversifica; el CEDEAR es un activo individual que cotiza en ByMA y depende de la evolución de una firma extranjera específica", "El banco requiere CUIT para operar; el broker solo pide DNI", "No existe diferencia, ambos cotizan de la misma manera en ByMA"]', 
   1, 'El FCI es una cartera administrada de múltiples activos, mientras que el CEDEAR es un instrumento particular (representativo de una acción del exterior) que cotiza libremente y requiere análisis de la empresa emisora.'),

  (qm_id, 4, '¿Quién autoriza y controla a las empresas argentinas que desean emitir Obligaciones Negociables en el mercado?', 
   '["El Banco Central (BCRA)", "La Comisión Nacional de Valores (CNV)", "La AFIP", "La Caja de Valores"]', 
   1, 'La CNV es la autoridad regulatoria que autoriza la oferta pública y supervisa los requisitos legales y contables de las firmas emisoras.'),

  (qm_id, 5, '¿Qué tasa bancaria es el indicador que debés mirar para estimar la ganancia anual total capitalizando los intereses mensuales?', 
   '["La Tasa Nominal Anual (TNA)", "La Tasa Efectiva Anual (TEA)", "La Tasa Nominal de Descuento", "El Costo Financiero Total"]', 
   1, 'La TEA representa el rendimiento real de tu dinero al cabo de un año si reinvertís mensualmente los intereses cobrados a la tasa TNA nominal.'),

  (qm_id, 6, 'Si el dólar MEP sube y las acciones de Apple en EE.UU. se mantienen estables, ¿qué ocurre con el precio en pesos del CEDEAR de Apple?', 
   '["Baja en pesos porque el tipo de cambio es más alto", "Sube en pesos en la misma proporción que el dólar MEP", "Se mantiene exactamente igual", "Se suspende la cotización temporalmente en ByMA"]', 
   1, 'El valor en pesos de un CEDEAR depende tanto del precio del activo subyacente en el exterior como de la variación del tipo de cambio financiero (MEP/CCL). Si el dólar sube, el CEDEAR sube en pesos.'),

  (qm_id, 7, '¿Qué significa que una operación en la bolsa argentina liquida en Plazo de 24 horas?', 
   '["Que podés comprar el activo y venderlo en 24 horas", "Que el traspaso del dinero y la acreditación de los títulos se concreta al día hábil siguiente a la operación", "Que el broker te cobra la comisión al día siguiente", "Que la operación puede anularse durante las siguientes 24 horas"]', 
   1, 'El plazo de liquidación (T+1 o 24hs) define la fecha efectiva en la cual se debitan los fondos de la cuenta compradora y se acreditan en la vendedora.'),

  (qm_id, 8, '¿Qué función cumple la Caja de Valores S.A.?', 
   '["Prestar pesos a los brokers para operar", "Servir de depositaria central, custodiando los títulos a nombre de cada inversor", "Regular el tipo de cambio MEP", "Cobrar el impuesto a las transferencias financieras"]', 
   1, 'Es el organismo encargado de custodiar y llevar el registro de todas las acciones, bonos y títulos del mercado de capitales argentino.'),

  (qm_id, 9, 'En la estrategia de los tres bolsillos, ¿qué porcentaje de tus ingresos mensuales debés destinar a inversiones de riesgo?', 
   '["El 100% de lo que ganes", "Únicamente el sobrante una vez cubiertos los gastos del mes y el fondo de emergencia", "El total del fondo de emergencia", "La mitad de tus deudas"]', 
   1, 'La porción destinada al bolsillo de inversión o riesgo solo debe ser dinero que no se necesite para gastos inmediatos ni emergencias.'),

  (qm_id, 10, '¿Qué ocurre si colocás un plazo fijo tradicional y necesitás la plata a los 10 días?', 
   '["Podés retirarla pagando una multa al banco", "No podés retirarla; debés esperar obligatoriamente a que termine el plazo de 30 días", "El broker te adelanta el dinero en forma de caución", "La Caja de Valores te reintegra el capital de inmediato"]', 
   1, 'El plazo fijo tradicional inmoviliza los fondos. No se puede rescatar de forma anticipada antes de la fecha de vencimiento.'),

  (qm_id, 11, '¿Cuál es la relación entre la liquidez y el rendimiento esperado en instrumentos conservadores?', 
   '["A mayor liquidez, el rendimiento suele ser menor", "A mayor liquidez, el rendimiento es extremadamente alto", "La liquidez no afecta el rendimiento en pesos", "A menor liquidez, el riesgo siempre es menor"]', 
   0, 'El mercado premia la inmovilización del dinero (menor liquidez) otorgando mayor tasa. Los activos de liquidez inmediata (como cuentas remuneradas) pagan las tasas más bajas.'),

  (qm_id, 12, '¿Qué beneficio ofrece una caución tomadora bursátil para una empresa?', 
   '["Conseguir financiamiento a muy corto plazo entregando títulos como garantía", "Comprar acciones sin pagar comisión", "Evitar las auditorías de la CNV", "Eximirse del pago de IVA"]', 
   0, 'La caución tomadora permite a una firma obtener pesos líquidos respaldando su préstamo con títulos valores en garantía.'),

  (qm_id, 13, '¿Por qué las Obligaciones Negociables (ON) son instrumentos de renta fija?', 
   '["Porque su precio en la bolsa nunca varía", "Porque el inversor conoce de antemano el cronograma de pagos e intereses (cupones)", "Porque están garantizadas por el Banco Central", "Porque pagan intereses fijos en pesos sin importar el dólar"]', 
   1, 'La renta fija implica que las condiciones de emisión, tasas y fechas de amortización están estipuladas y son conocidas antes de comprar el título.'),

  (qm_id, 14, '¿Qué peligro corrés si invertís tu fondo de emergencia en acciones del Merval?', 
   '["Que la CNV te suspenda la cuenta comitente", "Que ante una emergencia tengas que vender las acciones en un momento de caída del mercado, perdiendo capital", "Ninguno, las acciones siempre suben a corto plazo", "Que el banco te cobre impuesto a los débitos"]', 
   1, 'El fondo de emergencia requiere disponibilidad y estabilidad. Las acciones son volátiles y una caída forzada te obligaría a realizar pérdidas reales.'),

  (qm_id, 15, '¿Qué es el spread cambiario en la bolsa?', 
   '["La diferencia entre la cotización del dólar oficial y el dólar blue", "La diferencia entre la mejor oferta de compra y la mejor de venta de un activo", "El impuesto de la CNV por cambiar monedas", "La comisión fija del broker por retirar dólares"]', 
   1, 'El spread es la diferencia de precios entre compra y venta. A menor liquidez del activo, mayor suele ser este spread bursátil.');

END $$;

-- 5. Actualizar las descripciones de los logros/badges del módulo
UPDATE badges SET description = 'Completaste el Módulo 1: Fundamentos del Sistema Financiero Argentino.' WHERE name = 'Experto en Fundamentos';

-- 6. Marcar el módulo y sus lecciones como publicados
UPDATE modules SET is_published = true WHERE slug = 'fundamentos-sistema-financiero';
UPDATE lessons SET is_published = true WHERE module_id = (SELECT id FROM modules WHERE slug = 'fundamentos-sistema-financiero');

/**
 * INVERTITE — Modelo de Usuario
 * Todas las queries SQL relacionadas con la tabla `users`
 */
const { query, queryOne } = require('../config/database');

const UserModel = {

  // ── Crear usuario ──────────────────────────────────────────
  async create({ email, passwordHash, fullName }) {
    return queryOne(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, role, is_active, email_verified, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    );
  },

  // ── Buscar por email ───────────────────────────────────────
  async findByEmail(email) {
    return queryOne(
      `SELECT id, email, password_hash, full_name, avatar_url,
              role, is_active, email_verified, created_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
  },

  // ── Buscar por ID ──────────────────────────────────────────
  async findById(id) {
    return queryOne(
      `SELECT id, email, full_name, avatar_url, role,
              is_active, email_verified, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
  },

  // ── Buscar por ID con suscripción activa ───────────────────
  async findByIdWithSubscription(id) {
    return queryOne(
      `SELECT
         u.id, u.email, u.full_name, u.avatar_url, u.role,
         u.is_active, u.email_verified, u.created_at,
         s.id          AS sub_id,
         s.status      AS sub_status,
         s.current_period_end AS sub_expires_at,
         p.name        AS plan_name,
         p.slug        AS plan_slug
       FROM users u
       LEFT JOIN subscriptions s
         ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN plans p
         ON p.id = s.plan_id
       WHERE u.id = $1`,
      [id]
    );
  },

  // ── Actualizar perfil ──────────────────────────────────────
  async updateProfile(id, { fullName, avatarUrl }) {
    return queryOne(
      `UPDATE users
       SET full_name  = COALESCE($2, full_name),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, full_name, avatar_url, role, updated_at`,
      [id, fullName || null, avatarUrl || null]
    );
  },

  // ── Estadísticas de progreso del usuario ──────────────────
  async getDashboardStats(userId) {
    const [progress, badges, streak] = await Promise.all([

      // Progreso de lecciones
      queryOne(
        `SELECT
           COUNT(*) FILTER (WHERE up.status = 'completed') AS lessons_completed,
           COUNT(l.id)                                      AS lessons_total,
           ROUND(
             COUNT(*) FILTER (WHERE up.status = 'completed')::numeric
             / NULLIF(COUNT(l.id), 0) * 100
           , 1)                                             AS progress_pct,
           MAX(up.completed_at)                             AS last_activity
         FROM lessons l
         LEFT JOIN user_progress up
           ON up.lesson_id = l.id AND up.user_id = $1
         WHERE l.is_published = true`,
        [userId]
      ),

      // Badges obtenidos
      queryOne(
        `SELECT COUNT(*) AS badges_count
         FROM user_badges
         WHERE user_id = $1`,
        [userId]
      ),

      // Última lección en progreso o completada
      queryOne(
        `SELECT
           l.id, l.title, l.slug,
           m.title AS module_title,
           m.slug  AS module_slug,
           up.status,
           up.completed_at
         FROM user_progress up
         JOIN lessons l  ON l.id  = up.lesson_id
         JOIN modules m  ON m.id  = l.module_id
         WHERE up.user_id = $1
         ORDER BY COALESCE(up.completed_at, up.started_at) DESC
         LIMIT 1`,
        [userId]
      ),
    ]);

    // Módulos completados
    const modulesCompleted = await queryOne(
      `SELECT COUNT(DISTINCT l.module_id) AS modules_completed
       FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       WHERE up.user_id = $1 AND up.status = 'completed'`,
      [userId]
    );

    // Próxima lección recomendada (primera no completada en orden)
    const nextLesson = await queryOne(
      `SELECT
         l.id, l.title, l.slug,
         l.estimated_minutes,
         m.title       AS module_title,
         m.slug        AS module_slug,
         m.order_index AS module_order,
         l.order_index AS lesson_order
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       LEFT JOIN user_progress up
         ON up.lesson_id = l.id AND up.user_id = $1
       WHERE l.is_published = true
         AND m.is_published = true
         AND (up.status IS NULL OR up.status != 'completed')
       ORDER BY m.order_index ASC, l.order_index ASC
       LIMIT 1`,
      [userId]
    );

    return {
      progress: {
        lessonsCompleted: parseInt(progress?.lessons_completed || 0),
        lessonsTotal:     parseInt(progress?.lessons_total || 0),
        progressPct:      parseFloat(progress?.progress_pct || 0),
        modulesCompleted: parseInt(modulesCompleted?.modules_completed || 0),
        modulesTotal:     10,
      },
      badges:         { count: parseInt(badges?.badges_count || 0) },
      lastActivity:   progress?.last_activity || null,
      lastLesson:     streak || null,
      nextLesson:     nextLesson || null,
    };
  },
};

module.exports = UserModel;

-- ============================================================
-- INVERTITE — Migración 001: Schema inicial
-- Ejecutar como superusuario de PostgreSQL
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  avatar_url      TEXT,
  role            VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_active       BOOLEAN DEFAULT true,
  email_verified  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ============================================================
-- TABLA: plans
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) UNIQUE NOT NULL,
  price_ars   DECIMAL(12,2) NOT NULL,
  interval    VARCHAR(20) CHECK (interval IN ('monthly', 'yearly', 'lifetime')),
  features    JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id                   UUID REFERENCES plans(id),
  status                    VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','active','cancelled','expired','failed')),
  payment_provider          VARCHAR(30) CHECK (payment_provider IN ('mercadopago','uala','manual')),
  provider_subscription_id  VARCHAR(255),
  provider_payment_id       VARCHAR(255),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

-- ============================================================
-- TABLA: modules
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index     INTEGER UNIQUE NOT NULL,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  description     TEXT,
  color_accent    VARCHAR(20) DEFAULT 'teal',
  estimated_hours DECIMAL(4,1),
  is_published    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id           UUID REFERENCES modules(id) ON DELETE CASCADE,
  order_index         INTEGER NOT NULL,
  title               VARCHAR(255) NOT NULL,
  slug                VARCHAR(100) NOT NULL,
  content_json        JSONB NOT NULL DEFAULT '[]',
  estimated_minutes   INTEGER DEFAULT 30,
  is_published        BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_slug      ON lessons(slug);

-- ============================================================
-- TABLA: quizzes
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE,
  module_id   UUID REFERENCES modules(id) ON DELETE CASCADE,
  quiz_type   VARCHAR(20) DEFAULT 'lesson' CHECK (quiz_type IN ('lesson','module')),
  pass_score  INTEGER DEFAULT 70,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: quiz_questions
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL,
  question_text   TEXT NOT NULL,
  options         JSONB NOT NULL,
  correct_option  INTEGER NOT NULL,
  explanation     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- ============================================================
-- TABLA: user_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id           UUID REFERENCES lessons(id) ON DELETE CASCADE,
  status              VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  time_spent_seconds  INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id   ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status    ON user_progress(status);

-- ============================================================
-- TABLA: quiz_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id         UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  passed          BOOLEAN NOT NULL,
  answers         JSONB NOT NULL,
  attempt_number  INTEGER DEFAULT 1,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- ============================================================
-- TABLA: badges
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  icon            VARCHAR(10),
  trigger_type    VARCHAR(50),
  trigger_value   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: user_badges
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID REFERENCES badges(id),
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- ============================================================
-- TABLA: tutor_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS tutor_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES lessons(id),
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_user_id ON tutor_conversations(user_id);

-- ============================================================
-- TABLA: payment_events
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    VARCHAR(30) NOT NULL,
  event_type  VARCHAR(100) NOT NULL,
  payload     JSONB NOT NULL,
  processed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON payment_events(processed);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider  ON payment_events(provider);

-- ============================================================
-- FUNCIÓN: updated_at automático via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','subscriptions','modules','lessons','tutor_conversations']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_updated_at ON %I;
       CREATE TRIGGER trigger_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TABLA: schema_migrations (control de versiones internas)
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fin de migración 001
SELECT 'Migración 001_schema_inicial.sql ejecutada correctamente' AS resultado;

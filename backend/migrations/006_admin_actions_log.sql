-- INVERTITE — Creación de tabla para auditoría de acciones administrativas

CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  -- 'subscription_activated', 'subscription_cancelled', 
  -- 'user_deactivated', 'user_deleted', 'subscription_extended'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

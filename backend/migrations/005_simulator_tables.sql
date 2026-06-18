-- ── MIGRACION SIMULADOR DE CARTERA VIRTUAL ──────────────────

CREATE TABLE IF NOT EXISTS paper_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  initial_capital DECIMAL(18,2) DEFAULT 1000000.00,
  cash_balance DECIMAL(18,2) DEFAULT 1000000.00,
  total_value DECIMAL(18,2) DEFAULT 1000000.00,
  total_return_pct DECIMAL(8,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  reset_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE,
  instrument_type VARCHAR(30) NOT NULL CHECK (instrument_type IN (
    'cedear','accion','on','fci','caucion','crypto','otro'
  )),
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(18,6) NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ARS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, ticker)
);

CREATE TABLE IF NOT EXISTS paper_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  instrument_type VARCHAR(30) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(18,6) NOT NULL,
  price DECIMAL(18,2) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  cash_before DECIMAL(18,2) NOT NULL,
  cash_after DECIMAL(18,2) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value DECIMAL(18,2) NOT NULL,
  cash_balance DECIMAL(18,2) NOT NULL,
  total_return_pct DECIMAL(8,4) NOT NULL,
  positions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES paper_portfolios(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  rank_position INTEGER NOT NULL,
  total_return_pct DECIMAL(8,4) NOT NULL,
  total_value DECIMAL(18,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, period, period_key)
);

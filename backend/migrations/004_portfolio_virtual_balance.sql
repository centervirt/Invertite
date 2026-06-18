-- ============================================================
-- INVERTITE — Migración 004: Saldo virtual en portafolio
-- ============================================================

ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS virtual_balance_ars DECIMAL(15,2) DEFAULT 1000000.00;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS virtual_balance_usd DECIMAL(15,2) DEFAULT 1000.00;

SELECT 'Migración 004_portfolio_virtual_balance.sql ejecutada correctamente' AS resultado;

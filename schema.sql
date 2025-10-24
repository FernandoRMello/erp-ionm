-- ==========================
-- SCHEMA PRINCIPAL (D1)
-- ==========================

PRAGMA foreign_keys = ON;

-- Empresas (clientes)
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cnpj TEXT UNIQUE,
  name TEXT NOT NULL, -- Razão Social (do form)
  trading_name TEXT,  -- Nome Fantasia (do form)
  address JSON,         -- Endereço (do form, convertido para JSON)
  contract_starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  contract_expires_at DATETIME, -- 30 dias trial por default
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usuários (multi-empresa via company_id)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username TEXT NOT NULL,     -- Mapeado de login_user@empresa (do form)
  email TEXT,               -- Email (do form)
  password_hash TEXT NOT NULL, -- SHA256 da senha (do form)
  role TEXT NOT NULL,       -- Mapeado de user_type (ex: 'ADMINISTRADOR', 'GERENTE')
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, username)
);

-- Lojas / Locations (multi-loja por company)
-- Criada automaticamente 1 'default' em /api/create-company
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- ex: loja-001
  name TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  address JSON,
  active INTEGER DEFAULT 1,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, code)
);

-- Módulos cadastrados no sistema (tipos de módulos disponíveis)
CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL, -- ex: 'pdv', 'estoque', 'financeiro' (gerado do nome)
  name TEXT NOT NULL,       -- Mapeado de module_name (do form)
  description TEXT,         -- Mapeado de description (do form)
  default_price_cents INTEGER DEFAULT 0, -- Mapeado de monthly_cost_brl (do form)
  allowed_roles JSON,       -- Mapeado de allowed_user_types (do form)
  applicable_branches JSON, -- Mapeado de applicable_business_branches (do form)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assinatura / módulos habilitados por empresa
CREATE TABLE IF NOT EXISTS company_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL, -- Chave do módulo (ex: 'pdv')
  activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  config JSON,
  UNIQUE(company_id, module_key)
);

-- Assinaturas / cobrança por empresa (faturamento)
-- Criada automaticamente 1 'trial' em /api/create-company
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL DEFAULT 'trial', -- ex: 'trial','basic','pro'
  monthly_cents INTEGER NOT NULL DEFAULT 0,
  user_limit INTEGER NOT NULL DEFAULT 10,
  active INTEGER DEFAULT 1,
  billing_day INTEGER, -- Mapeado de billing_day (do form)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, plan_key)
);

-- Auditoria genérica
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  details JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produtos e variantes globais
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, sku)
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  attributes JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, sku)
);

-- Inventário global por location
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_id, variant_id)
);

-- Transações (venda) central
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  external_id TEXT,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL, -- pending/completed/failed
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

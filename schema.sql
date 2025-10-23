-- Apaga as tabelas existentes (se existirem) para garantir um estado limpo.
-- CUIDADO: Isto apagará todos os dados existentes! Comente se quiser preservar os dados.
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS jwt_blocklist; -- Adicionado

-- Cria a tabela de empresas
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    address TEXT,
    ie VARCHAR(20),
    company_type VARCHAR(50),
    business_branch VARCHAR(50),
    billing_day INT CHECK (billing_day IN (5, 10, 15, 20, 25)),
    contract_end_date DATE NOT NULL,
    user_limit INT DEFAULT 5 NOT NULL, -- Limite de usuários padrão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela de módulos
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    version VARCHAR(20),
    monthly_cost_brl NUMERIC(10, 2) NOT NULL,
    tags TEXT[], -- Array de strings para tags
    allowed_user_types TEXT[] NOT NULL, -- Array de perfis permitidos (ex: ['ADMINISTRADOR', 'GERENTE'])
    applicable_business_branches TEXT[] NOT NULL, -- Array de ramos aplicáveis (ex: ['COMERCIO', 'INDUSTRIA'])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela de usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Se a empresa for deletada, os usuários também são.
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    login_user VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(64) NOT NULL, -- Armazena o hash SHA-256 da senha
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'ESTOQUE', 'USUARIO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela de assinaturas (vínculo entre empresas e módulos)
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, module_id) -- Garante que uma empresa só pode assinar um módulo uma vez
);

-- Cria a tabela para blocklist de JWT (Logout Seguro)
CREATE TABLE jwt_blocklist (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL, -- Identificador único do token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Quando o token originalmente expira
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insere os módulos padrão (Exemplo)
INSERT INTO modules (module_name, description, version, monthly_cost_brl, tags, allowed_user_types, applicable_business_branches) VALUES
('Controle de Estoque', 'Gerencia a entrada e saída de produtos, controla o inventário e alerta sobre baixos níveis de estoque.', '1.0.0', 19.90, ARRAY['estoque', 'inventario', 'produtos'], ARRAY['ESTOQUE', 'GERENTE', 'ADMINISTRADOR'], ARRAY['COMERCIO', 'INDUSTRIA', 'ATACADISTA', 'ONLINE']),
('Financeiro', 'Controle de contas a pagar e a receber, fluxo de caixa, conciliação bancária e emissão de relatórios.', '1.1.0', 59.90, ARRAY['financeiro', 'contas', 'caixa'], ARRAY['GERENTE', 'ADMINISTRADOR'], ARRAY['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE']),
('Gestão de Vendas (CRM)', 'Gerencia o funil de vendas, cadastra clientes, acompanha negociações.', '1.0.2', 69.90, ARRAY['vendas', 'crm', 'clientes'], ARRAY['VENDEDOR', 'GERENTE', 'ADMINISTRADOR'], ARRAY['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE']),
('Emissão de Notas Fiscais (NF-e)', 'Emite Notas Fiscais eletrônicas de produtos e serviços.', '2.0.0', 99.90, ARRAY['fiscal', 'nfe', 'impostos'], ARRAY['GERENTE', 'ADMINISTRADOR', 'USUARIO'], ARRAY['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE']),
('Ponto de Venda (PDV)', 'Interface de caixa para vendas rápidas em lojas físicas.', '1.3.0', 39.90, ARRAY['vendas', 'pdv', 'caixa'], ARRAY['VENDEDOR', 'GERENTE', 'ADMINISTRADOR', 'USUARIO'], ARRAY['COMERCIO', 'ATACADISTA', 'SERVICOS']),
('Precificação', 'Ferramenta para auxiliar na precificação de produtos e serviços.', '1.0.0', 29.90, ARRAY['precos', 'custos', 'margem'], ARRAY['GERENTE', 'ADMINISTRADOR'], ARRAY['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE']);

-- Adiciona Índices para otimizar consultas comuns
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_jwt_blocklist_expires_at ON jwt_blocklist(expires_at);


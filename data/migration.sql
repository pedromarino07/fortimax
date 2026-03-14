-- Script de Migração Seguro para PostgreSQL (Neon.tech)
-- Protocolo: Verificação de Existência (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    active INTEGER DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2),
    oferta INTEGER DEFAULT 0,
    description TEXT,
    stock INTEGER DEFAULT 0,
    images TEXT, -- JSON string array
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    senha TEXT NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'vendedor',
    ativo INTEGER DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de dados de exemplo (opcional para teste)
-- INSERT INTO categories (name) VALUES ('Material de Construção') ON CONFLICT DO NOTHING;

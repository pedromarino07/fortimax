-- SQL Script for Fortimax Project (Neon PostgreSQL)

-- Drop tables if they exist
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS config_site;

-- Categories Table
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE
);

-- Products Table
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco_base DECIMAL(10, 2) NOT NULL,
    preco_oferta DECIMAL(10, 2),
    estoque INTEGER DEFAULT 0,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    imagem_url TEXT, -- Can be a JSON string of array or single path
    em_oferta BOOLEAN DEFAULT FALSE,
    destaque BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255) NOT NULL,
    nivel VARCHAR(20) DEFAULT 'vendedor', -- 'gerente' or 'vendedor'
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Site Config Table
CREATE TABLE config_site (
    chave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Seed Initial Categories
INSERT INTO categorias (nome, slug) VALUES 
('Material de Construção', 'material-de-construcao'),
('Piscina', 'piscina'),
('Ferragens', 'ferragens'),
('Tintas', 'tintas'),
('Ferramentas', 'ferramentas'),
('Hidráulico', 'hidraulico'),
('Elétrico', 'eletrico'),
('Automotivo', 'automotivo'),
('Decoração', 'decoracao');

-- Seed Initial Config
INSERT INTO config_site (chave, valor) VALUES ('LABEL_INICIO', 'INÍCIO');

-- Seed Initial Users (Passwords will be hashed in server.ts if needed, but here are placeholders)
-- Note: In a real scenario, you'd hash these before inserting.
-- Gerentes: Tanizio (tanizio), Helena (helena)
-- Vendedores: Daniel (daniel), Vitor (vitor), Danilo (danilo)

-- Script de criação de tabelas para PostgreSQL (Neon.tech)

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco_base DECIMAL(10, 2) NOT NULL,
    preco_oferta DECIMAL(10, 2),
    estoque INTEGER DEFAULT 0,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    imagem_url TEXT, -- Pode ser uma URL ou caminho local
    em_oferta BOOLEAN DEFAULT FALSE,
    destaque BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Configurações do Site
CREATE TABLE IF NOT EXISTS config_site (
    chave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Tabela de Usuários (Mantendo a lógica do sistema anterior)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    senha TEXT NOT NULL,
    nivel VARCHAR(20) DEFAULT 'vendedor', -- 'admin', 'gerente', 'vendedor'
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserções Iniciais (Seed)
INSERT INTO config_site (chave, valor) VALUES ('LABEL_INICIO', 'INÍCIO') ON CONFLICT (chave) DO NOTHING;

INSERT INTO categorias (nome, slug) VALUES 
('Material de Construção', 'material-de-construcao'),
('Hidráulico', 'hidraulico'),
('Elétrico', 'eletrico'),
('Tintas', 'tintas'),
('Ferragens', 'ferragens')
ON CONFLICT (nome) DO NOTHING;

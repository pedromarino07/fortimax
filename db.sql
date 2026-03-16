-- Categorias Fortimax
INSERT INTO categorias (nome, slug, ativo) VALUES 
('Material de Construção', 'material-de-construcao', true),
('Piscina', 'piscina', true),
('Ferragens', 'ferragens', true),
('Tintas', 'tintas', true),
('Ferramentas', 'ferramentas', true),
('Hidráulico', 'hidraulico', true),
('Elétrico', 'eletrico', true),
('Automotivo', 'automotivo', true),
('Decoração', 'decoracao', true)
ON CONFLICT (nome) DO NOTHING;

-- Usuários Gerentes
-- Senha padrão: fortimax2026
-- Tanizio e Helena
-- (As senhas no banco devem ser hashes bcrypt)

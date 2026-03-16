import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Database Connection (PostgreSQL / Neon) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'fortimax_secret_key_2026';

// --- Database Initialization ---
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        ativo BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco_base DECIMAL(10, 2) NOT NULL,
        preco_oferta DECIMAL(10, 2),
        estoque INTEGER DEFAULT 0,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
        imagem_url TEXT,
        em_oferta BOOLEAN DEFAULT FALSE,
        destaque BOOLEAN DEFAULT FALSE,
        ativo BOOLEAN DEFAULT TRUE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS config_site (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        email TEXT,
        senha TEXT NOT NULL,
        nivel TEXT DEFAULT 'vendedor',
        ativo BOOLEAN DEFAULT TRUE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial config
    await client.query("INSERT INTO config_site (chave, valor) VALUES ('LABEL_INICIO', 'INÍCIO') ON CONFLICT (chave) DO NOTHING");

    // Seed initial categories
    const initialCats = [
      ['Material de Construção', 'material-de-construcao'],
      ['Piscina', 'piscina'],
      ['Ferragens', 'ferragens'],
      ['Tintas', 'tintas'],
      ['Ferramentas', 'ferramentas'],
      ['Hidráulico', 'hidraulico'],
      ['Elétrico', 'eletrico'],
      ['Automotivo', 'automotivo'],
      ['Decoração', 'decoracao']
    ];
    for (const [nome, slug] of initialCats) {
      await client.query('INSERT INTO categorias (nome, slug) VALUES ($1, $2) ON CONFLICT (nome) DO NOTHING', [nome, slug]);
    }

    // Seed specific users
    const userCountRes = await client.query('SELECT count(*) FROM usuarios');
    if (parseInt(userCountRes.rows[0].count) === 0) {
      const salt = bcrypt.genSaltSync(10);
      
      // Gerentes
      const gerentes = [
        ['Tanizio', 'tanizio', 'tanizio@fortimax.com.br', 'fortimax2026'],
        ['Helena', 'helena', 'helena@fortimax.com.br', 'fortimax2026']
      ];
      
      // Vendedores
      const vendedores = [
        ['Daniel', 'daniel', 'daniel@fortimax.com.br', 'venda123'],
        ['Vitor', 'vitor', 'vitor@fortimax.com.br', 'venda123'],
        ['Danilo', 'danilo', 'danilo@fortimax.com.br', 'venda123']
      ];

      for (const [nome, usuario, email, senha] of gerentes) {
        await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', 
          [nome, usuario, email, bcrypt.hashSync(senha, salt), 'gerente', true]);
      }
      
      for (const [nome, usuario, email, senha] of vendedores) {
        await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', 
          [nome, usuario, email, bcrypt.hashSync(senha, salt), 'vendedor', true]);
      }
      
      // Default admin
      await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', 
        ['Administrador', 'admin', 'admin@fortimax.com.br', bcrypt.hashSync('admin123', salt), 'gerente', true]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

initDb();

// --- Express Setup ---
const app = express();
app.use(express.json());
app.use(cookieParser());

// Serve public folder at root
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/img', express.static(path.join(process.cwd(), 'public/img')));

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'public', 'img', 'produtos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// RBAC Middleware
const isGerente = (req: any, res: any, next: any) => {
  if (req.user.nivel !== 'gerente') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Gerentes podem realizar esta ação.' });
  }
  next();
};

const isVendedorOrGerente = (req: any, res: any, next: any) => {
  const allowed = ['vendedor', 'gerente'];
  if (!allowed.includes(req.user.nivel)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

// --- API Routes ---

// Config Site
app.get('/api/config/:chave', async (req, res) => {
  try {
    const result = await pool.query('SELECT valor FROM config_site WHERE chave = $1', [req.params.chave]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });
    res.json({ valor: result.rows[0].valor });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// Categories
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE ativo = true ORDER BY nome ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Products
app.get('/api/produtos', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 40;
  const offset = (page - 1) * limit;
  const categorySlug = req.query.categoria as string;
  const search = req.query.search as string;
  const onlyOffers = req.query.onlyOffers === 'true';

  try {
    let query = 'SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.ativo = true';
    const params: any[] = [];

    if (categorySlug) {
      params.push(categorySlug);
      query += ` AND c.slug = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.nome ILIKE $${params.length} OR p.descricao ILIKE $${params.length})`;
    }

    if (onlyOffers) {
      query += ' AND p.em_oferta = true';
    }

    // Count total
    const countQuery = `SELECT count(*) FROM (${query}) as sub`;
    const totalResult = await pool.query(countQuery, params);
    const totalCount = parseInt(totalResult.rows[0].count);

    // Final query with pagination
    query += ` ORDER BY p.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.json({
      produtos: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Single Product
app.get('/api/produtos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const user = result.rows[0];
    
    if (!user || !bcrypt.compareSync(senha, user.senha)) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    if (!user.ativo) {
      return res.status(403).json({ error: 'Usuário desativado.' });
    }

    const token = jwt.sign({ 
      id: user.id, 
      nome: user.nome, 
      usuario: user.usuario, 
      nivel: user.nivel 
    }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ id: user.id, nome: user.nome, usuario: user.usuario, nivel: user.nivel });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout realizado' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Não logado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json(decoded);
  } catch (e) {
    res.status(401).json({ error: 'Sessão expirada' });
  }
});

// --- Admin Routes (Protected) ---

// Admin Products
app.get('/api/admin/products', authenticate, isVendedorOrGerente, async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.data_criacao DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/admin/products', authenticate, isVendedorOrGerente, upload.single('imagem'), async (req, res) => {
  const { nome, descricao, preco_base, preco_oferta, estoque, categoria_id, em_oferta, destaque, ativo } = req.body;
  const imagem_url = req.file ? `/img/produtos/${req.file.filename}` : null;

  try {
    const result = await pool.query(`
      INSERT INTO produtos (nome, descricao, preco_base, preco_oferta, estoque, categoria_id, imagem_url, em_oferta, destaque, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `, [
      nome, 
      descricao, 
      parseFloat(preco_base), 
      preco_oferta ? parseFloat(preco_oferta) : null, 
      parseInt(estoque), 
      categoria_id ? parseInt(categoria_id) : null, 
      imagem_url, 
      em_oferta === 'true', 
      destaque === 'true', 
      ativo === 'true'
    ]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

app.put('/api/admin/products/:id', authenticate, isVendedorOrGerente, upload.single('imagem'), async (req, res) => {
  const { nome, descricao, preco_base, preco_oferta, estoque, categoria_id, em_oferta, destaque, ativo } = req.body;
  
  let query = 'UPDATE produtos SET nome = $1, descricao = $2, preco_base = $3, preco_oferta = $4, estoque = $5, categoria_id = $6, em_oferta = $7, destaque = $8, ativo = $9';
  const params = [
    nome, 
    descricao, 
    parseFloat(preco_base), 
    preco_oferta ? parseFloat(preco_oferta) : null, 
    parseInt(estoque), 
    categoria_id ? parseInt(categoria_id) : null, 
    em_oferta === 'true', 
    destaque === 'true', 
    ativo === 'true'
  ];

  if (req.file) {
    params.push(`/img/produtos/${req.file.filename}`);
    query += `, imagem_url = $${params.length}`;
  }

  params.push(req.params.id);
  query += ` WHERE id = $${params.length}`;

  try {
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/admin/products/:id', authenticate, isGerente, async (req, res) => {
  try {
    await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// Finalizar Pedido
app.post('/api/finalizar-pedido', async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const res = await client.query('SELECT estoque FROM produtos WHERE id = $1', [item.id]);
      const product = res.rows[0];
      
      if (!product) throw new Error(`Produto ${item.id} não encontrado`);
      if (product.estoque < item.quantity) throw new Error(`Estoque insuficiente para o produto ${item.id}`);
      
      await client.query('UPDATE produtos SET estoque = estoque - $1 WHERE id = $2', [item.quantity, item.id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

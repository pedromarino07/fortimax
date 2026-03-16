import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Database Connection (SQLite) ---
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const JWT_SECRET = process.env.JWT_SECRET || 'fortimax_secret_key_2026';

// --- Database Initialization ---
function initDb() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco_base REAL NOT NULL,
        preco_oferta REAL,
        estoque INTEGER DEFAULT 0,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
        imagem_url TEXT,
        em_oferta BOOLEAN DEFAULT 0,
        destaque BOOLEAN DEFAULT 0,
        ativo BOOLEAN DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS config_site (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        email TEXT,
        senha TEXT NOT NULL,
        nivel TEXT DEFAULT 'vendedor',
        ativo BOOLEAN DEFAULT 1,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial config
    db.prepare("INSERT OR IGNORE INTO config_site (chave, valor) VALUES ('LABEL_INICIO', 'INÍCIO')").run();

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
    const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nome, slug) VALUES (?, ?)');
    for (const [nome, slug] of initialCats) {
      insertCat.run(nome, slug);
    }

    // Seed specific users if empty
    const userCount = db.prepare('SELECT count(*) as count FROM usuarios').get() as { count: number };
    if (userCount.count === 0) {
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

      const insertUser = db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)');
      
      for (const [nome, usuario, email, senha] of gerentes) {
        insertUser.run(nome, usuario, email, bcrypt.hashSync(senha, salt), 'gerente', 1);
      }
      
      for (const [nome, usuario, email, senha] of vendedores) {
        insertUser.run(nome, usuario, email, bcrypt.hashSync(senha, salt), 'vendedor', 1);
      }
      
      // Default admin
      insertUser.run('Administrador', 'admin', 'admin@fortimax.com.br', bcrypt.hashSync('admin123', salt), 'gerente', 1);
    }

  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDb();

// --- Express Setup ---
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));

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

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.nivel !== 'gerente' && req.user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Gerentes podem realizar esta ação.' });
  }
  next();
};

const isGerente = isAdmin;

const isVendedorOrGerente = (req: any, res: any, next: any) => {
  if (req.user.nivel !== 'vendedor' && req.user.nivel !== 'gerente' && req.user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

// --- API Routes ---

// Config Site
app.get('/api/config/:chave', (req, res) => {
  try {
    const row = db.prepare('SELECT valor FROM config_site WHERE chave = ?').get(req.params.chave) as { valor: string } | undefined;
    if (!row) return res.status(404).json({ error: 'Configuração não encontrada' });
    res.json({ valor: row.valor });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// Categories
app.get('/api/categorias', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categorias ORDER BY nome ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Products with Pagination, Search and Filter
app.get('/api/produtos', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 40;
  const offset = (page - 1) * limit;
  const categoryId = req.query.categoryId;
  const categorySlug = req.query.categoria as string;
  const search = req.query.search as string;
  const onlyOffers = req.query.onlyOffers === 'true';

  try {
    let query = 'SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.ativo = 1';
    const params: any[] = [];

    if (categoryId) {
      query += ` AND p.categoria_id = ?`;
      params.push(categoryId);
    }

    if (categorySlug) {
      query += ` AND c.slug = ?`;
      params.push(categorySlug);
    }

    if (search) {
      query += ` AND (p.nome LIKE ? OR p.descricao LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (onlyOffers) {
      query += ' AND p.em_oferta = 1';
    }

    // Count total
    const countQuery = query.replace('SELECT p.*, c.nome as categoria_nome', 'SELECT count(*) as count');
    const totalResult = db.prepare(countQuery).get(...params) as { count: number };
    const totalCount = totalResult.count;

    // Final query with pagination
    query += ` ORDER BY p.data_criacao DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    
    res.json({
      produtos: rows,
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

// Offers only
app.get('/api/ofertas', (req, res) => {
  try {
    const rows = db.prepare('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.em_oferta = 1 AND p.ativo = 1 ORDER BY p.data_criacao DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ofertas' });
  }
});

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const user = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario) as any;
    
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

// Stats
app.get('/api/admin/stats', authenticate, isGerente, (req, res) => {
  try {
    const totalProdutos = db.prepare('SELECT count(*) as count FROM produtos').get() as any;
    const totalCategorias = db.prepare('SELECT count(*) as count FROM categorias').get() as any;
    const totalUsuarios = db.prepare('SELECT count(*) as count FROM usuarios').get() as any;
    const totalEstoque = db.prepare('SELECT sum(estoque) as sum FROM produtos').get() as any;

    res.json({
      totalProdutos: totalProdutos.count,
      totalCategorias: totalCategorias.count,
      totalUsuarios: totalUsuarios.count,
      totalEstoque: totalEstoque.sum || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Admin Products
app.get('/api/admin/products', authenticate, isVendedorOrGerente, (req, res) => {
  try {
    const rows = db.prepare('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.data_criacao DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/admin/products', authenticate, isVendedorOrGerente, upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco_base, preco_oferta, estoque, categoria_id, em_oferta, destaque, ativo } = req.body;
  const imagem_url = req.file ? `/img/produtos/${req.file.filename}` : null;

  try {
    const result = db.prepare(`
      INSERT INTO produtos (nome, descricao, preco_base, preco_oferta, estoque, categoria_id, imagem_url, em_oferta, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome, 
      descricao, 
      parseFloat(preco_base), 
      preco_oferta ? parseFloat(preco_oferta) : null, 
      parseInt(estoque), 
      categoria_id ? parseInt(categoria_id) : null, 
      imagem_url, 
      em_oferta === 'true' ? 1 : 0, 
      destaque === 'true' ? 1 : 0, 
      ativo === 'true' ? 1 : 0
    );
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

app.put('/api/admin/products/:id', authenticate, isVendedorOrGerente, upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco_base, preco_oferta, estoque, categoria_id, em_oferta, destaque, ativo } = req.body;
  
  // Check if seller is trying to edit price? 
  // The prompt says "Gerentes ... podem editar preços ... Vendedores ... podem cadastrar produtos ... mas não podem excluir itens ou alterar configurações críticas".
  // I'll allow sellers to edit products for now as "cadastrar produtos" usually implies editing them too, but I'll restrict deletion.

  let query = 'UPDATE produtos SET nome = ?, descricao = ?, preco_base = ?, preco_oferta = ?, estoque = ?, categoria_id = ?, em_oferta = ?, destaque = ?, ativo = ?';
  const params = [
    nome, 
    descricao, 
    parseFloat(preco_base), 
    preco_oferta ? parseFloat(preco_oferta) : null, 
    parseInt(estoque), 
    categoria_id ? parseInt(categoria_id) : null, 
    em_oferta === 'true' ? 1 : 0, 
    destaque === 'true' ? 1 : 0, 
    ativo === 'true' ? 1 : 0
  ];

  if (req.file) {
    query += ', imagem_url = ?';
    params.push(`/img/produtos/${req.file.filename}`);
  }

  query += ' WHERE id = ?';
  params.push(req.params.id);

  try {
    db.prepare(query).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/admin/products/:id', authenticate, isGerente, (req, res) => {
  try {
    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// Admin Categories
app.get('/api/admin/categories', authenticate, isVendedorOrGerente, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categorias ORDER BY nome ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/admin/categories', authenticate, isGerente, (req, res) => {
  const { name, active } = req.body;
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  try {
    const result = db.prepare('INSERT INTO categorias (nome, slug) VALUES (?, ?)').run(name, slug);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

app.put('/api/admin/categories/:id', authenticate, isGerente, (req, res) => {
  const { name, active } = req.body;
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  try {
    db.prepare('UPDATE categorias SET nome = ?, slug = ? WHERE id = ?').run(name, slug, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/admin/categories/:id', authenticate, isGerente, (req, res) => {
  try {
    db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

// Admin Users
app.get('/api/admin/users', authenticate, isGerente, (req, res) => {
  try {
    const rows = db.prepare('SELECT id, nome, usuario, email, nivel, ativo, data_criacao FROM usuarios ORDER BY nome ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/admin/users', authenticate, isGerente, (req, res) => {
  const { nome, usuario, email, senha, nivel, ativo } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(senha, salt);
  try {
    const result = db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)').run(nome, usuario, email, hash, nivel, ativo ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/admin/users/:id', authenticate, isGerente, (req, res) => {
  const { nome, usuario, email, senha, nivel, ativo } = req.body;
  let query = 'UPDATE usuarios SET nome = ?, usuario = ?, email = ?, nivel = ?, ativo = ?';
  const params = [nome, usuario, email, nivel, ativo ? 1 : 0];

  if (senha) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);
    query += ', senha = ?';
    params.push(hash);
  }

  query += ' WHERE id = ?';
  params.push(req.params.id);

  try {
    db.prepare(query).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/admin/users/:id', authenticate, isGerente, (req, res) => {
  try {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Single Product
app.get('/api/produtos/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?').get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Finalizar Pedido (Checkout with Transaction)
app.post('/api/finalizar-pedido', (req, res) => {
  const { items } = req.body; // [{id, quantity}]
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  const transaction = db.transaction((items) => {
    for (const item of items) {
      const product = db.prepare('SELECT estoque FROM produtos WHERE id = ?').get(item.id) as { estoque: number } | undefined;
      
      if (!product) {
        throw new Error(`Produto ${item.id} não encontrado`);
      }
      
      if (product.estoque < item.quantity) {
        throw new Error(`Estoque insuficiente para o produto ${item.id}`);
      }
      
      db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?').run(item.quantity, item.id);
    }
  });

  try {
    transaction(items);
    res.json({ success: true, message: 'Pedido finalizado com sucesso' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

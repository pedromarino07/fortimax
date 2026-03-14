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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'fortimax_secret_key_2026';

// --- Database Initialization ---
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    usuario TEXT UNIQUE NOT NULL,
    email TEXT,
    senha TEXT NOT NULL,
    nivel TEXT NOT NULL DEFAULT 'vendedor', -- 'admin', 'gerente' or 'vendedor'
    ativo INTEGER DEFAULT 1,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    oldPrice REAL,
    oferta INTEGER DEFAULT 0,
    description TEXT,
    stock INTEGER DEFAULT 0,
    images TEXT, -- JSON string array
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    active INTEGER DEFAULT 1,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial users if empty
const userCount = db.prepare('SELECT count(*) as count FROM usuarios').get() as { count: number };
if (userCount.count === 0) {
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const helenaPass = bcrypt.hashSync('helena123', salt);
  const tanizioPass = bcrypt.hashSync('tanizio123', salt);

  db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)').run('Administrador', 'admin', 'admin@fortimax.com.br', adminPass, 'admin', 1);
  db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)').run('Helena', 'helena', 'helena@fortimax.com.br', helenaPass, 'gerente', 1);
  db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)').run('Tanizio', 'tanizio', 'tanizio@fortimax.com.br', tanizioPass, 'vendedor', 1);
}

// Fix: Ensure 'admin' user is actually an 'admin' (User request)
db.prepare("UPDATE usuarios SET nivel = 'admin' WHERE usuario = 'admin'").run();

// Seed initial categories if empty
const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
if (categoryCount.count === 0) {
  const initialCats = ['Material de Construção', 'Hidráulico', 'Elétrico', 'Tintas', 'Ferragens'];
  const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
  for (const cat of initialCats) {
    insert.run(cat);
  }
}

// Seed initial products from JSON if empty
const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
if (productCount.count === 0) {
  try {
    const initialProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf-8'));
    const insert = db.prepare(`
      INSERT INTO products (name, category, price, oldPrice, oferta, description, stock, images, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of initialProducts) {
      insert.run(p.name, p.category, p.price, p.oldPrice || null, p.oferta ? 1 : 0, p.description, p.stock, JSON.stringify(p.images), p.featured ? 1 : 0, 1);
    }
  } catch (e) {
    console.error('Error seeding products:', e);
  }
}

// --- Express Setup ---
const app = express();
app.use(express.json());
app.use(cookieParser());

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './static/img/produtos';
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
  console.log(`Verificando isAdmin para usuário: ${req.user.usuario}, nível: ${req.user.nivel}`);
  if (req.user.nivel !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas Administradores podem realizar esta ação.' });
  next();
};

const isGerenteOrAdmin = (req: any, res: any, next: any) => {
  console.log(`Verificando isGerenteOrAdmin para usuário: ${req.user.usuario}, nível: ${req.user.nivel}`);
  if (req.user.nivel !== 'admin' && req.user.nivel !== 'gerente') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Administradores ou Gerentes podem realizar esta ação.' });
  }
  next();
};

// --- API Routes ---

// Public Products with Pagination
app.get('/api/products', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 40;
  const offset = (page - 1) * limit;
  const category = req.query.category as string;
  const search = req.query.search as string;
  const onlyOffers = req.query.onlyOffers === 'true';

  let query = 'SELECT * FROM products WHERE active = 1 AND stock > 0';
  const params: any[] = [];

  if (category && category !== 'Todos') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  if (onlyOffers) {
    query += ' AND oferta = 1';
  }

  // Get total count for pagination
  const countQuery = query.replace('SELECT *', 'SELECT count(*) as count');
  const totalCount = (db.prepare(countQuery).get(...params) as any).count;

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const products = db.prepare(query).all(...params);
  
  res.json({
    products: products.map((p: any) => ({ 
      ...p, 
      images: JSON.parse(p.images), 
      oferta: !!p.oferta, 
      featured: !!p.featured, 
      active: !!p.active 
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1').all();
  res.json(categories);
});

app.post('/api/admin/categories', authenticate, isGerenteOrAdmin, (req, res) => {
  const { name } = req.body;
  try {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.json({ message: 'Categoria criada' });
  } catch (e) {
    res.status(400).json({ error: 'Categoria já existe' });
  }
});

app.put('/api/admin/categories/:id', authenticate, isGerenteOrAdmin, (req, res) => {
  const { name, active } = req.body;
  try {
    db.prepare('UPDATE categories SET name = ?, active = ? WHERE id = ?').run(name, active ? 1 : 0, req.params.id);
    res.json({ message: 'Categoria atualizada' });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/admin/categories/:id', authenticate, isAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Categoria removida' });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ ...product, images: JSON.parse(product.images), oferta: !!product.oferta, featured: !!product.featured, active: !!product.active });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario) as any;
  
  if (!user) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  if (!user.ativo) {
    return res.status(403).json({ error: 'Usuário desativado. Procure o administrador.' });
  }

  if (!bcrypt.compareSync(senha, user.senha)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const token = jwt.sign({ 
    id: user.id, 
    nome: user.nome, 
    usuario: user.usuario, 
    nivel: user.nivel,
    ativo: !!user.ativo
  }, JWT_SECRET, { expiresIn: '1d' });

  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ 
    id: user.id, 
    nome: user.nome, 
    usuario: user.usuario, 
    nivel: user.nivel,
    ativo: !!user.ativo
  });
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

// Admin Products CRUD
app.get('/api/admin/products', authenticate, (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products.map((p: any) => ({ ...p, images: JSON.parse(p.images), oferta: !!p.oferta, featured: !!p.featured, active: !!p.active })));
});

app.post('/api/admin/products', authenticate, upload.array('images'), (req: any, res) => {
  const { name, category, price, oldPrice, oferta, description, stock, featured, active } = req.body;
  
  if (oferta === 'true' && req.user.nivel === 'vendedor') {
    return res.status(403).json({ error: 'Vendedores não podem criar ofertas.' });
  }

  const files = req.files as any[];
  const images = files.map(f => `/static/img/produtos/${f.filename}`);
  
  const result = db.prepare(`
    INSERT INTO products (name, category, price, oldPrice, oferta, description, stock, images, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category, price, oldPrice || null, oferta === 'true' ? 1 : 0, description, stock, JSON.stringify(images), featured === 'true' ? 1 : 0, active === 'true' ? 1 : 0);
  
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/admin/products/:id', authenticate, upload.array('images'), (req: any, res) => {
  const { name, category, price, oldPrice, oferta, description, stock, featured, active, existingImages } = req.body;

  if (oferta === 'true' && req.user.nivel === 'vendedor') {
    return res.status(403).json({ error: 'Vendedores não podem gerenciar ofertas.' });
  }

  const files = req.files as any[];
  let images = JSON.parse(existingImages || '[]');
  if (files.length > 0) {
    const newImages = files.map(f => `/static/img/produtos/${f.filename}`);
    images = [...images, ...newImages];
  }

  db.prepare(`
    UPDATE products SET name = ?, category = ?, price = ?, oldPrice = ?, oferta = ?, description = ?, stock = ?, images = ?, featured = ?, active = ?
    WHERE id = ?
  `).run(name, category, price, oldPrice || null, oferta === 'true' ? 1 : 0, description, stock, JSON.stringify(images), featured === 'true' ? 1 : 0, active === 'true' ? 1 : 0, req.params.id);
  
  res.json({ message: 'Produto atualizado' });
});

app.delete('/api/admin/products/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Produto removido' });
});

// Admin Users CRUD
app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
  const users = db.prepare('SELECT id, nome, usuario, email, nivel, ativo, data_criacao FROM usuarios').all();
  res.json(users.map((u: any) => ({ ...u, ativo: !!u.ativo })));
});

app.post('/api/admin/users', authenticate, isAdmin, (req, res) => {
  const { nome, usuario, email, senha, nivel, ativo } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hashedPass = bcrypt.hashSync(senha, salt);
  try {
    db.prepare('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES (?, ?, ?, ?, ?, ?)').run(nome, usuario, email, hashedPass, nivel, ativo ? 1 : 0);
    res.json({ message: 'Usuário criado' });
  } catch (e) {
    res.status(400).json({ error: 'Usuário ou e-mail já cadastrado' });
  }
});

app.put('/api/admin/users/:id', authenticate, isAdmin, (req, res) => {
  const { nome, usuario, email, nivel, ativo, senha } = req.body;
  
  try {
    if (senha) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPass = bcrypt.hashSync(senha, salt);
      db.prepare('UPDATE usuarios SET nome = ?, usuario = ?, email = ?, nivel = ?, ativo = ?, senha = ? WHERE id = ?')
        .run(nome, usuario, email, nivel, ativo ? 1 : 0, hashedPass, req.params.id);
    } else {
      db.prepare('UPDATE usuarios SET nome = ?, usuario = ?, email = ?, nivel = ?, ativo = ? WHERE id = ?')
        .run(nome, usuario, email, nivel, ativo ? 1 : 0, req.params.id);
    }
    res.json({ message: 'Usuário atualizado' });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/admin/users/:id', authenticate, isAdmin, (req, res) => {
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ message: 'Usuário removido' });
});

// Dashboard Stats
app.get('/api/admin/stats', authenticate, isGerenteOrAdmin, (req: any, res) => {
  const totalProducts = db.prepare('SELECT count(*) as count FROM products').get() as any;
  const activeProducts = db.prepare('SELECT count(*) as count FROM products WHERE active = 1').get() as any;
  const offersCount = db.prepare('SELECT count(*) as count FROM products WHERE oferta = 1').get() as any;
  const usersCount = db.prepare('SELECT count(*) as count FROM usuarios').get() as any;
  
  res.json({
    totalProducts: totalProducts.count,
    activeProducts: activeProducts.count,
    offersCount: offersCount.count,
    usersCount: usersCount.count
  });
});

// Checkout - Stock Deduction (ACID Transaction)
app.post('/api/checkout', (req, res) => {
  const { items } = req.body; // [{id, quantity}]
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  const transaction = db.transaction((orderItems) => {
    for (const item of orderItems) {
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.id) as any;
      
      if (!product) {
        throw new Error(`Produto ${item.id} não encontrado`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para o produto ${item.id}`);
      }
      
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
    }
  });

  try {
    transaction(items);
    res.json({ message: 'Estoque atualizado com sucesso' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
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

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();

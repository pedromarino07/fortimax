import 'dotenv/config';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'fortimax_secret_key_2026';

// --- PostgreSQL (Neon.tech) Configuration ---
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon.tech
  }
});

// Test PostgreSQL connection on startup
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Erro ao conectar ao PostgreSQL (Neon):', err.stack);
  }
  console.log('Conexão com PostgreSQL (Neon) estabelecida com sucesso.');
  release();
});

// --- Database Initialization (PostgreSQL) ---
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
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
        "oldPrice" DECIMAL(10, 2),
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
    `);

    // Seed initial users if empty
    const userCountRes = await client.query('SELECT count(*) as count FROM usuarios');
    if (parseInt(userCountRes.rows[0].count) === 0) {
      const salt = bcrypt.genSaltSync(10);
      const adminPass = bcrypt.hashSync('admin123', salt);
      const helenaPass = bcrypt.hashSync('helena123', salt);
      const tanizioPass = bcrypt.hashSync('tanizio123', salt);

      await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', ['Administrador', 'admin', 'admin@fortimax.com.br', adminPass, 'admin', 1]);
      await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', ['Helena', 'helena', 'helena@fortimax.com.br', helenaPass, 'gerente', 1]);
      await client.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', ['Tanizio', 'tanizio', 'tanizio@fortimax.com.br', tanizioPass, 'vendedor', 1]);
    }

    // Ensure 'admin' user is actually an 'admin'
    await client.query("UPDATE usuarios SET nivel = 'admin' WHERE usuario = 'admin'");

    // Seed initial categories if empty
    const categoryCountRes = await client.query('SELECT count(*) as count FROM categories');
    if (parseInt(categoryCountRes.rows[0].count) === 0) {
      const initialCats = ['Material de Construção', 'Hidráulico', 'Elétrico', 'Tintas', 'Ferragens'];
      for (const cat of initialCats) {
        await client.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [cat]);
      }
    }

    // Seed initial products from JSON if empty
    const productCountRes = await client.query('SELECT count(*) as count FROM products');
    if (parseInt(productCountRes.rows[0].count) === 0) {
      try {
        const productsPath = path.join(__dirname, 'data', 'products.json');
        if (fs.existsSync(productsPath)) {
          const initialProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
          for (const p of initialProducts) {
            await client.query(`
              INSERT INTO products (name, category, price, "oldPrice", oferta, description, stock, images, featured, active)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [p.name, p.category, p.price, p.oldPrice || null, p.oferta ? 1 : 0, p.description, p.stock, JSON.stringify(p.images), p.featured ? 1 : 0, 1]);
          }
        }
      } catch (e) {
        console.error('Error seeding products:', e);
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar banco de dados PostgreSQL:', err);
  } finally {
    client.release();
  }
}

//initDb();

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

app.get('/api/neon/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    
    res.json(result.rows.map(p => ({
      ...p,
      // Garante que preço seja número. Se for null, vira 0.
      price: parseFloat(p.price) || 0,
      oldprice: p.oldprice ? parseFloat(p.oldprice) : null,
      // Se tiver imagem, tenta parsear, senão retorna array vazio
      images: p.images ? JSON.parse(p.images) : [],
      // Converte inteiros 1 ou 0 para booleano
      active: p.active === 1,
      oferta: !!p.oferta,
      featured: !!p.featured
    })));
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.get('/api/neon/test-connection', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      status: 'success', 
      message: 'Conexão com Neon.tech funcionando!',
      time: result.rows[0].current_time 
    });
  } catch (err) {
    console.error('Falha no teste de conexão com Neon:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Falha ao conectar com Neon.tech. Verifique sua DATABASE_URL.' 
    });
  }
});

// Public Products with Pagination
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 40;
    const offset = (page - 1) * limit;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const onlyOffers = req.query.onlyOffers === 'true';

    let query = 'SELECT * FROM products WHERE active = 1 AND stock > 0';
    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'Todos') {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND name ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    if (onlyOffers) {
      query += ' AND oferta = 1';
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT count(*) as count');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const products = result.rows;
    
    res.json({
      products: products.map((p: any) => ({ 
        ...p,
        // Forçamos a leitura da coluna com aspas (usando p['oldPrice'])
        // Se p['oldPrice'] for undefined, tentamos p.oldprice por segurança
        oldPrice: p["oldPrice"] !== undefined ? parseFloat(p["oldPrice"]) : (p.oldprice ? parseFloat(p.oldprice) : null),
        
        images: p.images ? JSON.parse(p.images) : [], 
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
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos no banco de dados.' });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE active = 1');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

app.post('/api/admin/categories', authenticate, isGerenteOrAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO categories (name) VALUES ($1)', [name]);
    res.json({ message: 'Categoria criada' });
  } catch (e) {
    res.status(400).json({ error: 'Categoria já existe ou erro ao criar' });
  }
});

app.put('/api/admin/categories/:id', authenticate, isGerenteOrAdmin, async (req, res) => {
  const { name, active } = req.body;
  try {
    await pool.query('UPDATE categories SET name = $1, active = $2 WHERE id = $3', [name, active ? 1 : 0, req.params.id]);
    res.json({ message: 'Categoria atualizada' });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/admin/categories/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Categoria removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover categoria' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const product = result.rows[0];
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ 
      ...product, 
      images: product.images ? JSON.parse(product.images) : [], 
      oferta: !!product.oferta, 
      featured: !!product.featured, 
      active: !!product.active 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const user = result.rows[0];
    
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
  } catch (err) {
    res.status(500).json({ error: 'Erro ao realizar login' });
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

// Admin Products CRUD
app.get('/api/admin/products', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    
    res.json(result.rows.map((p: any) => ({ 
      ...p, 
      // O segredo para parar o erro .toFixed():
      // Transformamos qualquer valor de preço em número antes de enviar ao React
      price: p.price ? parseFloat(p.price) : 0,
      oldprice: p.oldprice ? parseFloat(p.oldprice) : 0,
      
      // O que você já tinha:
      images: p.images ? JSON.parse(p.images) : [], 
      oferta: !!p.oferta, 
      featured: !!p.featured, 
      active: !!p.active 
    })));
  } catch (err) {
    console.error('Erro na API /admin/products:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos admin' });
  }
});

app.post('/api/admin/products', authenticate, upload.array('images'), async (req: any, res) => {
  try {
    const { name, category, price, oldPrice, oferta, description, stock, featured, active } = req.body;
    
    if (oferta === 'true' && req.user.nivel === 'vendedor') {
      return res.status(403).json({ error: 'Vendedores não podem criar ofertas.' });
    }

    const files = req.files as any[];
    const images = files.map(f => `/static/img/produtos/${f.filename}`);
    
    const result = await pool.query(`
       INSERT INTO products (name, category, price, "oldPrice", oferta, description, stock, images, featured, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [name, category, price, oldPrice || null, oferta === 'true' ? 1 : 0, description, stock, JSON.stringify(images), featured === 'true' ? 1 : 0, active === 'true' ? 1 : 0]);
    
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

app.put('/api/admin/products/:id', authenticate, upload.array('images'), async (req: any, res) => {
  try {
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

    await pool.query(`
    UPDATE products SET 
      name = $1, 
      category = $2, 
      price = $3, 
      "oldPrice" = $4,  -- AQUI: aspas duplas no nome da coluna
      oferta = $5, 
      description = $6, 
      stock = $7, 
      images = $8, 
      featured = $9, 
      active = $10
    WHERE id = $11
  `, [name, category, price, oldPrice || null, oferta === 'true' ? 1 : 0, description, stock, JSON.stringify(images), featured === 'true' ? 1 : 0, active === 'true' ? 1 : 0, req.params.id]);
    
    res.json({ message: 'Produto atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/admin/products/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Produto removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

// Admin Users CRUD
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, usuario, email, nivel, ativo, data_criacao FROM usuarios ORDER BY id DESC');
    res.json(result.rows.map((u: any) => ({ ...u, ativo: !!u.ativo })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { nome, usuario, email, senha, nivel, ativo } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hashedPass = bcrypt.hashSync(senha, salt);
    await pool.query('INSERT INTO usuarios (nome, usuario, email, senha, nivel, ativo) VALUES ($1, $2, $3, $4, $5, $6)', [nome, usuario, email, hashedPass, nivel, ativo ? 1 : 0]);
    res.json({ message: 'Usuário criado' });
  } catch (e) {
    res.status(400).json({ error: 'Usuário ou e-mail já cadastrado' });
  }
});

app.put('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { nome, usuario, email, nivel, ativo, senha } = req.body;
    
    if (senha) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPass = bcrypt.hashSync(senha, salt);
      await pool.query('UPDATE usuarios SET nome = $1, usuario = $2, email = $3, nivel = $4, ativo = $5, senha = $6 WHERE id = $7',
        [nome, usuario, email, nivel, ativo ? 1 : 0, hashedPass, req.params.id]);
    } else {
      await pool.query('UPDATE usuarios SET nome = $1, usuario = $2, email = $3, nivel = $4, ativo = $5 WHERE id = $7',
        [nome, usuario, email, nivel, ativo ? 1 : 0, req.params.id]);
    }
    res.json({ message: 'Usuário atualizado' });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

// Dashboard Stats
app.get('/api/admin/stats', authenticate, isGerenteOrAdmin, async (req: any, res) => {
  try {
    const totalProducts = await pool.query('SELECT count(*) as count FROM products');
    const activeProducts = await pool.query('SELECT count(*) as count FROM products WHERE active = 1');
    const offersCount = await pool.query('SELECT count(*) as count FROM products WHERE oferta = 1');
    const usersCount = await pool.query('SELECT count(*) as count FROM usuarios');
    
    res.json({
      totalProducts: parseInt(totalProducts.rows[0].count),
      activeProducts: parseInt(activeProducts.rows[0].count),
      offersCount: parseInt(offersCount.rows[0].count),
      usersCount: parseInt(usersCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Checkout - Stock Deduction (PostgreSQL Transaction)
app.post('/api/checkout', async (req, res) => {
  const { items } = req.body; // [{id, quantity}]
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const result = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [item.id]);
      const product = result.rows[0];
      
      if (!product) {
        throw new Error(`Produto ${item.id} não encontrado`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para o produto ${item.id}`);
      }
      
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Estoque atualizado com sucesso' });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('Erro no checkout:', e);
    res.status(400).json({ error: e.message });
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

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });

  app.use('/static', express.static(path.join(process.cwd(), 'public')));

  // Exemplo de como salvar no seu server.ts
app.post('/api/cadastrar', upload.single('imagem'), async (req, res) => {
  const { nome, preco } = req.body;
  const nomeArquivo = req.file ? `/img/${req.file.filename}` : "/img/logo_padrao.png";

  // Aqui você salva no Neon
  await pool.query(
    'INSERT INTO products (name, price, images) VALUES ($1, $2, $3)',
    [nome, preco, JSON.stringify([nomeArquivo])] // Salvamos como um array JSON
  );

  res.status(200).send("Produto cadastrado com sucesso!");
});
}

startServer();

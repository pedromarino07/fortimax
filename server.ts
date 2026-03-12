import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), "data", "products.json"), "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to load products" });
    }
  });

  app.get("/api/products/:id", (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), "data", "products.json"), "utf-8");
      const products = JSON.parse(data);
      const product = products.find((p: any) => p.id === parseInt(req.params.id));
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ error: "Product not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to load product" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'nail-spa-secret-key';
const db = new Database('spa.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT CHECK(role IN ('admin', 'worker'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    client_name TEXT,
    client_phone TEXT,
    service_name TEXT,
    price REAL,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_proof TEXT,
    FOREIGN KEY(worker_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    price REAL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    amount REAL,
    observation TEXT,
    date TEXT,
    FOREIGN KEY(worker_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Middleware to verify JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // 401

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403); // 403
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, role } = req.body;

    // Check if any users exist
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;

    if (userCount > 0) {
      // Require admin token if users already exist
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Only admins can register new users' });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
      const info = stmt.run(email, hashedPassword, name, role);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  // Appointment Routes
  app.get('/api/appointments/today', (req, res) => {
    // Usar la fecha local de Colombia (UTC-5)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
    const appointments = db.prepare(`
      SELECT a.*, u.name as worker_name 
      FROM appointments a 
      JOIN users u ON a.worker_id = u.id 
      WHERE a.date = ? AND a.status = 'pending'
      ORDER BY a.time ASC
    `).all(today);
    res.json(appointments);
  });

  app.get('/api/appointments/worker/:id', authenticateToken, (req: any, res) => {
    const workerId = req.params.id;
    if (req.user.role !== 'admin' && req.user.id != workerId) {
      return res.sendStatus(403);
    }
    const appointments = db.prepare('SELECT * FROM appointments WHERE worker_id = ? ORDER BY date DESC, time ASC').all(workerId);
    res.json(appointments);
  });

  app.post('/api/appointments', authenticateToken, (req: any, res) => {
    const { client_name, client_phone, service_name, price, date, time } = req.body;
    const worker_id = req.user.id;

    // Validación de fecha y hora (Bogotá)
    const now = new Date();
    const colombiaNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now);

    // El formato sv-SE devuelve "YYYY-MM-DD HH:mm" o "YYYY-MM-DD, HH:mm"
    const [currentDate, currentTimeRaw] = colombiaNow.split(/[,\s]+/);
    const currentTime = currentTimeRaw.substring(0, 5); // Asegurar HH:mm

    if (date < currentDate || (date === currentDate && time < currentTime)) {
      return res.status(400).json({ error: 'No se pueden agendar citas en el pasado' });
    }
    const stmt = db.prepare('INSERT INTO appointments (worker_id, client_name, client_phone, service_name, price, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(worker_id, client_name, client_phone, service_name, price, date, time);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.put('/api/appointments/:id', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const {
      status, payment_method, payment_proof,
      client_name, client_phone,
      service_name, price,
      date, time
    } = req.body;

    // Check ownership
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
    if (!appointment) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && appointment.worker_id !== req.user.id) {
      return res.sendStatus(403);
    }

    if (status) {
      const stmt = db.prepare('UPDATE appointments SET status = ?, payment_method = ?, payment_proof = ? WHERE id = ?');
      stmt.run(status, payment_method || appointment.payment_method, payment_proof || appointment.payment_proof, id);
    } else {
      const stmt = db.prepare('UPDATE appointments SET client_name = ?, client_phone = ?, service_name = ?, price = ?, date = ?, time = ? WHERE id = ?');
      stmt.run(client_name, client_phone, service_name, price, date, time, id);
    }

    res.json({ success: true });
  });

  // Admin Stats
  app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { startDate, endDate } = req.query;

    const workers = db.prepare("SELECT id, name FROM users WHERE role = 'worker'").all() as any[];
    const stats = workers.map(worker => {
      let appointmentsQuery = `
        SELECT 
          COUNT(*) as total_services,
          SUM(price) as total_revenue
        FROM appointments 
        WHERE worker_id = ? AND status = 'completed'
      `;
      let loansQuery = `
        SELECT SUM(amount) as total_loans 
        FROM loans 
        WHERE worker_id = ?
      `;
      let appointmentsParams = [worker.id];
      let loansParams = [worker.id];

      if (startDate && endDate) {
        appointmentsQuery += " AND date BETWEEN ? AND ?";
        appointmentsParams.push(startDate, endDate);
        loansQuery += " AND date BETWEEN ? AND ?";
        loansParams.push(startDate, endDate);
      }

      const data = db.prepare(appointmentsQuery).get(appointmentsParams) as any;
      const loansData = db.prepare(loansQuery).get(loansParams) as any;

      const total_revenue = Number(data.total_revenue || 0);
      const total_loans = Number(loansData.total_loans || 0);
      const worker_share = total_revenue * 0.5;

      return {
        id: worker.id,
        name: worker.name,
        total_services: Number(data.total_services || 0),
        total_revenue: total_revenue,
        worker_share: worker_share,
        spa_share: total_revenue * 0.5,
        total_loans: total_loans,
        net_worker_share: worker_share - total_loans
      };
    });

    res.json(stats);
  });

  // Worker Management
  app.get('/api/admin/workers', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const workers = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'worker'").all();
    res.json(workers);
  });

  app.delete('/api/admin/workers/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;

    // Check if worker has appointments
    const appointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE worker_id = ?').get(id) as any;
    if (appointments.count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una trabajadora con citas registradas' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Loan Management
  app.get('/api/loans', authenticateToken, (req: any, res) => {
    let query = `
      SELECT l.*, u.name as worker_name 
      FROM loans l 
      JOIN users u ON l.worker_id = u.id
    `;
    let params: any[] = [];

    if (req.user.role !== 'admin') {
      query += ' WHERE l.worker_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY l.date DESC';
    const loans = db.prepare(query).all(params);
    res.json(loans);
  });

  app.post('/api/loans', authenticateToken, (req: any, res) => {
    const { amount, observation, date } = req.body;
    const worker_id = req.user.id;
    const stmt = db.prepare('INSERT INTO loans (worker_id, amount, observation, date) VALUES (?, ?, ?, ?)');
    const info = stmt.run(worker_id, amount, observation, date);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  app.delete('/api/loans/:id', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id) as any;

    if (!loan) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && loan.worker_id !== req.user.id) {
      return res.sendStatus(403);
    }

    db.prepare('DELETE FROM loans WHERE id = ?').run(id);
    res.json({ success: true });
  });
  app.get('/api/services', (req, res) => {
    const services = db.prepare('SELECT * FROM services ORDER BY name ASC').all();
    res.json(services);
  });

  app.post('/api/services', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, price } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO services (name, price) VALUES (?, ?)');
      const info = stmt.run(name, price);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(400).json({ error: 'El servicio ya existe' });
    }
  });

  app.delete('/api/services/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Financials
  app.get('/api/admin/financials', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const appointments = db.prepare(`
      SELECT a.*, u.name as worker_name 
      FROM appointments a 
      JOIN users u ON a.worker_id = u.id 
      WHERE a.status = 'completed'
      ORDER BY a.date DESC, a.time DESC
    `).all();

    const loans = db.prepare(`
      SELECT l.*, u.name as worker_name 
      FROM loans l 
      JOIN users u ON l.worker_id = u.id 
      ORDER BY l.date DESC
    `).all();

    res.json({ appointments, loans });
  });

  app.get('/api/admin/monthly-history', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const history = db.prepare(`
      WITH monthly_revenue AS (
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(price) as gross_revenue,
          SUM(price) * 0.5 as worker_share
        FROM appointments 
        WHERE status = 'completed'
        GROUP BY month
      ),
      monthly_loans AS (
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(amount) as total_loans
        FROM loans
        GROUP BY month
      )
      SELECT 
        r.month,
        r.gross_revenue,
        r.worker_share,
        (r.gross_revenue * 0.5) as spa_profit,
        COALESCE(l.total_loans, 0) as total_loans,
        (r.worker_share - COALESCE(l.total_loans, 0)) as net_worker_pay
      FROM monthly_revenue r
      LEFT JOIN monthly_loans l ON r.month = l.month
      ORDER BY r.month DESC
    `).all();

    res.json(history);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

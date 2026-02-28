import express from 'express';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'nail-spa-secret-key';
const MONGODB_URI = process.env.MONGODB_URI;

// Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'worker'], required: true }
});
UserSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; } });
const User = mongoose.model('User', UserSchema);

const AppointmentSchema = new mongoose.Schema({
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client_name: { type: String },
  client_phone: { type: String },
  service_name: { type: String },
  price: { type: Number },
  date: { type: String },
  time: { type: String },
  status: { type: String, default: 'pending' },
  payment_method: { type: String },
  payment_proof: { type: String }
});
AppointmentSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; } });
const Appointment = mongoose.model('Appointment', AppointmentSchema);

const ServiceSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  price: { type: Number, required: true }
});
ServiceSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; } });
const Service = mongoose.model('Service', ServiceSchema);

const LoanSchema = new mongoose.Schema({
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  observation: { type: String },
  date: { type: String }
});
LoanSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; } });
const Loan = mongoose.model('Loan', LoanSchema);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  const userCount = await User.countDocuments();
  if (userCount > 0) {
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
    const newUser = await User.create({ email, password: hashedPassword, name, role });
    res.status(201).json({ id: newUser._id });
  } catch (error) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
});

app.get('/api/auth/can-register', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ canRegister: userCount === 0 });
  } catch (err) {
    res.json({ canRegister: false });
  }
});

// Appointment Routes
app.get('/api/appointments/today', async (req, res) => {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
  const appointments = await Appointment.find({ date: today, status: 'pending' })
    .populate('worker_id', 'name')
    .sort({ time: 1 });
  const formatted = appointments.map((a: any) => ({
    ...a.toJSON(),
    worker_name: a.worker_id?.name
  }));
  res.json(formatted);
});

app.get('/api/appointments/worker/:id', authenticateToken, async (req: any, res) => {
  const workerId = req.params.id;
  if (req.user.role !== 'admin' && req.user.id !== workerId) {
    return res.sendStatus(403);
  }
  const appointments = await Appointment.find({ worker_id: workerId }).sort({ date: -1, time: 1 });
  res.json(appointments);
});

app.post('/api/appointments', authenticateToken, async (req: any, res) => {
  const { client_name, client_phone, service_name, price, date, time } = req.body;
  const worker_id = req.user.id;
  try {
    const newAppointment = await Appointment.create({ worker_id, client_name, client_phone, service_name, price, date, time });
    res.status(201).json({ id: newAppointment._id });
  } catch (err) {
    res.status(500).json({ error: 'Error creating appointment' });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { status, payment_method, payment_proof, client_name, client_phone, service_name, price, date, time } = req.body;
  const appointment = await Appointment.findById(id);
  if (!appointment) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && appointment.worker_id.toString() !== req.user.id) {
    return res.sendStatus(403);
  }
  if (status) {
    appointment.status = status;
    appointment.payment_method = payment_method || appointment.payment_method;
    appointment.payment_proof = payment_proof || appointment.payment_proof;
  } else {
    appointment.client_name = client_name;
    appointment.client_phone = client_phone;
    appointment.service_name = service_name;
    appointment.price = price;
    appointment.date = date;
    appointment.time = time;
  }
  await appointment.save();
  res.json({ success: true });
});

// Admin Stats
app.get('/api/admin/stats', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { startDate, endDate } = req.query;
  const workers = await User.find({ role: 'worker' });
  const stats = await Promise.all(workers.map(async (worker) => {
    let appointmentsMatch: any = { worker_id: worker._id, status: 'completed' };
    let loansMatch: any = { worker_id: worker._id };
    if (startDate && endDate) {
      appointmentsMatch.date = { $gte: startDate, $lte: endDate };
      loansMatch.date = { $gte: startDate, $lte: endDate };
    }
    const appointmentsInfo = await Appointment.aggregate([
      { $match: appointmentsMatch },
      { $group: { _id: null, total_services: { $sum: 1 }, total_revenue: { $sum: "$price" } } }
    ]);
    const loansInfo = await Loan.aggregate([
      { $match: loansMatch },
      { $group: { _id: null, total_loans: { $sum: "$amount" } } }
    ]);
    const total_revenue = appointmentsInfo[0]?.total_revenue || 0;
    const total_loans = loansInfo[0]?.total_loans || 0;
    const worker_share = total_revenue * 0.5;
    return {
      id: worker._id,
      name: worker.name,
      total_services: appointmentsInfo[0]?.total_services || 0,
      total_revenue: total_revenue,
      worker_share: worker_share,
      spa_share: total_revenue * 0.5,
      total_loans: total_loans,
      net_worker_share: worker_share - total_loans
    };
  }));
  res.json(stats);
});

// Other Admin Routes
app.get('/api/admin/workers', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const workers = await User.find({ role: 'worker' }).select('-password');
  res.json(workers);
});

app.delete('/api/admin/workers/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { id } = req.params;
  const aptCount = await Appointment.countDocuments({ worker_id: id });
  if (aptCount > 0) return res.status(400).json({ error: 'No se puede eliminar una trabajadora con citas registradas' });
  await User.findByIdAndDelete(id);
  res.json({ success: true });
});

// Loans
app.get('/api/loans', authenticateToken, async (req: any, res) => {
  let query: any = {};
  if (req.user.role !== 'admin') query.worker_id = req.user.id;
  const loans = await Loan.find(query).populate('worker_id', 'name').sort({ date: -1 });
  const formatted = loans.map((l: any) => ({ ...l.toJSON(), worker_name: l.worker_id?.name }));
  res.json(formatted);
});

app.post('/api/loans', authenticateToken, async (req: any, res) => {
  const { amount, observation, date } = req.body;
  const worker_id = req.user.id;
  try {
    const newLoan = await Loan.create({ worker_id, amount, observation, date });
    res.status(201).json({ id: newLoan._id });
  } catch (err) { res.status(500).json({ error: 'Error creating loan' }); }
});

app.delete('/api/loans/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const loan = await Loan.findById(id);
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && loan.worker_id.toString() !== req.user.id) return res.sendStatus(403);
  await Loan.findByIdAndDelete(id);
  res.json({ success: true });
});

// Services
app.get('/api/services', async (req, res) => {
  const services = await Service.find().sort({ name: 1 });
  res.json(services);
});

app.post('/api/services', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, price } = req.body;
  try {
    const newService = await Service.create({ name, price });
    res.status(201).json({ id: newService._id });
  } catch (error) { res.status(400).json({ error: 'El servicio ya existe' }); }
});

app.delete('/api/services/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { id } = req.params;
  await Service.findByIdAndDelete(id);
  res.json({ success: true });
});

// Financials
app.get('/api/admin/financials', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const appointments = await Appointment.find({ status: 'completed' }).populate('worker_id', 'name').sort({ date: -1, time: -1 });
  const loans = await Loan.find().populate('worker_id', 'name').sort({ date: -1 });
  res.json({
    appointments: appointments.map((a: any) => ({ ...a.toJSON(), worker_name: a.worker_id?.name })),
    loans: loans.map((l: any) => ({ ...l.toJSON(), worker_name: l.worker_id?.name }))
  });
});

app.get('/api/admin/monthly-history', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const history = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { $substr: ["$date", 0, 7] }, gross_revenue: { $sum: "$price" } } },
      { $sort: { _id: -1 } }
    ]);
    const loansHistory = await Loan.aggregate([
      { $group: { _id: { $substr: ["$date", 0, 7] }, total_loans: { $sum: "$amount" } } }
    ]);
    const combined = history.map(h => {
      const loans = loansHistory.find(l => l._id === h._id);
      const gross = h.gross_revenue;
      const total_loans = loans?.total_loans || 0;
      const worker_share = gross * 0.5;
      return { month: h._id, gross_revenue: gross, worker_share: worker_share, spa_profit: gross * 0.5, total_loans: total_loans, net_worker_pay: worker_share - total_loans };
    });
    res.json(combined);
  } catch (err) { res.status(500).json({ error: 'Error calculating monthly history' }); }
});

// Vite/Static Serving
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'dist', 'index.html')); });
}

if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => { console.log(`Server running on port ${PORT}`); });
}

export default app;

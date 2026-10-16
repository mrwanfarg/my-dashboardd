import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import tasksRoutes from './routes/tasksRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import weeklyRoutes from './routes/weeklyRoutes.js';
import notesRoutes from './routes/notesRoutes.js';
import timerRoutes from './routes/timerRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'Second Brain API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/tasks', tasksRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/weekly', weeklyRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/timers', timerRoutes);
app.use('/api/stats', statsRoutes);

// Static frontend serving
app.use(express.static(FRONTEND_DIR));
app.use(express.static(ROOT_DIR));

// Fallback to frontend index.html for SPA-like navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ Second Brain Full-Stack Server Running`);
  console.log(`------------------------------------------------------`);
  console.log(`Local Access:      http://localhost:${PORT}`);
  console.log(`API Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`API Tasks Base:    http://localhost:${PORT}/api/tasks`);
  console.log(`Frontend Assets:   ${FRONTEND_DIR}`);
  console.log(`======================================================\n`);
});

export default app;

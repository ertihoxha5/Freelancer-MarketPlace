import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const VITE_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && VITE_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API is running');
});

app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/chat', chatRoutes);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Internal server error.' });
});

export default app;

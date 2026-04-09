import express from 'express';
import { db } from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = 3000;

const VITE_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

/** Explicit CORS (preflight + simple requests). Avoids express@5 + cors quirks on OPTIONS. */
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

app.get("/", (req, res) => {
    res.send("API is running");
});

app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
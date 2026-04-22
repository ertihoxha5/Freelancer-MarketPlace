import http from 'http';
import app from './app.js';
import './config/db.js';
import { initSocketServer } from './socket/index.js';

const PORT = Number(process.env.PORT) || 3000;

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
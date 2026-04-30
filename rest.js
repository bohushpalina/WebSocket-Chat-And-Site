import express from 'express';
import bodyParser from 'body-parser';
import path from 'node:path';

export const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.resolve('views')); // 🔥 ВАЖНО

// --- ITEMS НЕ ТРОГАЮ (оставил как есть) ---
import {
    getAll, create, updateById,
    deleteById, getFilteredData
} from './store.js';

// API
app.get('/items', async (req, res) => {
    res.json(await getAll());
});

app.post('/items', async (req, res) => {
    res.json(await create(req.body));
});

app.delete('/items/:id', async (req, res) => {
    const ok = await deleteById(req.params.id);
    ok ? res.sendStatus(204) : res.sendStatus(404);
});

app.put('/items/:id', async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description)
        return res.status(400).json({ error: 'empty' });

    const updated = await updateById(req.params.id, { title, description });
    updated ? res.json(updated) : res.sendStatus(404);
});

// --- HOME ---
app.get('/', async (req, res) => {
    const result = await getFilteredData(req.query);
    res.render('index', result);
});

// 💀 FIX CHAT ROUTE
app.get('/chat', (req, res) => {
    res.render('chat'); // теперь НЕ ломается, если views/chat.ejs существует
});

app.get('/chat/login', (req, res) => {
    res.render('chat-login');
});

app.get('/chat/room', (req, res) => {
    res.render('chat-room');
});

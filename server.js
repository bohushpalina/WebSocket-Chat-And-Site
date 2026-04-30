import http from 'node:http';
import { Server } from 'socket.io';
import { app } from './rest.js';

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

// ===== STORAGE =====
const users = new Map();           // socket.id -> { name, role, room }
const blockedUsers = new Set();    // usernames
let chatHistory = [];              // все сообщения
let rooms = [
    { id: '1', name: 'Общая', private: false },
    { id: '2', name: 'Новости', private: false }
];

// ===== SOCKET =====
io.on('connection', (socket) => {

    socket.on('get_rooms', () => {
        socket.emit('room_list', rooms);
    });

    socket.emit('room_list', rooms);

    // JOIN ROOM
    socket.on('join', ({ name, role = 'User', room }) => {
        if (blockedUsers.has(name)) {
            socket.emit('error_msg', 'Ваш доступ ограничен (BAN).');
            return;
        }

        const roomExists = rooms.find(r => r.name === room);
        if (!roomExists) {
            socket.emit('error_msg', 'Комната не существует');
            return;
        }

        socket.join(room);
        users.set(socket.id, { name, role, room });

        // Отправляем историю вошедшему пользователю
        socket.emit('init_history', chatHistory.filter(m => m.room === room));

        const sysMsg = {
            id: 'sys-' + Date.now(),
            name: 'SYSTEM',
            text: `${name} вошел в отдел ${room}`,
            room,
            system: true
        };

        chatHistory.push(sysMsg);
        io.to(room).emit('chat_message', sysMsg);
    });

    // РЕДАКТИРОВАНИЕ КОМНАТЫ
    socket.on('edit_room', ({ id, newName }) => {
        const user = users.get(socket.id);
        if (user?.role !== 'Admin') return;

        const room = rooms.find(r => r.id === id);
        if (room) {
            if (room.name === user.room) {
                socket.emit('error_msg', 'ОШИБКА: Нельзя перей переименовать отдел, в котором вы сейчас находитесь!');
                return;
            }

            const oldName = room.name;
            room.name = newName;

            chatHistory.forEach(m => {
                if (m.room === oldName) {
                    m.room = newName;
                }
            });

            io.emit('room_list', rooms);
            io.emit('room_renamed', { oldName, newName });
        }
    });

    // ОЧИСТКА ИСТОРИИ
    socket.on('admin_clear_history', (roomName) => {
        const user = users.get(socket.id);
        if (user?.role !== 'Admin') return;

        chatHistory = chatHistory.filter(m => m.room !== roomName);

        io.to(roomName).emit('init_history', []);

        const clearMsg = {
            id: 'sys-' + Date.now(),
            name: 'SYSTEM',
            text: `Внимание: история сообщений отдела "${roomName}" была полностью очищена администратором.`,
            room: roomName,
            system: true
        };
        chatHistory.push(clearMsg);
        io.to(roomName).emit('chat_message', clearMsg);
    });

    // УДАЛЕНИЕ КОМНАТЫ
    socket.on('delete_room', (id) => {
        const user = users.get(socket.id);
        if (user?.role !== 'Admin') return;

        const roomToDelete = rooms.find(r => r.id === id);
        if (roomToDelete && roomToDelete.name === user.room) {
            socket.emit('error_msg', 'ОШИБКА: Нельзя удалить отдел, пока вы в нем работаете!');
            return;
        }

        rooms = rooms.filter(r => r.id !== id);
        io.emit('room_list', rooms);
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_message', (text) => {
        const user = users.get(socket.id);
        if (!user || blockedUsers.has(user.name)) return;

        const msg = {
            id: Date.now().toString(),
            name: user.name,
            role: user.role,
            text,
            room: user.room,
            system: false
        };

        chatHistory.push(msg);
        io.to(user.room).emit('chat_message', msg);
    });

    // УДАЛЕНИЕ СООБЩЕНИЯ
    socket.on('admin_delete', ({ msgId, room }) => {
        const user = users.get(socket.id);
        if (user?.role !== 'Admin') return;

        chatHistory = chatHistory.filter(m => m.id !== msgId);
        io.to(room).emit('delete_message', msgId);
    });

    // БАН
    // БАН
    socket.on('admin_block', (username) => {
        const adminUser = users.get(socket.id);
        if (adminUser?.role !== 'Admin') return;

        // ЗАЩИТА: Получаем данные пользователя по имени, чтобы проверить ID
        let targetId = null;
        for (let [id, u] of users.entries()) {
            if (u.name === username) {
                targetId = id;
                break;
            }
        }

        // Защита от самобана (сравниваем socket.id текущего и целевого пользователя)
        if (targetId && targetId === socket.id) {
            socket.emit('error_msg', 'ОШИБКА: Вы не можете заблокировать самого себя!');
            return;
        }

        if (username === adminUser.name) {
            socket.emit('error_msg', 'ОШИБКА: Вы не можете заблокировать самого себя!');
            return;
        }

        blockedUsers.add(username);

        // Находим сокет пользователя и выкидываем его в реальном времени
        for (let [id, u] of users.entries()) {
            if (u.name === username) {
                const targetSocket = io.sockets.sockets.get(id);
                if (targetSocket) {
                    targetSocket.emit('error_msg', 'Вы были заблокированы администратором.');
                    targetSocket.disconnect();
                }
            }
        }

        io.emit('chat_message', { 
            id: 'sys-' + Date.now(), 
            system: true, 
            text: `Сотрудник ${username} заблокирован.` 
        });
    });

    socket.on('create_room', (name) => {
        const user = users.get(socket.id);
        if (user?.role !== 'Admin') return;
        const newRoom = { id: Date.now().toString(), name, private: false };
        rooms.push(newRoom);
        io.emit('room_list', rooms);
    });

    socket.on('disconnect', () => {
        users.delete(socket.id);
    });
});

server.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
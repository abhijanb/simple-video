import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import Call from "./models/call.js"
import dbConnect from "./config/dbConnect.js"

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

let waitingQueue = [];               // has socket ids waiting for a partner
let partnerMap = {};                 // has socketId -> partnerSocketId {socketId: partnerSocketId}
let activeCalls = {};                // has callId -> { user1, user2, startTime } {callId: {user1, user2, startTime}}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', async () => {
        if (waitingQueue.includes(socket.id)) return;
        if (waitingQueue.length > 0) {
            const partnerId = waitingQueue.shift();
            const roomId = `${partnerId}-${socket.id}`;
            partnerMap[socket.id] = partnerId;
            partnerMap[partnerId] = socket.id;

            // Create call record in DB
            const call = new Call({
                user1SocketId: partnerId,
                user2SocketId: socket.id,
            });
            await call.save();
            activeCalls[roomId] = {
                user1: partnerId,
                user2: socket.id,
                callId: call._id,
            };

            // Notify both users
            io.to(partnerId).emit('matched', { partnerId: socket.id, roomId });
            io.to(socket.id).emit('matched', { partnerId, roomId });
        } else {
            // Add to queue
            waitingQueue.push(socket.id);
            socket.emit('waiting');
        }
    });

    socket.on('offer', ({ to, offer }) => {
        io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
        io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('next', () => {
        handleDisconnect(socket, true);
        waitingQueue.push(socket.id);
        socket.emit('waiting');
    });

    socket.on('end', () => {
        handleDisconnect(socket, false);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket, false);
    });

    async function handleDisconnect(socket, isNext) {
        const partnerId = partnerMap[socket.id];

        const index = waitingQueue.indexOf(socket.id);
        if (index !== -1) waitingQueue.splice(index, 1);

        if (partnerId) {
            io.to(partnerId).emit('partner-disconnected');

            const roomId = Object.keys(activeCalls).find(
                (id) =>
                    activeCalls[id].user1 === socket.id ||
                    activeCalls[id].user2 === socket.id
            );
            if (roomId) {
                const call = activeCalls[roomId];
                await Call.findByIdAndUpdate(call.callId, { endTime: new Date() });
                delete activeCalls[roomId];
            }

            delete partnerMap[socket.id];
            delete partnerMap[partnerId];
        }
    }
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await dbConnect()
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.log(error)
    }
}
startServer()
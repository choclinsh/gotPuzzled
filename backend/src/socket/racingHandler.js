/**
 * racingHandler.js — Socket.IO handler for the Racing (head-to-head) puzzle mode.
 *
 * Matchmaking flow:
 *  1. Player emits `join_race_queue` with their preferences (pieces, rounds, topic).
 *  2. If the queue is empty they are added and receive `waiting_for_race_partner`.
 *  3. When a second player arrives with matching pieces/rounds they are paired.
 *  4. The server fetches each player's topic images independently (so each player
 *     solves a different set of images) and emits `race_started` privately to each.
 *  5. Players solve their own board simultaneously. As pieces are placed correctly
 *     the client emits `update_race_progress` so the opponent's progress bar updates.
 *  6. The first client to finish all rounds emits `submit_race_win`. The server
 *     sets `room.finished = true`, calculates the elapsed time, and broadcasts
 *     `race_over` with the winner/loser socket IDs.
 */
const { fetchPexelsImages } = require('../utils/pexelsService');
const { shuffle } = require('../utils/shuffle');

const raceQueue = [];  // pending players: [{ socketId, userId, username, pieces, rounds, topic }]
const raceRooms = {};  // active rooms:    roomId → room state object

/**
 * Registers all racing Socket.IO event listeners on the given server instance.
 * Called once at startup in server.js.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 */
module.exports = function setupRacingSocket(io) {
    io.on('connection', (socket) => {

        /**
         * Event: `join_race_queue`
         * Emitted by a player who wants to start a race. Checks the queue for a
         * compatible partner (matching pieces and rounds). If found, pairs them
         * immediately; otherwise, adds the player to the queue and waits.
         *
         * @param {object} payload
         * @param {number} payload.userId   - The player's DB user ID.
         * @param {string} payload.username - Display name shown to the opponent.
         * @param {number} payload.pieces   - Number of puzzle pieces.
         * @param {number} payload.rounds   - Number of rounds.
         * @param {string} payload.topic    - Free-text image topic the player typed.
         */
        socket.on('join_race_queue', async ({ userId, username, pieces, rounds, topic }) => {
            // Remove any stale entry for this socket (reconnection safety)
            const stale = raceQueue.findIndex(p => p.socketId === socket.id);
            if (stale !== -1) raceQueue.splice(stale, 1);

            // Look for a waiting player with identical pieces and rounds
            const matchIdx = raceQueue.findIndex(p => p.pieces === pieces && p.rounds === rounds);

            if (matchIdx !== -1) {
                // Partner found — dequeue them and build the room
                const partner = raceQueue.splice(matchIdx, 1)[0];
                let p1Images, p2Images;
                try {
                    // Each player gets their own topic's images — independent boards
                    [p1Images, p2Images] = await Promise.all([
                        fetchPexelsImages(partner.topic, rounds),
                        fetchPexelsImages(topic, rounds),
                    ]);
                } catch (err) {
                    // Image fetch failed — notify both players and re-queue the partner
                    const errPayload = { message: err.message };
                    socket.emit('match_error', errPayload);
                    io.sockets.sockets.get(partner.socketId)?.emit('match_error', errPayload);
                    raceQueue.push({ socketId: partner.socketId, userId: partner.userId, username: partner.username, pieces, rounds, topic: partner.topic });
                    io.sockets.sockets.get(partner.socketId)?.emit('waiting_for_race_partner');
                    console.error(`[race] image fetch failed (topics: "${partner.topic}" + "${topic}"):`, err.message);
                    return;
                }

                const roomId = `race_${partner.socketId}_${socket.id}`;

                raceRooms[roomId] = {
                    players: [
                        { socketId: partner.socketId, userId: partner.userId, username: partner.username },
                        { socketId: socket.id, userId, username },
                    ],
                    pieces,
                    rounds,
                    startTime: Date.now(),
                    finished: false, // prevents double-win if both finish at the same tick
                    playerProgress: {
                        [partner.socketId]: 0,
                        [socket.id]: 0,
                    },
                };

                socket.join(roomId);
                const partnerSocket = io.sockets.sockets.get(partner.socketId);
                if (partnerSocket) partnerSocket.join(roomId);

                // Base payload shared by both race_started emissions
                const basePayload = { roomId, pieces, rounds, players: raceRooms[roomId].players };

                // Each player receives ONLY their own images and a freshly shuffled piece bank
                socket.emit('race_started', {
                    ...basePayload,
                    images: p2Images,
                    sourcePieces: shuffle(Array.from({ length: pieces }, (_, i) => i)),
                });
                if (partnerSocket) {
                    partnerSocket.emit('race_started', {
                        ...basePayload,
                        images: p1Images,
                        sourcePieces: shuffle(Array.from({ length: pieces }, (_, i) => i)),
                    });
                }

                console.log(`[race] room created: ${roomId} | topics: "${partner.topic}" + "${topic}" | ${pieces} pieces × ${rounds} rounds`);
            } else {
                // No partner yet — add to queue and tell the client to show the lobby spinner
                raceQueue.push({ socketId: socket.id, userId, username, pieces, rounds, topic });
                socket.emit('waiting_for_race_partner');
                console.log(`[race] ${username} queued | topic: "${topic}" | ${pieces} pieces × ${rounds} rounds`);
            }
        });

        /**
         * Event: `update_race_progress`
         * Forwarded from the active player after each piece placement so the
         * opponent's progress bar can update in real time. The server only relays
         * the count to the other client — no win validation here.
         *
         * @param {object} payload
         * @param {string} payload.roomId        - The room this update belongs to.
         * @param {number} payload.piecesCorrect - Total pieces correctly placed so far.
         */
        socket.on('update_race_progress', ({ roomId, piecesCorrect }) => {
            const room = raceRooms[roomId];
            if (!room || room.finished) return;
            room.playerProgress[socket.id] = piecesCorrect;
            // Only the opponent needs this event; use socket.to() (excludes sender)
            socket.to(roomId).emit('opponent_progress_update', { piecesCorrect });
        });

        /**
         * Event: `submit_race_win`
         * Emitted by the first client to finish all rounds. The server marks the
         * room as finished (preventing a double-win), calculates elapsed time, and
         * broadcasts `race_over` to both players with the winner and loser IDs.
         *
         * @param {object} payload
         * @param {string} payload.roomId - The room the win claim is for.
         */
        socket.on('submit_race_win', ({ roomId }) => {
            const room = raceRooms[roomId];
            if (!room || room.finished) return; // guard against race condition

            room.finished = true; // lock the room so the slower player can't also "win"

            const finalTime = Math.floor((Date.now() - room.startTime) / 1000);
            const loser = room.players.find(p => p.socketId !== socket.id);

            io.to(roomId).emit('race_over', {
                winnerId:  socket.id,
                loserId:   loser?.socketId,
                finalTime,
            });

            delete raceRooms[roomId];
            console.log(`[race] room ${roomId} finished in ${finalTime}s — winner: ${socket.id}`);
        });

        /**
         * Event: `cancel_race_queue`
         * Remove this socket from the wait queue (e.g. player clicked "Cancel").
         */
        socket.on('cancel_race_queue', () => {
            const idx = raceQueue.findIndex(p => p.socketId === socket.id);
            if (idx !== -1) raceQueue.splice(idx, 1);
        });

        /**
         * Event: `disconnect` (built-in)
         * Remove the socket from the queue and, if in an active room, notify the
         * opponent and clean up the room.
         */
        socket.on('disconnect', () => {
            const qIdx = raceQueue.findIndex(p => p.socketId === socket.id);
            if (qIdx !== -1) raceQueue.splice(qIdx, 1);

            for (const [roomId, room] of Object.entries(raceRooms)) {
                if (room.players.some(p => p.socketId === socket.id)) {
                    if (!room.finished) socket.to(roomId).emit('race_opponent_disconnected');
                    delete raceRooms[roomId];
                    console.log(`[race] room ${roomId} closed (player disconnected)`);
                    break;
                }
            }
        });
    });
};

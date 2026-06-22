/**
 * coopHandler.js — Socket.IO handler for the Co-op puzzle game mode.
 *
 * Matchmaking flow:
 *  1. Player emits `find_coop_match` with their preferences (pieces, rounds, topic).
 *  2. If the queue is empty they are added and receive `waiting_for_partner`.
 *  3. When a second player arrives with matching pieces/rounds they are paired.
 *  4. The server fetches images for both topics, interleaves them (one image per
 *     player per round), and emits `match_started` with the shared board state.
 *  5. Players alternate turns (`currentTurn` tracks whose turn it is). The active
 *     player emits `make_move` or `remove_piece`; the server validates and
 *     broadcasts `turn_update` to both.
 *  6. When the board is solved the server checks whether more rounds remain.
 *     - More rounds → `next_round` is emitted with a fresh shuffled piece bank.
 *     - Final round complete → `coop_victory` is emitted and the room is deleted.
 */
const { fetchPexelsImages } = require('../utils/pexelsService');
const { shuffle } = require('../utils/shuffle');

const queue = [];  // pending players: [{ socketId, userId, username, pieces, rounds, topic }]
const rooms = {};  // active rooms:    roomId → room state object

/**
 * Registers all co-op Socket.IO event listeners on the given server instance.
 * Called once at startup in server.js.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 */
module.exports = function setupCoopSocket(io) {
    io.on('connection', (socket) => {
        console.log(`[coop] socket connected: ${socket.id}`);

        /**
         * Event: `find_coop_match`
         * Emitted by a player who wants to start a co-op game. Checks the queue
         * for a compatible partner (same pieces and rounds count). If found, pairs
         * them immediately; otherwise, adds the player to the queue and waits.
         *
         * @param {object} payload
         * @param {number} payload.userId   - The player's DB user ID.
         * @param {string} payload.username - Display name shown to the partner.
         * @param {number} payload.pieces   - Number of puzzle pieces (e.g. 6, 12, 25).
         * @param {number} payload.rounds   - Number of rounds for this match.
         * @param {string} payload.topic    - Free-text image topic the player typed.
         */
        socket.on('find_coop_match', async ({ userId, username, pieces, rounds, topic }) => {
            // Remove any stale queue entry for this socket (reconnection safety)
            const staleIdx = queue.findIndex(p => p.socketId === socket.id);
            if (staleIdx !== -1) queue.splice(staleIdx, 1);

            // Look for a waiting player with identical pieces and rounds
            const matchIdx = queue.findIndex(p => p.pieces === pieces && p.rounds === rounds);

            if (matchIdx !== -1) {
                // Partner found — dequeue them and build the room
                const partner = queue.splice(matchIdx, 1)[0];
                let images;
                try {
                    // Fetch each player's topic images in parallel for speed
                    const [imagesP1, imagesP2] = await Promise.all([
                        fetchPexelsImages(partner.topic, rounds),
                        fetchPexelsImages(topic, rounds),
                    ]);

                    // Interleave images: odd rounds use P1's topic, even rounds use P2's.
                    // A Set prevents the same URL appearing twice if topics overlap.
                    const seen = new Set();
                    const blended = [];
                    const len = Math.max(imagesP1.length, imagesP2.length);
                    for (let i = 0; i < len && blended.length < rounds; i++) {
                        if (i < imagesP1.length && !seen.has(imagesP1[i])) {
                            seen.add(imagesP1[i]);
                            blended.push(imagesP1[i]);
                        }
                        if (blended.length < rounds && i < imagesP2.length && !seen.has(imagesP2[i])) {
                            seen.add(imagesP2[i]);
                            blended.push(imagesP2[i]);
                        }
                    }
                    images = blended;
                } catch (err) {
                    // Image fetch failed — notify both players and re-queue the partner
                    const errPayload = { message: err.message };
                    socket.emit('match_error', errPayload);
                    io.sockets.sockets.get(partner.socketId)?.emit('match_error', errPayload);
                    queue.push({ socketId: partner.socketId, userId: partner.userId, username: partner.username, pieces, rounds, topic: partner.topic });
                    io.sockets.sockets.get(partner.socketId)?.emit('waiting_for_partner');
                    console.error(`[coop] image fetch failed (topics: "${partner.topic}" + "${topic}"):`, err.message);
                    return;
                }

                // Build initial board state: all cells empty, all pieces in the bank
                const sourcePieces = shuffle(Array.from({ length: pieces }, (_, i) => i));
                const boardState   = Array(pieces).fill(null);
                const roomId       = `room_${partner.socketId}_${socket.id}`;

                rooms[roomId] = {
                    players: [
                        { socketId: partner.socketId, userId: partner.userId, username: partner.username },
                        { socketId: socket.id, userId, username },
                    ],
                    boardState,
                    sourcePieces,
                    currentTurn: partner.socketId, // the waiting player goes first
                    startTime: Date.now(),
                    pieces,
                    rounds,
                    currentRound: 1,
                    imageIndex: 0,
                    images,
                };

                socket.join(roomId);
                const partnerSocket = io.sockets.sockets.get(partner.socketId);
                if (partnerSocket) partnerSocket.join(roomId);

                // Broadcast everything both clients need to render the first round
                io.to(roomId).emit('match_started', {
                    roomId,
                    pieces,
                    rounds,
                    currentRound: 1,
                    imageIndex: 0,
                    images,
                    sourcePieces,
                    boardState,
                    currentTurn: partner.socketId,
                    players: rooms[roomId].players,
                });

                console.log(`[coop] room created: ${roomId} | topics: "${partner.topic}" + "${topic}" | ${pieces} pieces × ${rounds} rounds`);
            } else {
                // No partner yet — add to queue and tell the client to show the lobby spinner
                queue.push({ socketId: socket.id, userId, username, pieces, rounds, topic });
                socket.emit('waiting_for_partner');
                console.log(`[coop] ${username} queued | topic: "${topic}" | ${pieces} pieces × ${rounds} rounds`);
            }
        });

        /**
         * Event: `make_move`
         * Place a piece from the bank into an empty board cell. Guards:
         * - The room must exist.
         * - Only the player whose turn it is may move.
         * - The target cell must be empty.
         * After placing, turn switches and the updated state is broadcast. If
         * every cell now holds its correct piece the round (or game) ends.
         *
         * @param {object} payload
         * @param {string} payload.roomId       - The room this move belongs to.
         * @param {number} payload.cellIndex    - Board cell position (0-based).
         * @param {number} payload.correctIndex - The piece's correct position index.
         */
        socket.on('make_move', ({ roomId, cellIndex, correctIndex }) => {
            const room = rooms[roomId];
            if (!room) return;
            if (room.currentTurn !== socket.id) return; // not this player's turn
            if (room.boardState[cellIndex] !== null) return; // cell already occupied

            // Apply the move and remove the piece from the source bank
            room.boardState[cellIndex] = correctIndex;
            room.sourcePieces = room.sourcePieces.filter(p => p !== correctIndex);

            // Switch turn to the other player
            const other = room.players.find(p => p.socketId !== socket.id);
            room.currentTurn = other.socketId;

            // A win occurs when every cell holds its own index (cell 0 has piece 0, etc.)
            const isWin = room.boardState.every((piece, idx) => piece !== null && piece === idx);

            if (isWin) {
                if (room.currentRound >= room.rounds) {
                    // All rounds complete — game over
                    const finalTime = Math.floor((Date.now() - room.startTime) / 1000);
                    io.to(roomId).emit('coop_victory', { finalTime });
                    delete rooms[roomId];
                    console.log(`[coop] room ${roomId} completed in ${finalTime}s`);
                } else {
                    // Advance to next round with a fresh shuffled piece bank
                    room.currentRound++;
                    room.imageIndex    = room.currentRound - 1;
                    room.sourcePieces  = shuffle(Array.from({ length: room.pieces }, (_, i) => i));
                    room.boardState    = Array(room.pieces).fill(null);

                    io.to(roomId).emit('next_round', {
                        currentRound: room.currentRound,
                        totalRounds:  room.rounds,
                        imageIndex:   room.imageIndex,
                        sourcePieces: room.sourcePieces,
                        boardState:   room.boardState,
                        currentTurn:  room.currentTurn,
                    });

                    console.log(`[coop] room ${roomId} advanced to round ${room.currentRound}/${room.rounds}`);
                }
            } else {
                // Game continues — push the updated board to both clients
                io.to(roomId).emit('turn_update', {
                    boardState:   room.boardState,
                    sourcePieces: room.sourcePieces,
                    currentTurn:  room.currentTurn,
                });
            }
        });

        /**
         * Event: `remove_piece`
         * Return a placed piece from the board back to the source bank. Guards:
         * - The room must exist.
         * - Only the active player may remove.
         * - The target cell must be occupied.
         * Turn switches after the removal so the partner can place next.
         *
         * @param {object} payload
         * @param {string} payload.roomId    - The room this action belongs to.
         * @param {number} payload.cellIndex - Board cell position to clear.
         */
        socket.on('remove_piece', ({ roomId, cellIndex }) => {
            const room = rooms[roomId];
            if (!room) return;
            if (room.currentTurn !== socket.id) return;
            if (room.boardState[cellIndex] === null) return; // nothing to remove

            // Return the piece to the bank and clear the cell
            const correctIndex = room.boardState[cellIndex];
            room.boardState[cellIndex] = null;
            room.sourcePieces.push(correctIndex);

            // Switch turn to the other player
            const other = room.players.find(p => p.socketId !== socket.id);
            room.currentTurn = other.socketId;

            io.to(roomId).emit('turn_update', {
                boardState:   room.boardState,
                sourcePieces: room.sourcePieces,
                currentTurn:  room.currentTurn,
            });
        });

        /**
         * Event: `cancel_matchmaking`
         * Remove this socket from the wait queue (e.g. player clicked "Cancel").
         */
        socket.on('cancel_matchmaking', () => {
            const idx = queue.findIndex(p => p.socketId === socket.id);
            if (idx !== -1) queue.splice(idx, 1);
        });

        /**
         * Event: `disconnect` (built-in)
         * Remove the socket from the queue and, if they were in an active room,
         * notify the partner and delete the room.
         */
        socket.on('disconnect', () => {
            const qIdx = queue.findIndex(p => p.socketId === socket.id);
            if (qIdx !== -1) queue.splice(qIdx, 1);

            for (const [roomId, room] of Object.entries(rooms)) {
                if (room.players.some(p => p.socketId === socket.id)) {
                    socket.to(roomId).emit('partner_disconnected');
                    delete rooms[roomId];
                    console.log(`[coop] room ${roomId} closed (player disconnected)`);
                    break;
                }
            }
        });
    });
};

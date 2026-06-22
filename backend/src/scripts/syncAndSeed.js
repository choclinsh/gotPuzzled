/**
 * syncAndSeed.js — drop and recreate all tables, then populate with mock data.
 * Run once after configuring your .env:  node src/scripts/syncAndSeed.js
 */
require('dotenv').config();
const { sequelize, User, AdminProfile, Score } = require('../models/index');

async function seed() {
    await sequelize.sync({ force: true });
    console.log('Tables created.');

    const users = await User.bulkCreate([
        { firstName: 'Max',     lastName: 'Black',     email: 'max@mail.com', password: '123456',          userRole: 'player',  theme: 'light' },
        { firstName: 'Han',     lastName: 'Lee',       email: 'han@mail.com', password: '123456',          userRole: 'admin',   theme: 'light' },
        { firstName: 'Caroline',lastName: 'Channing',  email: 'car@mail.com', password: 'cashFlow2026',    userRole: 'player',  theme: 'light' },
        { firstName: 'Sophie',  lastName: 'Kachinsky', email: 'sop@mail.com', password: 'highHeels99',     userRole: 'player',  theme: 'light' },
        { firstName: 'Israel',  lastName: 'Israeli',   email: 'isr@mail.com', password: 'managerSecure!',  userRole: 'manager', theme: 'light' }
    ]);
    console.log('Users seeded.');

    // Map original JSON `id` (userId) to the seeded users' real PKs
    const [max, han, caroline] = users;

    await Score.bulkCreate([
        { userId: max.userId,       pieces: 6,   rounds: 1, timeScore: '00:00:39' },
        { userId: max.userId,       pieces: 25,  rounds: 3, timeScore: '00:07:45' },
        { userId: max.userId,       pieces: 12,  rounds: 2, timeScore: '00:27:58' },
        { userId: max.userId,       pieces: 25, rounds: 4, timeScore: '02:22:42' },
        { userId: han.userId,       pieces: 25,  rounds: 5, timeScore: '00:22:43' },
        { userId: han.userId,       pieces: 12,  rounds: 1, timeScore: '00:12:03' },
        { userId: caroline.userId,  pieces: 25,  rounds: 3, timeScore: '00:09:05' },
        { userId: caroline.userId,  pieces: 6,  rounds: 2, timeScore: '00:31:08' },
        { userId: caroline.userId,  pieces: 12, rounds: 2, timeScore: '01:05:19' },
        { userId: caroline.userId,  pieces: 25,  rounds: 2, timeScore: '00:12:13' },
        { userId: caroline.userId,  pieces: 6,  rounds: 1, timeScore: '00:11:13' }
    ]);
    console.log('Scores seeded.');

    // Han is admin, Israel is manager
    await AdminProfile.bulkCreate([
        { userId: han.userId,    accessLevel: 'admin'   },
        { userId: users[4].userId, accessLevel: 'manager' }
    ]);
    console.log('AdminProfiles seeded.');

    console.log('Database seeded successfully.');
    await sequelize.close();
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});

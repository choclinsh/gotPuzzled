/**
 * Fisher-Yates (Knuth) in-place shuffle on a copy of the array.
 * Returns a new shuffled array without mutating the original.
 * @param {any[]} arr - The source array to shuffle.
 * @returns {any[]} A new array with elements in random order.
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

module.exports = { shuffle };

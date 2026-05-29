/**
 * tokenBlacklist.js
 * In-memory blacklist for one-time-use download tokens.
 * Once a token is consumed it cannot be reused, even if it has not expired.
 * In a distributed environment, replace this with a shared cache (e.g., Redis).
 */

/** @type {Set<string>} */
const usedTokens = new Set();

/**
 * Check whether a token has already been used.
 * @param {string} token
 * @returns {boolean}
 */
function isTokenUsed(token) {
    return usedTokens.has(token);
}

/**
 * Mark a token as used so it cannot be reused.
 * @param {string} token
 */
function markTokenAsUsed(token) {
    usedTokens.add(token);
}

module.exports = { isTokenUsed, markTokenAsUsed };

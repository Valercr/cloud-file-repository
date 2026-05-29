/**
 * auditLogger.js
 * Centralized audit logging utility.
 * Writes structured audit events to a log file and stdout.
 * Replace the file transport with a real logging service (e.g., Winston + CloudWatch) in production.
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../../audit.log');

/**
 * Write a structured audit event.
 * @param {string} event - Event type (e.g., 'UPLOAD', 'DOWNLOAD', 'LINK_GENERATED')
 * @param {Object} details - Contextual details for the event
 */
function audit(event, details) {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ...details,
    };

    const line = JSON.stringify(entry);

    // Append to audit log file
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf-8');

    // Also output to stdout for visibility during development
    console.log(`[AUDIT] ${line}`);
}

module.exports = { audit };

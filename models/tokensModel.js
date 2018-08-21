let db = require('./db');

const tokenSchema = new db.Schema({
    access_token: { type: String, required: true },
    expires_in: Number,
    refresh_token: { type: String, required: true },
    token_type: String,
    user_id: { type: String, required: true },
    session_nonce: String,
    date: { type: Date, required: true, default: Date.now }
});

let Token = db.model('Token', tokenSchema);
module.exports = Token;
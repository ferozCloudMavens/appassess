let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/appassess'

const tokenSchema = new mongoose.Schema({
    access_token: { type: String, required: true },
    expires_in: Number,
    refresh_token: { type: String, required: true },
    token_type: String,
    user_id: { type: String, required: true },
    session_nonce: String,
    date: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose
    .createConnection(url, { useNewUrlParser: true })
    .model('Token', tokenSchema);

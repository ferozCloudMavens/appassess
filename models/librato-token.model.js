let db = require('./db');

const libratoTokenSchema = new db.Schema({
    _id: { type: String },
    date: { type: Date, required: true, default: Date.now },
    LIBRATO_USERNAME: { type: String },
    LIBRATO_TOKEN: { type: String }
});

module.exports = db.model('LibratoToken', libratoTokenSchema);
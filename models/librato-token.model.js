let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || process.env.MONGO_DB_URL

const libratoTokenSchema = new mongoose.Schema({
    _id: { type: String },
    date: { type: Date, required: true, default: Date.now },
    LIBRATO_USERNAME: { type: String },
    LIBRATO_TOKEN: { type: String }
});

module.exports = mongoose
    .createConnection(url, { useNewUrlParser: true })
    .model('LibratoToken', libratoTokenSchema);

let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || process.env.MONGO_DB_URL /* FIXME: Remove next OR */ || 'mongodb://localhost:27017/appassess'

const dynoListSchema = new mongoose.Schema({
    userid: { type: String },
    appName: { type: String },
    dynos: [{
        attach_url: {
            type: 'String'
        },
        command: {
            type: 'String'
        },
        created_at: {
            type: 'Date'
        },
        id: {
            type: 'String'
        },
        name: {
            type: 'Date'
        },
        release: {
            id: {
                type: 'String'
            },
            version: {
                type: 'Number'
            }
        },
        app: {
            name: {
                type: 'String'
            },
            id: {
                type: 'String'
            }
        },
        size: {
            type: 'String'
        },
        state: {
            type: 'String'
        },
        type: {
            type: 'String'
        },
        updated_at: {
            type: 'Date'
        }
    }]
});

module.exports = mongoose
    .createConnection(url, { useNewUrlParser: true })
    .model('DynoList', dynoListSchema);
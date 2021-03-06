let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || process.env.MONGO_DB_URL /* FIXME: Remove next OR */ || 'mongodb://localhost:27017/appassess'

const appListSchema = new mongoose.Schema({
    _id: { type: String },
    apps: [{
        acm: {
            type: 'Boolean'
        },
        archived_at: {
            type: 'Date'
        },
        buildpack_provided_description: {
            type: 'String'
        },
        build_stack: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            }
        },
        created_at: {
            type: 'Date'
        },
        git_url: {
            type: 'String'
        },
        id: {
            type: 'String'
        },
        internal_routing: {
            type: 'Boolean'
        },
        maintenance: {
            type: 'Boolean'
        },
        name: {
            type: 'String'
        },
        owner: {
            email: {
                type: 'String'
            },
            id: {
                type: 'String'
            }
        },
        organization: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            }
        },
        team: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            }
        },
        region: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            }
        },
        released_at: {
            type: 'Date'
        },
        repo_size: {
            type: 'Number'
        },
        slug_size: {
            type: 'Number'
        },
        space: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            },
            shield: {
                type: 'Boolean'
            }
        },
        stack: {
            id: {
                type: 'String'
            },
            name: {
                type: 'String'
            }
        },
        updated_at: {
            type: 'Date'
        },
        web_url: {
            type: 'String'
        }
    }]
});

module.exports = mongoose
    .createConnection(url, { useNewUrlParser: true })
    .model('AppList', appListSchema);

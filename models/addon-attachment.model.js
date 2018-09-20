let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || process.env.MONGO_DB_URL /* FIXME: Remove next OR */ || 'mongodb://localhost:27017/appassess'

const addOnAttachmentSchema = new mongoose.Schema({
	_id: { type: String },
	addonAttachments: [{
		addon: {
			id: {
				type: 'String'
			},
			name: {
				type: 'String'
			},
			app: {
				id: {
					type: 'String'
				},
				name: {
					type: 'String'
				}
			}
		},
		app: {
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
		id: {
			type: 'String'
		},
		name: {
			type: 'String'
		},
		namespace: {
			type: 'String'
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
	.model('AddonAttachmentList', addOnAttachmentSchema);

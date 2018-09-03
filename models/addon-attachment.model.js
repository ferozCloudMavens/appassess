let db = require('./db');

const addOnAttachmentSchema = new db.Schema({
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

module.exports = db.model('AddonAttachmentList', addOnAttachmentSchema);

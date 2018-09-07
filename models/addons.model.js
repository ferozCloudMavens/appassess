let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/appassess'

const addOnSchema = new mongoose.Schema({
	_id: { type: String },
	addons: [{
		actions: {
			id: {
				type: 'String'
			},
			label: {
				type: 'String'
			},
			action: {
				type: 'String'
			},
			url: {
				type: 'String'
			},
			requires_owner: {
				type: 'Boolean'
			}
		},
		addon_service: {
			id: {
				type: 'String'
			},
			name: {
				type: 'String'
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
		billed_price: {
			cents: {
				type: 'Number'
			},
			contract: {
				type: 'Boolean'
			},
			unit: {
				type: 'String'
			}
		},
		config_vars: {
			type: [
				'String'
			]
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
		plan: {
			id: {
				type: 'String'
			},
			name: {
				type: 'String'
			}
		},
		provider_id: {
			type: 'String'
		},
		state: {
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
	.model('AddonList', addOnSchema);

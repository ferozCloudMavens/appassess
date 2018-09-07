let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI_SECOND || 'mongodb://localhost:27017/appassessarchive'

const libratoSchema = new mongoose.Schema({
	userid: { type: String },
	measurements: {
		type: 'Mixed'
	},
	resolution: {
		type: 'Number'
	},
	source_display_names: {
		type: [
			'Mixed'
		]
	},
	name: {
		type: 'String'
	},
	display_name: {
		type: 'Mixed'
	},
	type: {
		type: 'String'
	},
	attributes: {
		display_min: {
			type: 'Number'
		},
		created_by_ua: {
			type: 'String'
		},
		summarize_function: {
			type: 'String'
		},
		display_units_long: {
			type: 'String'
		},
		display_units_short: {
			type: 'String'
		}
	},
	description: {
		type: 'Mixed'
	},
	period: {
		type: 'Number'
	},
	source_lag: {
		type: 'Mixed'
	}
});

module.exports = mongoose
	.createConnection(url, { useNewUrlParser: true })
	.model('LibratoMeasurementArchive', libratoSchema);
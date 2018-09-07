let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI_SECOND || 'mongodb://localhost:27017/appassessarchive'

mongoose.connect(url, { useNewUrlParser: true })
    .then(
        () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ console.log('Mongoose appassessarchive connected', url); },
        err => { /** handle initial connection error */ console.error('Error connecting to Mongoose', err); }
    );

module.exports = mongoose;
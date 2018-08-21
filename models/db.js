let mongoose = require('mongoose');

let url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/appassess'

mongoose.connect(url, { useNewUrlParser: true })
    .then(
        () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ console.log('Mongoose connected', url); },
        err => { /** handle initial connection error */ console.error('Error connecting to Mongoose', err); }
    );

module.exports = mongoose;
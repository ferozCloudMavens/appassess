let router = require('express').Router();
let bodyParser = require('body-parser');

router
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: false }))
    .use('/auth/oauthResponse', require('./auth'))
    .use('/api/apps', require('./apps'))
    .use('/librato', require('../librato.controller')) ;
    
module.exports = router;
let superagent = require('superagent');

let Token = require('../models/tokensModel');

module.exports = (code) => {
    return new Promise((resolve, reject) => {
        superagent
            .post('https://id.heroku.com/oauth/token')
            .send(`grant_type=authorization_code&code=${code}&client_secret=${process.env.HEROKU_OAUTH_SECRET}`)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .end((err, supres) => {
                // Calling the end function will send the request
                if (err) {
                    // res.render('errorPage', { error: err + '. Page is auth code' });
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                saveToMongo(superbody);
                resolve(superbody);
            });
    })
}

function saveToMongo(superbody) {
    let token = new Token(superbody);
    Token
        .findOne({ 'user_id': superbody.user_id })
        .select('access_token refresh_token user_id date')
        .exec()
        .then(foundToken => {
            if (!foundToken) {
                token.save((mongoErr, savedToken) => {
                    if (mongoErr) {
                        console.error('token save to mongo failed', mongoErr);
                    }
                });
            }
        })
        .catch(err => {
            console.error('mongo findOne failed', err);
        });
}
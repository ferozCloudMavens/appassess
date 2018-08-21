let superagent = require('superagent');

let Token = require('../models/tokens.model');

module.exports = (mongoDoc) => {
    return new Promise((resolve, reject) => {
        superagent
            .post('https://id.heroku.com/oauth/token')
            .send(`grant_type=refresh_token&refresh_token=${mongoDoc.refresh_token}&client_secret=${process.env.HEROKU_OAUTH_SECRET}`)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                updateMongo(mongoDoc, superbody);
                resolve(superbody);                
            });
    });
}

function updateMongo(mongoDoc, superbody) {
    Token
        .findOne({ 'user_id': mongoDoc.user_id })
        .exec()
        .then((foundToken) => {
            foundToken.access_token = superbody.access_token;
            foundToken.expires_in = superbody.expires_in;
            foundToken.date = Date.now();
            foundToken.save((mongoErr, _savedToken) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }
            });
        }).catch((err) => {
            console.error('err is', err);
        });
}

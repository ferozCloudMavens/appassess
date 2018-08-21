let superagent = require('superagent');

let refresh = require('./refresh-token.controller');
let AppList = require('../models/apps.model');

module.exports = (mongoDoc, boolCallRefresh) => {
    return new Promise((resolve, reject) => {
        if (boolCallRefresh) {
            refresh(mongoDoc)
                .then((updatedToken) => {
                    getApps(updatedToken, resolve, reject);
                }).catch((err) => {
                    console.error('error calling refresh', err);
                });
        }
        else {
            getApps(mongoDoc, resolve, reject);
        }
    });
}

function getApps(tokenToUse, resolve, reject) {
    superagent
        .get('https://api.heroku.com/apps')
        .set('Authorization', `Bearer ${tokenToUse.access_token}`)
        .set('Accept', 'application/vnd.heroku+json; version=3')
        .end((err, supres) => {
            if (err) {
                console.error(err);
                reject(Error(err));
            }
            const superbody = supres.body;
            AppList
                .findOne({ '_id': tokenToUse.user_id })
                .select('apps')
                .exec()
                .then((doc) => {
                    if (!doc) {
                        saveApplistToDb(superbody);
                    } else if (!Object.is(doc.apps, superbody)) {
                        saveApplistToDb(superbody, doc);
                    }
                }).catch((err) => {
                    // ejs.render('errorPage', { error: err });
                });
            resolve(superbody);
        });

    function saveApplistToDb(superbody, doc) {
        let applist;
        if (doc) {
            applist = doc;
            applist.apps = superbody;
        } else {
            applist = new AppList({ _id: tokenToUse.user_id, apps: superbody });
        }

        applist.save((mongoErr, _savedDoc) => {
            if (mongoErr) {
                // ejs.render('errorPage', { error: mongoErr });
                console.error('mongoErr', mongoErr);
            }            
        });
    }
}

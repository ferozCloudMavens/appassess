let superagent = require('superagent');

let refresh = require('./refresh-token.controller');
let AppList = require('../models/apps.model');
let DynoList = require('../models/dynos.model');

module.exports = (mongoDoc, boolCallRefresh) => {
    return new Promise((resolve, reject) => {
        if (boolCallRefresh) {
            refresh(mongoDoc)
                .then((updatedToken) => {
                    doJobs(updatedToken, resolve, reject);
                }).catch((err) => {
                    console.error('error calling refresh', err);
                });
        }
        else {
            doJobs(mongoDoc, resolve, reject);
        }
    });
}

function doJobs(token, resolve, reject) {
    postApps(token, resolve, reject);
}

function postApps(tokenToUse, resolve, reject) {
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
                        saveApplistToDb(superbody, tokenToUse);
                    } else if (!Object.is(doc.apps, superbody)) {
                        saveApplistToDb(superbody, tokenToUse, doc);
                    }
                }).catch((err) => {
                    // ejs.render('errorPage', { error: err });
                });
            resolve(superbody);
        });
}

function saveApplistToDb(superbody, token, doc) {
    let applist;
    if (doc) {
        applist = doc;
        applist.apps = superbody;
    } else {
        applist = new AppList({ _id: token.user_id, apps: superbody });
    }
    applist.save((mongoErr, savedDoc) => {
        if (mongoErr) {
            // ejs.render('errorPage', { error: mongoErr });
            console.error('mongoErr', mongoErr);
        }
        if (savedDoc) {
            postDynos(applist.apps, token);
        }
    });
}

function postDynos(apps, tokenToUse) {
    for (const app of apps) {
        superagent
            .get(`https://api.heroku.com/apps/${app.id}/dynos`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                }
                const superbody = supres.body;
                DynoList
                    .findOne({ 'userid': tokenToUse.user_id, 'appName': app.name })
                    .select('dynos')
                    .exec()
                    .then((doc) => {
                        console.log('doc is', doc);
                        if (!doc) {
                            console.log('calling saveDynoListToDb');
                            saveDynoListToDb(superbody, tokenToUse);
                        } else if (!Object.is(doc.dynos, superbody)) {
                            console.log('calling saveDynoListToDb object.is');
                            saveDynoListToDb(superbody, tokenToUse, doc);
                        }
                    }).catch((err) => {
                        console.error('postDynos err is', err);
                    });
            });
    }
}

function saveDynoListToDb(superbody, tokenToUse, doc) {
    let dynolist;
    if (doc) {
        dynolist = doc;
        dynolist.dynos = superbody;
    } else {
        dynolist = new DynoList({ userid: tokenToUse.user_id, dynos: superbody });
    }
    console.log('dynolist is', dynolist);
    dynolist.save((mongoErr, _savedDoc) => {
        if (mongoErr) {
            // ejs.render('errorPage', { error: mongoErr });
            console.error('mongoErr', mongoErr);
        }
    });
}
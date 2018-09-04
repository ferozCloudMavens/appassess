let router = require('express').Router();
let superagent = require('superagent');

let Token = require('../models/tokens.model');
let AddonList = require('../models/addons.model');
let AddonAttachmentList = require('../models/addon-attachment.model');
let LibratoToken = require('../models/librato-token.model');
let refresh = require('./refresh-token.controller');
let encyption = require('../utilities/token-encrypt');

let libratoPlanName = process.env.LIBRATO_PLAN_NAME;

router
    .post('/:userId', (req, res) => {

        let appId = req.body.appId;
        
        Token
            .findOne({ 'user_id': req.params.userId })
            .select('refresh_token')
            .exec()
            .then((doc) => {
                refresh(doc)
                    .then((updatedToken) => {
                        Promise.all([getAddons(updatedToken, appId), getAddonAttachments(updatedToken)])
                            .then((result) => {
                                let libratoExistsOnApp, libratoOnAnotherApp, libratoNotFound, addon;
                                let found = false;

                                for (const entry of result) {
                                    if (!found) {
                                        for (const subentry of entry) {
                                            if (subentry.addon_service && subentry.addon_service.name.includes('librato')) {
                                                addon = subentry;
                                                libratoExistsOnApp = true;
                                                found = true;
                                                break;
                                            } else if (subentry.addon && subentry.addon.name.includes('librato')) {
                                                addon = subentry;
                                                libratoOnAnotherApp = true;
                                                found = true;
                                                break;
                                            } else {
                                                libratoNotFound = true;
                                            }
                                        }
                                    }
                                }

                                if (libratoExistsOnApp) {
                                    saveLibratoConfigVars(addon.id, updatedToken)
                                        .then((result) => {
                                            console.log(result);
                                        }).catch((err) => {
                                            console.error(err);
                                        });
                                } else if (libratoOnAnotherApp) {
                                    saveLibratoConfigVars(addon.addon.id, updatedToken)
                                        .then((result) => {
                                            console.log(result);
                                        }).catch((err) => {
                                            console.error(err);
                                        });
                                    attachLibratoToApp(addon.addon.name, appId, updatedToken)
                                        .then((result) => {
                                            console.log(result);
                                        }).catch((err) => {
                                            console.error(err);
                                        });
                                } else if (libratoNotFound) {
                                    createLibratoAddon(libratoPlanName, appId, updatedToken)
                                        .then((result) => {
                                            console.log(result);
                                        }).catch((err) => {
                                            console.error(err);
                                        });
                                }
                                res.send(result);
                            }).catch((err) => {
                                console.error(err);
                            });
                    }).catch((err) => {
                        console.error('Error getting token', err);
                    });
            }).catch((err) => {
                res.render('errorPage', { error: err });
            });
    })

function getAddons(tokenToUse, appId) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://api.heroku.com/apps/${appId}/addons`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                saveAddonsToDb(tokenToUse, superbody);
                resolve(superbody);
            });
    });
}
function getAddonAttachments(tokenToUse) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://api.heroku.com/addon-attachments`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                saveAddonAttachmentsToDb(tokenToUse, superbody);
                resolve(superbody);
            });
    });
}

function saveAddonsToDb(tokenToUse, superbody) {
    let addonList;
    AddonList
        .findOne({ '_id': tokenToUse.user_id })
        .select('addons')
        .exec()
        .then((doc) => {
            if (doc && !Object.is(doc.addons, superbody)) {
                addonList = doc;
                addonList.addons = superbody;
            } else {
                addonList = new AddonList({ _id: tokenToUse.user_id, addons: superbody });
            }
            addonList.save((mongoErr, _savedDoc) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }
            });
        }).catch((err) => {
            console.error(err);
        });
}

function saveAddonAttachmentsToDb(tokenToUse, superbody) {
    let addonAttachmentList;
    AddonAttachmentList
        .findOne({ '_id': tokenToUse.user_id })
        .select('addonAttachments')
        .exec()
        .then((doc) => {
            if (doc && !Object.is(doc.addonAttachments, superbody)) {
                addonAttachmentList = doc;
                addonAttachmentList.addonAttachments = superbody;
            } else {
                addonAttachmentList = new AddonAttachmentList({ _id: tokenToUse.user_id, addonAttachments: superbody });
            }
            addonAttachmentList.save((mongoErr, _savedDoc) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }
            });
        }).catch((err) => {
            console.error(err);
        });
}

function saveLibratoConfigVars(addonId, tokenToUse) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://api.heroku.com/addons/${addonId}/config`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                saveConfigsToDb(tokenToUse, superbody);
                resolve(superbody);
            });
    });
}

function attachLibratoToApp(addonname, appId, tokenToUse) {
    return new Promise((resolve, reject) => {
        superagent
            .post(`https://api.heroku.com/addon-attachments`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .set('Content-Type', 'application/json')
            .send(JSON.parse(`{
                "addon": "${addonname}",
                "app": "${appId}"
              }`))
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                console.log('attachLibratoToApp superbody is', superbody);
                resolve(superbody);
            });
    });
}

function createLibratoAddon(planToUse, appId, tokenToUse) {
    return new Promise((resolve, reject) => {
        superagent
            .post(`https://api.heroku.com/apps/${appId}/addons`)
            .set('Authorization', `Bearer ${tokenToUse.access_token}`)
            .set('Accept', 'application/vnd.heroku+json; version=3')
            .set('Content-Type', 'application/json')
            .send(JSON.parse(`{
                "plan": "${planToUse}"
              }`))
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                    reject(Error(err));
                }
                let superbody = supres.body;
                console.log('createLibratoAddon superbody is', superbody);
                resolve(superbody);
            });
    });
}

function saveConfigsToDb(tokenToUse, superbody) {
    LibratoToken
        .findOne({ '_id': tokenToUse.user_id })
        .select('addonAttachments')
        .exec()
        .then((doc) => {
            if (!doc) {
                let ltoken = new LibratoToken({ _id: tokenToUse.user_id });
                superbody.map((entry) => {
                    if (entry['name'].includes("USER")) {
                        ltoken.LIBRATO_USERNAME = entry['value'];
                    } else if (entry['name'].includes("TOKEN")) {
                        ltoken.LIBRATO_TOKEN = encyption.encrypt(entry['value']);
                    }
                });
                ltoken.save((mongoErr, _savedDoc) => {
                    if (mongoErr) {
                        console.error('mongoErr', mongoErr);
                    }
                });
            }
        }).catch((err) => {
            console.error('saveConfigsToDb err is', err);
        });
}

module.exports = router;
let router = require('express').Router();
let superagent = require('superagent');

let Token = require('../models/tokens.model');
let AddonList = require('../models/addons.model');
let AddonAttachmentList = require('../models/addon-attachment.model');
let LibratoToken = require('../models/librato-token.model');
let refresh = require('./refresh-token.controller');
let encyption = require('../utilities/token-encrypt');

let libratoPlanName = "librato:development";

router
    .get('/:userId', (req, res) => {

        let appId = req.query.appId;

        Token
            .findOne({ 'user_id': req.params.userId })
            .select('refresh_token')
            .exec()
            .then((doc) => {
                refresh(doc)
                    .then((updatedToken) => {
                        Promise.all([getAddons(updatedToken, appId), getAddonAttachments(updatedToken)])
                            .then((result) => {
                                result.map(entry => {
                                    entry.map((subentry) => {
                                        if (subentry.addon_service && subentry.addon_service.name.includes('librato')) {
                                            saveLibratoConfigVars(subentry.id, updatedToken);
                                        } else if (subentry.addon && subentry.addon.name.includes('librato')) {
                                            saveLibratoConfigVars(subentry.addon.id, updatedToken);
                                            attachLibratoToApp(subentry.addon.name, appId, updatedToken);
                                        } else {
                                            createLibratoAddon(libratoPlanName, appId, updatedToken);
                                        }
                                    })
                                });
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
                console.log('saveLibratoConfigVars superbody is', superbody);
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
            .send(`{
                "addon": ${addonname},
                "app": ${appId}
              }`)
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
            .send(`{
                "plan": ${planToUse}
              }`)
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

module.exports = router;
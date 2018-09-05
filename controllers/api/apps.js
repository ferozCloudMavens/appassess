let router = require('express').Router();
let superagent = require('superagent');

let AppList = require('../../models/apps.model');
let LibratoToken = require('../../models/librato-token.model');
let encyption = require('../../utilities/token-encrypt');

const libratoSpacesUrl = 'https://metrics-api.librato.com/v1/spaces';

let appdoc = '';
let appId = '';
let libratoCredentials = null;

router
    .get('/:userId', (req, res) => {
        AppList
            .findOne({ '_id': req.params.userId })
            .select('apps')
            .exec()
            .then((doc) => {
                appdoc = doc;
                res.render('applist', { applist: doc, appId: appId, libratoCredentials: libratoCredentials });
            }).catch((err) => {
                res.render('errorPage', { error: err });
            });
    })

    .post('/:appId', (req, res) => {
        res.render('applist', { applist: appdoc, appId: req.body.appId, libratoCredentials: libratoCredentials });
    })

    .get('/librato/:userId', (req, res) => {
        LibratoToken
            .findOne({ '_id': req.params.userId })
            .select('LIBRATO_USERNAME LIBRATO_TOKEN')
            .exec()
            .then((doc) => {
                doc.LIBRATO_TOKEN = encyption.decrypt(doc.LIBRATO_TOKEN);
                return getLibratoSpace(doc);
            })
            .then((result) => {
                return getLibratoCharts(result.doc, result.id);
            }).catch((err) => {
                console.error(err);
            })
            .then((result) => {
                libratoCredentials = {
                    username: result.doc.LIBRATO_USERNAME,
                    token: result.doc.LIBRATO_TOKEN,
                    charts: result.items
                };
                res.render('applist', { applist: appdoc, appId: appId, libratoCredentials: libratoCredentials });
            }).catch((err) => {
                console.error(err);
            })
            .catch((err) => {
                console.error(err);
            });
    });

function getLibratoSpace(tokens) {
    return new Promise((resolve, reject) => {
        superagent
            .get(libratoSpacesUrl)
            .auth(tokens.LIBRATO_USERNAME, tokens.LIBRATO_TOKEN)
            .end((err, supres) => {
                if (err) {
                    reject(Error(err));
                }
                for (const space of supres.body.spaces) {
                    if (space.name.includes('Heroku Overview')) {
                        resolve({
                            id: space.id,
                            doc: tokens
                        });
                    }
                }
            });
    });
}

function getLibratoCharts(tokens, libratoSpaceId) {
    let chartIds = [];
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://metrics-api.librato.com/v1/spaces/${libratoSpaceId}/charts`)
            .auth(tokens.LIBRATO_USERNAME, tokens.LIBRATO_TOKEN)
            .end((err, supres) => {
                if (err) {
                    reject(Error(err));
                }
                supres.body.forEach(item => {
                    chartIds.push(item.id);
                });                
                resolve({
                    items: chartIds,
                    doc: tokens
                });
            });
    });
}

module.exports = router;
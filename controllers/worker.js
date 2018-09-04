/*
get id and encrypted password from credentials db
    Check timestamp
    if < 8 days
        unencrypt password
        make calls and store metrics
            store using user id and app name
    else
        Move all records to archive db
*/

// IDEA: Delete Librato token after 10 days

// NOTE: Archive data to archive db

let superagent = require('superagent');

let LibratoToken = require('../models/librato-token.model');
let encyption = require('../utilities/token-encrypt');
let LibratoLoadAvg1m = require('../models/librato-load-avg-1m.model');
let LibratoRouterServicePerc95 = require('../models/librato-router-service-perc95.model');

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
const howmanydaystocheck = 15;

LibratoToken
    .find()
    .select('date LIBRATO_USERNAME LIBRATO_TOKEN')
    .exec()
    .then((docs) => {
        docs.map((doc) => {
            const decryptedToken = encyption.decrypt(doc.LIBRATO_TOKEN);
            const docid = doc._id;
            const libratoUserName = doc.LIBRATO_USERNAME;            
            
            if ((Date.now() - doc.date)/_MS_PER_DAY < howmanydaystocheck) {
                checkLoadAvg1m(process.env.LIBRATO_AVG_1M_URL, docid, libratoUserName, decryptedToken);
                checkPerc95(process.env.LIBRATO_PERC95, docid, libratoUserName, decryptedToken);
            }
        });
    }).catch((err) => {
        console.error('Librato find all error', err);
    });


function checkLoadAvg1m(url, id, username, token) {
    superagent
        .get(url)
        .auth(username, token)
        .end((err, supres) => {
            if (err) {
                console.error(err);
            }
            let avg1m = new LibratoLoadAvg1m(supres.body);
            avg1m.userid = id;
            avg1m.save((mongoErr, _savedDoc) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }
            });
        })
}

function checkPerc95(url, id, username, token) {
    superagent
        .get(url)
        .auth(username, token)
        .end((err, supres) => {
            if (err) {
                console.error(err);
            }
            let perc95 = new LibratoRouterServicePerc95(supres.body);
            perc95.userid = id;
            perc95.save((mongoErr, _savedDoc) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }
            });
        })
}

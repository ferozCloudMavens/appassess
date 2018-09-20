// IDEA: Delete Librato token after 10 days

let superagent = require('superagent');

let LibratoToken = require('../models/librato-token.model');
let encyption = require('../utilities/token-encrypt');
let LibratoMeasurement = require('../models/librato-measurement.model');
let LibratoMeasurementArchive = require('../models/librato-archive-measurement.model');

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
const howmanydaystocheck = process.env.NUM_DAYS_TO_ASSESS;
const BASE_URL = `https://metrics-api.librato.com/v1/metrics/`
const URL_PARAMS = `?count=100&resolution=3600`

let load_avg_1m_URL = `${BASE_URL}load-avg-1m${URL_PARAMS}`;
let router_service_perc95_URL = `${BASE_URL}router.service.perc95${URL_PARAMS}`;
let router_service_perc99_URL = `${BASE_URL}router.service.perc99${URL_PARAMS}`;
let ROUTER_SERVICE_URL = `${BASE_URL}router.service${URL_PARAMS}`;
let router_service_median_URL = `${BASE_URL}router.service.median${URL_PARAMS}`;
let active_connections_URL = `${BASE_URL}active-connections${URL_PARAMS}`;
let db_size_URL = `${BASE_URL}db_size${URL_PARAMS}`;
let errors_http_h10_URL = `${BASE_URL}errors.http.h10${URL_PARAMS}`;
let errors_http_h11_URL = `${BASE_URL}errors.http.h11${URL_PARAMS}`;
let errors_http_h12_URL = `${BASE_URL}errors.http.h12${URL_PARAMS}`;
let errors_http_h13_URL = `${BASE_URL}errors.http.h13${URL_PARAMS}`;
let index_cache_hit_rate_URL = `${BASE_URL}index-cache-hit-rate${URL_PARAMS}`;
let load_avg_15m_URL = `${BASE_URL}load-avg-15m${URL_PARAMS}`;
let load_avg_5m_URL = `${BASE_URL}load-avg-5m${URL_PARAMS}`;
let memory_cached_URL = `${BASE_URL}memory-cached${URL_PARAMS}`;
let memory_postgres_URL = `${BASE_URL}memory-postgres${URL_PARAMS}`;
let memory_total_URL = `${BASE_URL}memory-total${URL_PARAMS}`;
let memory_swap_URL = `${BASE_URL}memory_swap${URL_PARAMS}`;
let memory_rss_URL = `${BASE_URL}memory_rss${URL_PARAMS}`;
let router_connect_median_URL = `${BASE_URL}router.connect.median${URL_PARAMS}`;
let router_connect_perc95_URL = `${BASE_URL}router.connect.perc95${URL_PARAMS}`;
let table_cache_hit_rate_URL = `${BASE_URL}table-cache-hit-rate${URL_PARAMS}`;

let urls = [
    load_avg_1m_URL,
    router_service_perc95_URL,
    router_service_perc99_URL,
    ROUTER_SERVICE_URL,
    router_service_median_URL,
    active_connections_URL,
    db_size_URL,
    errors_http_h10_URL,
    errors_http_h11_URL,
    errors_http_h12_URL,
    errors_http_h13_URL,
    index_cache_hit_rate_URL,
    load_avg_15m_URL,
    load_avg_5m_URL,
    memory_cached_URL,
    memory_postgres_URL,
    memory_total_URL,
    memory_swap_URL,
    memory_rss_URL,
    router_connect_median_URL,
    router_connect_perc95_URL,
    table_cache_hit_rate_URL
];

LibratoToken
    .find()
    .select('date LIBRATO_USERNAME LIBRATO_TOKEN')
    .exec()
    .then((docs) => {
        docs.map((doc) => {
            const decryptedToken = encyption.decrypt(doc.LIBRATO_TOKEN);
            const docid = doc._id;
            const libratoUserName = doc.LIBRATO_USERNAME;
            console.log('days', (Date.now() - doc.date) / _MS_PER_DAY);
            if ((Date.now() - doc.date) / _MS_PER_DAY < howmanydaystocheck) {
                checkMeasurements(urls, docid, libratoUserName, decryptedToken);
            } else {
                archiveMeasurements(docid);
            }
        });
    }).catch((err) => {
        console.error('Librato find all error', err);
    });


function checkMeasurements(urlsToCall, id, username, token) {
    console.log('calling checkMeasurements');
    urlsToCall.forEach(url => {
        superagent
            .get(url)
            .auth(username, token)
            .end((err, supres) => {
                if (err) {
                    console.error(err);
                }
                let measurement = new LibratoMeasurement(supres.body);
                measurement.userid = id;
                measurement.save((mongoErr, _savedDoc) => {
                    if (mongoErr) {
                        console.error('mongoErr', mongoErr);
                    }
                });
            });
    });
}

function archiveMeasurements(id) {
    console.log('calling archiveMeasurements');    
    LibratoMeasurement
        .find({ 'userid': id })
        .stream()
        .on('data', (doc) => {            
            let archiveMeasurement = new LibratoMeasurementArchive(doc);
            archiveMeasurement.save((mongoErr, _savedDoc) => {
                if (mongoErr) {
                    console.error('mongoErr', mongoErr);
                }               
                LibratoMeasurement.deleteOne({ 'userid': id }, (err) => {
                    if (err) {
                        console.error('delete error', err);
                    }
                });
            });
        })
        .on('error', function (err) {
            console.error('archive stream err', err);
        })
        .on('close', function () {
            console.log('archive close stream');
        })
}
/* 
Authenticate user
Date range - 10 days
Check the correct app
if measurements 
    report on each one
else
    no measurements collected

Chart

Search button should use AJAX - else not found

*/

let LibratoMeasurementArchive = require('../models/librato-archive-measurement.model');
let DynoList = require('../models/dynos.model');
let AppList = require('../models/apps.model');
let AddonList = require('../models/addons.model');
let AddonAttachmentList = require('../models/addon-attachment.model');

let appName = 'protected-garden-14764'; // HACK: Must change // warm-reaches-95020 protected-garden-14764 rocky-forest-95816
const DATE_RANGE = 100;

let stats = {
    reportDateRange: '',
    dynoInfo: '',
    appInfo: '',
    addonInfo: '',
    addonAttachmentInfo: '',
    memoryPercent: '',
    dynoLoad: '',
    requestResponseTimes: ''

};
let recommendations = {
    postgres: '',
    stack: '',
    dynos: '',
    memoryPercent: '',
    memleak: '',
    dynoLoad: '',
    requestResponseTimes: ''
};
let dynoTypes = [];

var d = new Date();
d.setDate(d.getDate() - DATE_RANGE);
var unixTime = Math.floor(d.getTime() / 1000);
let measureTime = `measurements.${appName}.measure_time`;

const memAllowance = {
    free: 512,
    hobby: 512,
    standard1x: 512,
    standard2x: 1024,
    performancem: 2500,
    performancel: 14000,
};
const growthInMemoryUsageSeries = 0.75;
const recommendedStack = process.env.RECOMMENDED_STACK || 'Heroku-18'; // HACK: remove OR condition
const dynoAllowance = {
    shared: 1,
    performancem: 4,
    performancel: 16
};
const maxResponseTimeRecommended = 500;


LibratoMeasurementArchive
    .aggregate()
    // .unwind({ path: `$measurements.${appName}` })
    .match({ [measureTime]: { $gt: unixTime } }) // ComputedPropertyName - Template literals cannot be used as key in an object literal. Use a computed property instead:
    .group({
        _id: '$name',
        'measurementsValueMax': {
            $max: `$measurements.${appName}.value`
        },
        'measurementsValueMin': {
            $min: `$measurements.${appName}.value`
        }
    })
    .exec((err, res) => {
        if (err) {
            console.error('Aggregate Error', err);
        }
        console.log('res is', res);
        produceReport(res);
    });


function produceReport(res) {
    Promise.all([getDynoInfo(), getAppInfo(), getAddonInfo(), getAddonAttachmentInfo()])
        .then((result) => {
            stats.reportDateRange += `\n${d.toUTCString()} - ${new Date()}\n`;
            doDynoRecommendations(result[0]);
            doStackRecommendations(result[1]);
            doBasicPostgresRecommendations(result[2]);
            showAttachmentInfo(result[3]);
            checkMemoryUsage(res);
            checkDynoLoad(res);
            checkRequestResponseTimes(res);
            console.log('Observations: ', stats);
            console.log('Recommendations: ', recommendations);

        }).catch((err) => {
            console.error('Error is', err);
        });

    function getDynoInfo() {
        return new Promise((resolve, reject) => {
            DynoList
                .find({ "dynos.app.name": `${appName}` })
                .exec()
                .then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(Error(err));
                });
        });
    }

    function getAppInfo() {
        return new Promise((resolve, reject) => {
            AppList
                .find({ "apps.name": `${appName}` })
                .exec()
                .then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(Error(err));
                });
        });
    }

    function getAddonInfo() {
        return new Promise((resolve, reject) => {
            AddonList
                .find({ "addons.app.name": `${appName}` })
                .exec()
                .then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(Error(err));
                });
        });
    }

    function getAddonAttachmentInfo() {
        return new Promise((resolve, reject) => {
            AddonAttachmentList
                .find({ "addonAttachments.app.name": `${appName}` })
                .exec()
                .then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(Error(err));
                });
        });
    }
}

function showAttachmentInfo(result) {
    for (const entry of result) {
        for (const subentry of entry["addonAttachments"]) {
            if (subentry.app.name == appName) {
                stats.addonAttachmentInfo += `Addon name is ${subentry.addon.name}, ${subentry.name} \n`;
            }
        }
    }
}

function doBasicPostgresRecommendations(result) {
    for (const entry of result) {
        for (const subentry of entry["addons"]) {
            if (subentry.app.name == appName) {
                stats.addonInfo += `Addon Service name is: ${subentry.addon_service.name}, Addon Plan name is: ${subentry.plan.name}\n`;
                if (subentry.addon_service.name.includes('postgresql') && subentry.plan.name.includes('hobby-dev')) {
                    recommendations.postgres += 'You are not using a Production level Postgres database. \n';
                } else if (subentry.addon_service.name.includes('postgresql') && subentry.plan.name.includes('standard')) {
                    recommendations.postgres += `You are using a Standard tier Postgres database. The High Availability feature of Premium Tier databases involves a database cluster and management system designed to increase database availability in the face of hardware or software failure that would otherwise lead to longer downtime. When a primary database with this feature fails, it is automatically replaced with another replica database called a standby. If there are standard followers of your primary database, they will be destroyed and recreated when the failover event happens. \n`;
                }
            }
        }
    }
}

function doStackRecommendations(result) {
    for (const entry of result) {
        for (const subentry of entry["apps"]) {
            if (subentry.name == appName) {
                stats.appInfo += `App Stack is: ${subentry.stack.name}, Region is: ${subentry.region.name}, Buildpack is: ${subentry.buildpack_provided_description}\n`;
                if (subentry.stack.name.substr(-2) < recommendedStack.substr(-2)) {
                    recommendations.stack += `A stack is an operating system image that is curated and maintained by Heroku. The currently recommended stack is ${recommendedStack}. Please visit https://devcenter.heroku.com/articles/upgrading-to-the-latest-stack to learn how to upgrade your stack.`;
                }
            }
        }
    }
}

function doDynoRecommendations(result) {
    let dynocount = 0, webdynocount = 0, freedyno = false;
    for (const entry of result) {
        for (const subentry of entry["dynos"]) {
            if (subentry) {
                stats.dynoInfo += `Dyno Info. Size: ${subentry.size}, Type: ${subentry.type}, Command: ${subentry.command} \n`;
                dynocount = dynocount + 1;
                dynoTypes.push(subentry.size.toLowerCase());
                if (subentry.type.toLowerCase().includes('web')) {
                    webdynocount = webdynocount + 1;
                }
                if (subentry.size.toLowerCase().includes('free')) {
                    freedyno = true;
                }
            }
        }
    }
    if (dynocount < 2) {
        recommendations.dynos += `You are only using 1 dyno. For a production application you should have more than 1 dyno to ensure your application has redundancy. For example, it should use background jobs for computationally intensive tasks in order to keep request times short, and use a process model to ensure that separate parts of the application can be scaled independently. You can read more about this here: https://devcenter.heroku.com/articles/optimizing-dyno-usage. \n`;
    }
    if (webdynocount < 2) {
        recommendations.dynos += `You are only running on 1 web dyno. A second dyno will provide instant fallback if one dyno fails for any reason. Scale your dynos to 2 or more on the Resources tab.\n`;
    }
    if (freedyno) {
        recommendations.dynos += `We do not recommend the use of free dynos for production level apps. This type of dyno should only be used during the development phase. \n`;
    }
}

function checkMemoryUsage(readings) {
    for (const reading of readings) {
        if (reading._id == 'memory_rss') {
            var maxReadingMemory = Math.max(...reading.measurementsValueMax);
            var popped = 1;
            var newarr = reading.measurementsValueMax.slice();
            let recommendationForMemory = 'Aim to use no more than 80% of the available memory.';

            if (dynoTypes.includes('performance-l')) {
                var memUsedPercent = (maxReadingMemory / memAllowance.performancel * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += recommendationForMemory;
                }
            } else if (dynoTypes.includes('performance-m')) {
                var memUsedPercent = (maxReadingMemory / memAllowance.performancem * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += recommendationForMemory;
                }
            } else if (dynoTypes.includes('standard-2x')) {
                var memUsedPercent = (maxReadingMemory / memAllowance.standard2x * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += recommendationForMemory;
                }
            } else if (dynoTypes.includes('free') || dynoTypes.includes('hobby') || dynoTypes.includes('standard-1x')) {
                var memUsedPercent = (maxReadingMemory / memAllowance.standard1x * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += recommendationForMemory;
                }
            }

            series(newarr, newarr.pop());
            function series(measurementsValueMax, val) {
                var preval = measurementsValueMax.pop();
                if (val > preval) {
                    popped = popped + 1;
                }
                if (preval) {
                    series(measurementsValueMax, preval);
                }
            }
            if ((popped / reading.measurementsValueMax.length) > growthInMemoryUsageSeries) {
                recommendations.memleak += `The app's memory usage has been growing on a daily basis. This probably indicates a memory leak in the application. We recommend investigating possible memory leak causes in the application. https://blog.codeship.com/debugging-a-memory-leak-on-heroku/`;
            } else if ((popped / reading.measurementsValueMax.length) == 1) {
                recommendations.memleak += `The app's memory usage has been growing on a daily basis. There's a high probability of a memory leak in the application. We recommend investigating possible memory leak causes in the application. https://blog.codeship.com/debugging-a-memory-leak-on-heroku/`;
            }
            break;
        }
    }
}

function checkDynoLoad(readings) {
    let allReadings = [];
    let maxReadingDynoLoad;
    let recommendationForDynoLoad = 'The Dyno load for your Dyno should be brought to under ';
    let referenceConcurrency = '. Please refer to https://devcenter.heroku.com/articles/optimizing-dyno-usage#concurrent-web-servers.'

    for (const reading of readings) {
        let readingId = reading._id;
        if (readingId == 'load-avg-1m' || readingId == 'load-avg-5m' || readingId == 'load-avg-15m') {
            allReadings = allReadings.concat(reading.measurementsValueMax);
        }
    }

    if (allReadings.length) {
        maxReadingDynoLoad = Math.max(...allReadings);
        stats.dynoLoad = `The Dyno load average reflects the number of CPU tasks that are waiting to be processed. The maximum dyno load on your app is ${maxReadingDynoLoad}.`;

        if (dynoTypes.includes('performance-l')) {
            if (maxReadingDynoLoad > dynoAllowance.performancel) {
                recommendations.dynoLoad += recommendationForDynoLoad + dynoAllowance.performancel + referenceConcurrency;
            } else if (maxReadingDynoLoad < (dynoAllowance.performancem - 1)) {
                recommendations.dynoLoad += `The average dyno load indicates that there is a spare CPU capacity to be utilized. It is worth investigating using 
                Performance-M dynos with different concurrency settings to balance out CPU and memory utilisation. You may be able to run multiple Performance-M dynos
                therefore utilizing more CPU resources and having dyno redundancy`;
            }
        } else if (dynoTypes.includes('performance-m')) {
            if (maxReadingDynoLoad > dynoAllowance.performancem) {
                recommendations.dynoLoad += recommendationForDynoLoad + dynoAllowance.performancem + referenceConcurrency;
            }
        } else if (dynoTypes.includes('free') || dynoTypes.includes('hobby') || dynoTypes.includes('standard-1x') || dynoTypes.includes('standard-2x')) {
            if (maxReadingDynoLoad > dynoAllowance.shared) {
                recommendations.dynoLoad += recommendationForDynoLoad + dynoAllowance.shared + referenceConcurrency;
            }
        }
    }
}

function checkRequestResponseTimes(readings) {
    let median = [];
    let perc95 = [];
    let perc99 = [];
    let maxMedianReading, maxperc95Reading, maxperc99Reading;
    let recommendationForReqRes = `Requests should take less than ${maxResponseTimeRecommended}ms to complete. You should find and optimize the slowest transactions. This can be done with a transaction trace.`;


    for (const reading of readings) {
        let readingId = reading._id;        
        if (readingId == 'router.service.median') {            
            median = median.concat(reading.measurementsValueMax);            
        } else if (readingId == 'router.service.perc95') {
            perc95 = perc95.concat(reading.measurementsValueMax);
        } else if (readingId == 'router.service.perc99') {
            perc99 = perc99.concat(reading.measurementsValueMax);
        }
    }

    if (median.length) {
        maxMedianReading = Math.max(...median);
        stats.requestResponseTimes += ` 50% of your application’s web requests were completed within less time than ${maxMedianReading.toFixed(2)}ms, and 50% were completed within more.`;
    }
    if (perc95.length) {
        maxperc95Reading = Math.max(...perc95);
        stats.requestResponseTimes += ` 95% of your application’s web requests were completed within less time than ${maxperc95Reading.toFixed(2)}ms, and 5% were completed within more.`;
    }
    if (perc99.length) {
        maxperc99Reading = Math.max(...perc99);
        stats.requestResponseTimes += ` 99% of your application’s web requests were completed within less time than ${maxperc99Reading.toFixed(2)}ms, and 1% were completed within more.`;
    }

    if (maxMedianReading > maxResponseTimeRecommended || maxperc95Reading > maxResponseTimeRecommended || maxperc99Reading > maxResponseTimeRecommended) {
        recommendations.requestResponseTimes += recommendationForReqRes;
    }
}
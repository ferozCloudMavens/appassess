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

let appName = 'protected-garden-14764'; // HACK: Must change
const DATE_RANGE = 100;
const recommendedStack = process.env.RECOMMENDED_STACK || 'Heroku-18'; // HACK: remove OR condition
let stats = {
    reportDateRange: '',
    dynoInfo: '',
    appInfo: '',
    addonInfo: '',
    addonAttachmentInfo: '',
    memoryPercent: ''

};
let recommendations = {
    postgres: '',
    stack: '',
    dynos: '',
    memoryPercent: '',
    memleak: ''
};
let dynoTypes = [];

var d = new Date();
d.setDate(d.getDate() - DATE_RANGE);
var unixTime = Math.floor(d.getTime() / 1000);
let measureTime = `measurements.${appName}.measure_time`;

let free, hobby, standard1x;
free = hobby = standard1x = 512;
let standard2x = 1024;
let performancem = 2500;
let performancel = 14000;

LibratoMeasurementArchive
    .aggregate()
    // .unwind({ path: `$measurements.${appName}` })
    .match({ [measureTime]: { $gt: unixTime } }) // ComputedPropertyName - Template literals cannot be used as key in an object literal. Use a computed property instead:
    .group({
        _id: '$attributes.display_units_long',
        'measurementsValueAvg': {
            $avg: `$measurements.${appName}.value`
        },
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
        if (reading._id == 'Megabytes') {
            var maxReading = Math.max(...reading.measurementsValueMax);
            var popped = 1;
            var newarr = reading.measurementsValueMax.slice();

            if (dynoTypes.includes('performance-l')) {
                var memUsedPercent = (maxReading / performancel * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += 'Aim to use no more than 80% of the available memory.';
                }
            } else if (dynoTypes.includes('performance-m')) {
                var memUsedPercent = (maxReading / performancem * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += 'Aim to use no more than 80% of the available memory.';
                }
            } else if (dynoTypes.includes('standard-2x')) {
                var memUsedPercent = (maxReading / standard2x * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += 'Aim to use no more than 80% of the available memory.';
                }
            } else if (dynoTypes.includes('free') || dynoTypes.includes('hobby') || dynoTypes.includes('standard-1x')) {
                var memUsedPercent = (maxReading / standard1x * 100).toFixed(2);
                stats.memoryPercent = `The maximum memory that your app has used is ${memUsedPercent}% of the allocated memory.`;
                if (memUsedPercent > 80) {
                    recommendations.memoryPercent += 'Aim to use no more than 80% of the available memory.';
                }
            }

            series(newarr, newarr.pop());
            // IDEA: Refine this function. It currently checks every val. Needs more sampling.
            function series(measurementsValueMax, val) {
                var preval = measurementsValueMax.pop();
                if (val > preval) {
                    popped = popped + 1;
                    series(measurementsValueMax, preval);
                }
            }
            if (popped == reading.measurementsValueMax.length) {
                recommendations.memleak += `The app's memory usage has been growing on a daily basis. This probably indicates a memory leak in the application. We recommend investigating possible memory leak causes in the application. https://blog.codeship.com/debugging-a-memory-leak-on-heroku/`;
            }
        }
    }


}

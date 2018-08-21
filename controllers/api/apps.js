let router = require('express').Router();
let AppList = require('../../models/apps.model');

let appdoc = '';
let appId = '';

router
    .get('/:userId', (req, res) => {
        AppList
            .findOne({ '_id': req.params.userId })
            .select('apps')
            .exec()
            .then((doc) => {
                appdoc = doc;
                res.render('appList', { applist: doc, appId: appId });
            }).catch((err) => {
                res.render('errorPage', { error: err });
            });
    })

    .post('/:appId', (req, res) => {
        res.render('appList', { applist: appdoc, appId: req.body.appId });
    });


module.exports = router;
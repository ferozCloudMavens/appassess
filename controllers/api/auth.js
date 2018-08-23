let router = require('express').Router();

var tokenCtrl = require('../token.controller');
let AppListCtrl = require('../applist.controller');

let url = '/api/apps/';
let code = '';

router.get('/', (req, res) => {
  code = req.query.code;
  tokenCtrl(code)
    .then((token) => {
      url = url+token.user_id;
      AppListCtrl(token, false);
      res.render('oauth-resp', { url: url, code: code })
    }).catch((err) => {
      res.render('errorPage', { error: err });
    });
});

module.exports = router;
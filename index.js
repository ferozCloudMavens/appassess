let express = require('express');

let url = encodeURI(`https://id.heroku.com/oauth/authorize?client_id=${process.env.HEROKU_OAUTH_ID}&response_type=code&scope=global&state=samplestate`);
let code = '';

express()
  .set('view engine', 'ejs')
  .use(require('./controllers/api/main'))
  .get('/', (req, res) => {
    res.render('index', { url: url, code: code });
  })
  .listen(4000, () => console.log('App listening on port 4000!'));
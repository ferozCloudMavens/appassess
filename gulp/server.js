var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

gulp.task('dev:server', () => {
    nodemon({
        exec: 'heroku local',
        signal: 'SIGTERM',
        ext: 'js html css ejs',
        // ignore: ['ng*', 'assets*', 'gulp*']
    });
});
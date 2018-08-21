var fs = require('fs');
var gulp = require('gulp');

fs.readdirSync(__dirname + '/gulp')
    .forEach(((task) => {
        require('./gulp/' + task);
    }));


gulp.task('dev', ['dev:server']);
var path = require('path');
var gutil = require('gulp-util');
var uglify = require('uglify-js');
var cleancss = require('clean-css');
var through = require('through2');

var PLUGIN_NAME = 'gulp-minify-inline';

module.exports = function(options) {
    options = options || {
        silent: true
    };
    options.js = options.js || {};
    options.js.fromString = true;
    options.filter = function(file) {
        return /^\.html?$/.test(path.extname(file.path));
    };

    return through.obj(function(file, enc, cb) {
        var self = this;

        if (file.isNull()) {
            this.push(file);
            return cb();
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return cb();
        }

        // filter files
        if (!options.filter(file)) {
            !options.silent && gutil.log(gutil.colors.red('[WARN] file ' + file.path + ' is ignored!'));
            this.push(file);
            return cb();
        }

        !options.silent && gutil.log("minify inline html file: " + file.path);

        var html = file.contents.toString('utf8');
        var scriptReg = /(<script(?![^>]*?\b(?:type=['"]?text\/(?:template|plain)['"]?|do-not-minify=['"]?true['"]?|src=))[^>]*?>)([\s\S]*?)<\/script>/ig;
        var cssReg = /(<style(?![^>]*?\b(?:do-not-minify=['"]?true['"]?))[^>]*?>)([\s\S]*?)<\/style>/ig;

        html = html
            .replace(scriptReg, function(str, tagStart, script) {
                try {
                    var result = uglify.minify(script, options.js);
                    return tagStart + result.code + '</script>';
                } catch (e) {
                    gutil.log('-----------------------------------');
                    gutil.log('minify inline scripts error in file: ' + file.path);
                    gutil.log(script);
                    gutil.log('-----------------------------------');
                }
            })
            .replace(cssReg, function(str, tagStart, css) {
                try {
                    var result = new cleancss(options.css).minify(css);
                    return tagStart + result.styles + '</style>';
                } catch (e) {
                    gutil.log('-----------------------------------');
                    gutil.log('minify inline css error in file: ' + file.path);
                    gutil.log(css);
                    gutil.log('-----------------------------------');
                }
            });

        file.contents = new Buffer(html);
        this.push(file);
        cb();
    });
};
var fs = require('fs');
var events = require('events');
var util = require('util');

function RouteWatcher(app, require) {

    events.EventEmitter.call(this);

    var self = this;

    function makeRoute(path) {
        var realPath = require.resolve(path);
        console.log('watching ' + realPath);
        var module = require(realPath);
        function watch() {
            fs.watch(realPath, {persistent: false}, function() {}).once('change', function() {
                setTimeout(function() {
                    console.log('reloading ' + realPath);
                    delete require.cache[realPath]
                    module = null
                    module = require(realPath)
                    watch();
                }, 50);
            })
        }
        watch();
        var f = function(req, res, next) {
            if(module) {
                module.apply(null, arguments)
            } else {
                next()
            }
        }
        f.watchedRoute = true;
        return f;
    }

    function plumb(routes) {
        for(var i in routes) {
            var route = routes[i]
            var key = route.regexp ? Regexp.new(route.regexp, route.flags) : route.path;
            if (!app.routes.lookup(key).watchedRoute) {
                app[route.method](key, makeRoute("./routes/" + route.module))
                self.emit('newRoute', route);  
            }
        }
    }

    this.watch = function watch(routesFile) {
        fs.watch(routesFile, { persistent: false }, function() {}).once('change', function() {
            console.log("reloading " + routesFile);
            setTimeout(function() {
                this.load(routesFile);
                this.watch(routesFile);
            }, 50);
        })
    }

    var readyHasFired = false;

    this.load = function load(routesFile) {
        console.log("loading " + routesFile);
        fs.readFile(routesFile, function(err, data) {
            if(err) {
                console.log(err);
                return;
            }
            plumb(JSON.parse(data))
            if (!readyHasFired) {
                readyHasFired = true;
                self.emit('ready');
            }
        });
    }
}

util.inherits(RouteWatcher, events.EventEmitter);

exports.createRouteWatcher = function(app, require) {
    return new RouteWatcher(app, require)
}

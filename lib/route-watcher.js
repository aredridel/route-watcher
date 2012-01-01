var fs = require('fs');

function makeRoute(path, require) {
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

function plumb(app, routes, require) {
    console.log("plumbing routes", routes);
    for(var i in routes) {
        var route = routes[i]
        console.log('plumbing ' + route.method + ' of ' +route.path + ' to ' + route.module);
        var key = route.regexp ? Regexp.new(route.regexp, route.flags) : route.path;
        if (!app.routes.lookup(key).watchedRoute) {
            app[route.method](key, makeRoute("./routes/" + route.module, require))
        }
    }
}

exports.watch = function watch(app, routesFile, require) {
    fs.watch(routesFile, { persistent: false }, function() {}).once('change', function() {
        console.log("reloading " + routesFile);
        setTimeout(function() {
            exports.load(app, routesFile, require);
            exports.watch(app, routesFile, require);
        }, 50);
    })
}

exports.load = function load(app, routesFile, require) {
    console.log("loading " + routesFile);
    fs.readFile(routesFile, function(err, data) {
        if(err) {
            console.log(err);
            return;
        }
        plumb(app, JSON.parse(data), require)
    });
}

exports.loadSync = function loadSync(app, routesFile, require) {
    plumb(app, JSON.parse(fs.readFileSync(routesFile)), require);
    exports.watch(app, routesFile, require);
}

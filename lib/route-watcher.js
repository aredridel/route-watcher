var fs = require('fs');

exports.route = function route(path, require) {
    var realPath = require.resolve(path);
    console.log('watching ' + realPath);
    module = require(realPath)
    fs.watch(realPath, {persistent: false}, function() {
        delete require.cache[realPath]
        module = null
        module = require(realPath)
    })
    return function(req, res, next) {
        if(module) {
            module.apply(null, arguments)
        } else {
            next()
        }
    }
}

exports.plumb = function plumb(app, routes, require) {
    for(var i in routes) {
        var route = routes[i]
        console.log('plumbing ' +route.path + ' to ' + route.module);
        app[route.method](route.path, exports.route("./routes/" + route.module, require))
    }
}

exports.load = function load(app, routesFile, require) {
    fs.watch(routesFile, { persistent: false }, function() {
        fs.readFile(routesFile, function(data) {
            exports.plumb(JSON.parse(data), require)
        })
    });
}

exports.loadSync = function loadSync(app, routesFile, require) {
    exports.plumb(app, JSON.parse(fs.readFileSync(routesFile)), require);
    exports.load(app, routesFile, require);
}


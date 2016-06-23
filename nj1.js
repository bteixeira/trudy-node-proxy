var httpProxy = require('http-proxy');
var http = require('http');

var proxy = httpProxy.createProxyServer();

proxy.on('proxyRes', function (res) {
    res.statusCode = 418;
});

http.createServer(function (req, res) {
    proxy.web(req, res, {target: req.url});
}).listen(8080);

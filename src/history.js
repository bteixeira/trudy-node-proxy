var http = require('http');
var url = require('url');
var utils = require(__dirname + '/utils');

exports.start = function (history, port) {
    http.createServer(function (request, response) {
        console.log('History request');
        response.writeHead(200, {'Content-Type': 'text/html'});
        var path = url.parse(request.url).path.substr(1);
        response.write('<!DOCTYPE html><head> <script src="http://code.jquery.com/jquery-1.10.2.min.js"></script><script>$(function(){$(\'#clear\').click(function(ev){ev.preventDefault();$.ajax(\'clear\');})})</script><style>td { border: 1px solid gray; } body { white-space: pre; font-family: monospace; } table { width: 100%; } td.wrap {white-space: normal; word-wrap: break-word; } </style></head><body>');
        var entry;
        if (!path) {
            response.write('<table><tr><th>Time</th><th>Origin</th><th>Method</th><th>Host</th><th>Status</th><th>Data</th><th>Headers</th><th>Path</th></tr>');
            for (var i = 0; i < history.length; i++) {

                entry = history[i];
                response.write('<tr><td>' + utils.formatTime(entry.time) + '</td><td>' + entry.origin + '</td><td>' +

                    (entry.method === 'POST' ? '<a href="post/' + i + '">POST</a>' : entry.method) +

                    '</td><td>' + entry.host + '</td><td>' + entry.status + '</td><td><a href="' + i +
                    '">View</a></td><td><a href="headers/' + i + '">View</a></td>' +
                    '<td>' + entry.path + '</td></tr>');
            }
            response.write('</table><a id="clear" href="clear">Clear</a>');
        } else {
            if (path === 'clear') {
                history = [];
            } else if (path.indexOf('post') === 0) {
                response.write('<table>');
                var post = history[path.substr(5)].post;
                for (var p in post) {
                    response.write('<tr><th>' + p + '</th><td>' + post[p] + '</td></tr>');
                }
                response.write('</table>');
            } else if (path.indexOf('headers') === 0) {
                response.write('<h3>Request</h3><table>');
                var headers = history[path.substr(8)].requestHeaders;
                for (var h in headers) {
                    response.write('<tr><th>' + h + '</th><td>' + headers[h] + '</td></tr>');
                }
                response.write('</table>');
                response.write('<h3>Response</h3><table>');
                headers = history[path.substr(8)].responseHeaders;
                for (h in headers) {
                    response.write('<tr><th>' + h + '</th><td>' + headers[h] + '</td></tr>');
                }
                response.write('</table>');
            } else if (history[path]) {
                response.write('' + history[path].data.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
            }
        }
        response.end('</body>');
    }).listen(port, function () {
        console.log('History available on port ' + port + '\n');
    });
};

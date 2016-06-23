var http = require('http');
var url = require('url');
var qs = require('querystring');
var history = require(__dirname + '/src/history');

var mappings = {
};

//mappings['frames/form'] = 							['localhost', 8081, '/creditcard-gateway/frames/form'];
//mappings['frames/css/pci.css'] =					['localhost', 8081, '/creditcard-gateway/frames/css/pci.css'];
//mappings['frames/js/jquery-1.7.1.min.js'] =	 		['localhost', 8081, '/creditcard-gateway/frames/js/jquery-1.7.1.min.js'];
//mappings['frames/js/jquery.validate.js'] = 			['localhost', 8081, '/creditcard-gateway/frames/js/jquery.validate.js'];
//mappings['frames/js/jquery.ba-postmessage.js'] =	['localhost', 8081, '/creditcard-gateway/frames/js/jquery.ba-postmessage.js'];
//mappings['frames/js/zal.cc-iframe.js'] = 			['localhost', 8081, '/creditcard-gateway/frames/js/zal.cc-iframe.js'];
//mappings['frames/img/sprite.png'] = 				['localhost', 8081, '/creditcard-gateway/frames/img/sprite.png'];

var server = http.createServer(function(request, response) {

	var entry = history.log(request);

    var log = nextLogger();

    log(request.connection.remoteAddress + '\t' + request.method + '\t' + request.headers.host + '\t' + url.parse(request.url).path);

	var items;
	var options = {
		hostname: request.headers.host,
		method: request.method
	};
	if (options.hostname.indexOf(':') >= 0) {
		items = options.hostname.split(':');
		options.hostname = items[0];
		options.port = items[1];
		log('\t\tChanged:\t[' + options.hostname + '] [' + options.port + '] [' + options.path + ']');
	}
	options.path = url.parse(request.url).path;

	var re, settings, changed = false;
	for (m in mappings) {
		re = new RegExp('.+' + m + '(.*)');
		settings = mappings[m];
		if (re.test(options.path)) {
			options.hostname = settings[0];
			options.port = settings[1];
			options.path = settings[2] + re.exec(options.path)[1];
			log('\t\tChanged:\t[' + options.hostname + '] [' + options.port + '] [' + options.path + ']');
			options['proxy-connection'] = 'keep-alive';
			changed = true;
		}
	}
	options.headers = request.headers;
	if (changed) {
		delete options.headers.host;
		delete options.headers.hostname;
		delete options.headers.port;
		delete options.headers.path;
		delete options.headers['proxy-connection'];
	}

	var proxy_request = http.request(options, function(proxy_response) {
		var status = proxy_response.statusCode;
		if (status >= 300 && status < 400 && proxy_response.headers.location) {
			log('\t\tStatus:\t' + status + ' [' + proxy_response.headers.location + ']');
		} else {
			log('\t\tStatus:\t' + status);
		}
		entry.status = status;
        entry.responseHeaders = proxy_response.headers;
		response.writeHead(status, proxy_response.headers);
		
		proxy_response.on('data', function (chunk) {
			var str = chunk.toString();
			entry.data += str;
			if (str.indexOf('integration') !== -1) {
				str = str.replace(/de-integration\.zalando/g, 'zalando.de-local');
				response.write(str);
				return;
			}

			response.write(chunk, 'binary');
			
		});

		proxy_response.on('end', function() {
			log('\t\t(end.)');
			response.end();
		});
	});
	
	proxy_request.on('error', function(e) {
		log('\t\tERROR ON REQUEST: ' + e.message);
		response.writeHead(418, {'Content-Type': 'text/plain'});
		response.end('Error: Proxy could not connect to host (' + request.headers['host'] + ')');
	});

    request.on('data', function(data) {
        proxy_request.write(data, 'binary');
    });

    request.on('end', function() {
        proxy_request.end();
    });

    if (request.method === 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            entry.post = qs.parse(body);
        });
    }
	
});

//server.on('connect', function(socket) {
//});

var PORT = 9001;

server.listen(PORT, function() {
	var messages = [
			'Shields up, weapons online.',
			'It\'s time to kick ass and chew bubble gum.\nAnd I\'m all out of gum.',
			'This is a local proxy for local people.\nThere\'s nothing for you here.'
	];
	var msg = messages[Math.floor(Math.random() * messages.length)];
	console.log('\n' + msg + '\n');
	console.log('Ready on port ' + PORT + (PORT > 9000 ? ' (over nine thousand)' : ''));
	var os = require('os');
	var ifaces = os.networkInterfaces();
	for (var dev in ifaces) {
		var alias = 0;
		ifaces[dev].forEach(function (details) {
			if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
				console.log('Local address ' + dev + (alias ? ':' + alias : ''), details.address);
				++alias;
			}
		});
	}
});

var PORT_HISTORY = 9002;
history.start(PORT_HISTORY);

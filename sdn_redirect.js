var http = require('http');
var url = require('url');
var qs = require('querystring');

var mappings = {

//	'web/js/jquery-1.7.1.min.js'

//	, 'api/mobile/v2': ['localhost', 8080, '/shop/api/mobile/v2']
//	, 'kasse/zahlungsart': ['www.zalando.de-local', 8080, '/shop/kasse/zahlungsart']
//'shop/': ['www.zalando.de-local', 8080, '/shop/']
//'shop/soft/login': ['www.zalando.de-local', 8080, '/shop/soft/login']
};

mappings['frames/form'] = 							['localhost', 8081, '/creditcard-gateway/frames/form'];
mappings['frames/css/pci.css'] =					['localhost', 8081, '/creditcard-gateway/frames/css/pci.css'];
mappings['frames/js/jquery-1.7.1.min.js'] =	 		['localhost', 8081, '/creditcard-gateway/frames/js/jquery-1.7.1.min.js'];
mappings['frames/js/jquery.validate.js'] = 			['localhost', 8081, '/creditcard-gateway/frames/js/jquery.validate.js'];
mappings['frames/js/jquery.ba-postmessage.js'] =	['localhost', 8081, '/creditcard-gateway/frames/js/jquery.ba-postmessage.js'];
mappings['frames/js/zal.cc-iframe.js'] = 			['localhost', 8081, '/creditcard-gateway/frames/js/zal.cc-iframe.js'];
mappings['frames/img/sprite.png'] = 				['localhost', 8081, '/creditcard-gateway/frames/img/sprite.png'];

//mappings['api/mobile/v2'] = 	['www.zalando.de-local', 8080, '/api/mobile/v2'];

/* Filters for full dumping (but no changing) */
full = ['Zahlungsart'];

var i = 1000;

/* shrinks a string to a certain length by taking out enough characters in the middle and replacing them with ellipsis */
function shrink(what, length) {
	if (what.length <= length) {
		return what;
	}
	var left = what.substr(0, length / 2);
	var right = what.substr(what.length - length / 2 + 1);
	return left + '⋯' + right;
}

function dateFormat (date, fstr, utc) {
	utc = utc ? 'getUTC' : 'get';
	return fstr.replace(/%[YmdHMSl]/g, function (m) {
		switch (m) {
			case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
			case '%m': m = 1 + date[utc + 'Month'] (); break;
			case '%d': m = date[utc + 'Date'] (); break;
			case '%H': m = date[utc + 'Hours'] (); break;
			case '%M': m = date[utc + 'Minutes'] (); break;
			case '%S': m = date[utc + 'Seconds'] (); break;
			case '%l': var l = date[utc + 'Milliseconds'] (); return l < 100 ? '0' + l : l;
			default: return m.slice (1); // unknown code, remove %
		}
		// add leading zero if required
		return ('0' + m).slice (-2);
	});
}

function fmt(time) {
	return dateFormat(time, '%H:%M:%S,%l');
}

history = [];

var server = http.createServer(function(request, response) {

	var entry = {
		time: new Date(),
		origin: request.connection.remoteAddress,
		method: request.method,
		host: request.headers.host,
		path: url.parse(request.url).path,
		data: '',
        requestHeaders: request.headers
	};
	history.push(entry);

	var n = i++;
	function log() {
		Array.prototype.unshift.call(arguments, n + ' ');
		console.log.apply(null, arguments);
	}
	
	request.on('data', function(data) {
		//console.log('XXX GOT REQUEST DATA!!!');
		//console.log(request.headers);	
		//console.log(data);
		proxy_request.write(data, 'binary');
	});
	
	request.on('end', function() {
		//console.log('XXX REQUEST DATA ENDED!!!');
		proxy_request.end();
	});
	
	
	log(request.connection.remoteAddress + '\t' + request.method + '\t' + request.headers.host + '\t' + url.parse(request.url).path);
	if (request.method === 'POST') {
		var body = '';
		request.on('data', function (data) {
			body += data;
		});
		request.on('end', function () {
			var post = qs.parse(body);
			entry.post = post;
			log(post);
		});
	}
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
	/**
	if (options.hostname === 'www.de-integration.zalando') {
		options.hostname = 'www.zalando.de-local';
		console.log('\t\tChanged:\t[' + options.hostname + '] [' + options.port + '] [' + options.path + ']');
	}
	/**/
	
	options.path = url.parse(request.url).path;

	/**/
	
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
		} else {
			//console.log(re + ' did not match ' + options.path);
		}
	}
	/**/
	options.headers = request.headers;
	if (changed) {
		delete options.headers.host;
		delete options.headers.hostname;
		delete options.headers.port;
		delete options.headers.path;
		delete options.headers['proxy-connection'];
	}
	
	/**/
	
	/*if (!changed) {
		options.headers = request.headers;
	}*/
	//console.log('>>> ', options);
	
	var proxy_request = http.request(options, function(proxy_response) {
		var status = proxy_response.statusCode;
		if (status >= 300 && status < 400 && proxy_response.headers.location) {
			log('\t\tStatus:\t' + status + ' [' + proxy_response.headers.location + ']');
		} else {
			log('\t\tStatus:\t' + status);
		}
		entry.status = status;
		/*
		console.log('HEADERS:\n');
		for (h in res.headers) {
			if (res.headers.hasOwnProperty(h)) {
				console.log('\t' + h + ':\t\t' + res.headers[h]);
			}
		}
		 //+ JSON.stringify(res.headers));
		res.setEncoding('utf8');*/
		
		
		//response.writeHead(200, {'Content-Type': 'text/plain'});
        entry.responseHeaders = proxy_response.headers;
		response.writeHead(status, proxy_response.headers);
		
		proxy_response.on('data', function (chunk) {
			//log('\t\tData for:\t' + request.headers.host + '\t' + shrink(url.parse(request.url).path, 120));
			//log('\t\tData for:\t' + request.headers.host);
			//log('\t\t%%%%%', chunk);
			var str = chunk.toString();
			entry.data += str;
			//log('\t\t%%%%%', str.substr(0, 120));
			/**/
			if (str.indexOf('integration') !== -1) {
				//log('\t\t%%%%%', shrink(str, 120));
				str = str.replace(/de-integration\.zalando/g, 'zalando.de-local');
				//log('\t\t%%%%%', str.substr(0, 120));
				response.write(str);
				return;
			}
			
			/*
			for (var i = 0 ; i < full.length ; i++) {
				if (str.indexOf(full[i]) !== -1) {
					log('\t\t%%%%% ', str);
					break;
				}
			}
			/**/
			
			response.write(chunk, 'binary');
			
		});
		/**/
		
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
	
	//proxy_request.end();
});

server.on('connect', function(socket) {
	//console.log('XXX CONNECT!!!');
});

var PORT = 9001;

server.listen(PORT, function() {
	var messages = [
			'Shields up, weapons online.',
			'It\'s time to kick ass and chew bubble gum.\nAnd I\'m all out of gum.',
			'This is a local proxy for local people. There\'s nothing for you here.'
	];
	var msg = messages[Math.floor(Math.random() * messages.length)];
	console.log(msg + '\n');
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

var historyServer = http.createServer(function(request, response) {
	console.log('History request');
	response.writeHead(200, {'Content-Type': 'text/html'});
	var path = url.parse(request.url).path.substr(1);
	response.write('<!DOCTYPE html><head> <script src="http://code.jquery.com/jquery-1.10.2.min.js"></script><script>$(function(){$(\'#clear\').click(function(ev){ev.preventDefault();$.ajax(\'clear\');})})</script><style>td { border: 1px solid gray; } body { white-space: pre; font-family: monospace; } table { width: 100%; } td.wrap {white-space: normal; word-wrap: break-word; } </style></head><body>');
	var entry;
	if (!path) {
		//response.end('hi there -- no path');
		response.write('<table><tr><th>Time</th><th>Origin</th><th>Method</th><th>Host</th><th>Status</th><th>Data</th><th>Headers</th><th>Path</th></tr>');
		for (var i = 0 ; i < history.length ; i++) {
			
			entry = history[i];
			response.write('<tr><td>' + fmt(entry.time) + '</td><td>' + entry.origin + '</td><td>' +
			
			(entry.method === 'POST' ? '<a href="post/' + i + '">POST</a>' : entry.method) +
			
			'</td><td>' + entry.host + '</td><td>' + entry.status + '</td><td><a href="' + i + '">View</a></td><td><a href="headers/' + i + '">View</a></td>' +
            '<td>' + entry.path + '</td></tr>');
		}
		response.write('</table><a id="clear" href="clear">Clear</a>');
	} else {
		//response.write('hi there -- path is ' + path + ' [' + typeof path + ']');
		//console.log
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
			//response.write('' + history[path].time);
			response.write('' + history[path].data.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
		}
	}
	response.end('</body>');
}).listen(PORT_HISTORY, function() {
	console.log('History available on port ' + PORT_HISTORY + '\n');
});

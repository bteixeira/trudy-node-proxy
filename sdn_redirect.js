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

//mappings['frames/form'] = 					['localhost', 8081, '/creditcard-gateway/frames/form'];
//mappings['frames/js/zal.cc-iframe.js'] = 	['localhost', 8081, '/creditcard-gateway/frames/js/zal.cc-iframe.js'];
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

var server = http.createServer(function(request, response) {

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
			var POST = qs.parse(body);
			log(POST);
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
		for (h in proxy_response.headers) {
			if (proxy_response.headers.hasOwnProperty(h)) {
				//console.log('\t' + h + ':\t\t' + proxy_response.headers[h]);
			}
		}
		response.writeHead(status, proxy_response.headers);
		
		proxy_response.on('data', function (chunk) {
			//log('\t\tData for:\t' + request.headers.host + '\t' + shrink(url.parse(request.url).path, 120));
			//log('\t\tData for:\t' + request.headers.host);
			//log('\t\t%%%%%', chunk);
			var str = chunk.toString();
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

var port = 9001;

server.listen(port, function() {
	var messages = [
			'Shields up, weapons online.'
	];
	var msg = messages[Math.floor(Math.random() * messages.length)];
	console.log(msg);
	console.log('Ready on port ' + port);
});

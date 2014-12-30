'use strict';

var express = require('express');
var app = express();
var gm = require('gm');
var request = require('request');
var host = process.argv[2];

function sendError(res) {
	res.writeHead(400, {
		'Content-type': 'text/plain'
	});
	res.end();
}

function tryGM(body, width, height, res, flag) {
	console.log('trying with gm module');

	var image = gm(body);
	if (flag) {
		image.size(function(err, size) {
			var ratio = Infinity;

			if (flag.indexOf('z') !== -1) {
				ratio = Math.min(width, size.width) / size.width;
			}
			if (flag.indexOf('y') !== -1) {
				ratio = Math.min(ratio, Math.min(height, size.height) / size.height);
			}

			width = size.width * ratio;
			height = size.height * ratio;

			image.scale(width, height).toBuffer('JPEG', function (err, buffer) {
				if (err) {
					console.error(err);
					sendError(res);
				} else {
					res.writeHead(200, {
						'Content-Type': 'image/jpeg',
						'Content-Length': buffer.length
					});

					res.write(buffer);

					res.end();
				}
			});
		});
	}

}

app.get('*', function(req, res) {
	if (req.headers['user-agent'] && req.headers['user-agent'].indexOf('ELB-HealthChecker') !== -1) {
		res.writeHead(200, {
			'Content-type': 'text/plain'
		});
		res.end();
	} else {
		try {
			var image = host + req.url.replace('/t/', '/i/').replace(/_[^.]*/, ''); // removes _YYYxZZZ extension and changes base folder.
			var dimensions = req.path.replace('.jpg', '').split('/');
			dimensions = dimensions[dimensions.length-1].split('_')[1].split('x');
			if (dimensions.length !== 2) {
				throw new Error('invalid url');
			}
			var flag = dimensions[1][dimensions[1].length-2];

			if (flag.indexOf('y') === -1 && flag.indexOf('z') === -1) {
				flag = false;
			}

			dimensions[1] = dimensions[1].replace(/z+y+/g,'');

			console.log(dimensions);

			var width = parseFloat(dimensions[0]);
			var height = parseFloat(dimensions[1]);

			console.log(image);
			request.get({
				url: image,
				encoding: null
			}, function(error, response, body) {
				// obtain an image object:
				require('lwip').open(body, 'jpg', function(err, image){
					if (!err && image) {
						var ratio = Infinity;
						if (flag) {
							if (flag.indexOf('z') !== -1) {
								ratio = Math.min(width, image.width()) / image.width();
							}
							if (flag.indexOf('y') !== -1) {
								ratio = Math.min(ratio, Math.min(height, image.height()) / image.height());
							}
						} else {
							ratio = Math.min(width / image.width(), height / image.height());
						}

						image.batch().scale(ratio).toBuffer('jpg', {}, function(err, image){
							res.writeHead(200, {
								'Content-Length': image.length,
								'Content-Type':  'image/jpeg'
							});
							res.write(image);
							res.end();
						});
					} else {
						tryGM(body, width, height, res, flag);
					}
				});
			});
		} catch (e) {
			console.log('error', req.headers, req.url);
			sendError(res);
		}
	}
});


console.log('listening on localhost:80');
app.listen(80, '0.0.0.0');

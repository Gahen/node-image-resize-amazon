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

function tryGM(body, width, height, res) {
    gm(body).resize(width,height).toBuffer('JPEG', function (err, buffer) {
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
						var wratio = width / image.width();
						var hratio = height / image.height();
						var ratio = Math.min(wratio, hratio);

						image.batch().scale(ratio).toBuffer('jpg', {}, function(err, image){
							res.writeHead(200, {
								'Content-Length': image.length,
								'Content-Type':  'image/jpeg'
							});
							res.write(image);
							res.end();
						});
					} else {
						tryGM(body, width, height, res);
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

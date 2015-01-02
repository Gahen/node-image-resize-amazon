'use strict';

var express = require('express');
var app = express();
var gm = require('gm');
var request = require('request');
var host = process.argv[2];
var bucket = process.argv[3];

function uploadToAmazon(image, key) {
	if (!bucket) {
		return false;
	}

	// Load the AWS SDK for Node.js
	// This assumes you have the appropiate keys set as enviroment variables.
	var AWS = require('aws-sdk');

	var s3bucket = new AWS.S3({params: {Bucket: bucket}});
	s3bucket.createBucket(function() {
	  var params = {Key: key.substr(1), Body: image, ContentType: 'image/jpeg'}; // We should check that permissions are right.
	  s3bucket.upload(params, function(err) {
		if (err) {
		  console.log('Error uploading data: ', err);
		} else {
		  console.log('Successfully uploaded data to '+bucket+key);
		}
	  });
	});
}

function sendError(res) {
	res.writeHead(400, {
		'Content-type': 'text/plain'
	});
	res.end();
}

function complete(image, res, url) {
	res.writeHead(200, {
		'Content-Type': 'image/jpeg',
		'Content-Length': image.length
	});

	res.write(image);
	res.end();

	uploadToAmazon(image, require('url').parse(url).path);
}

function tryGM(body, width, height, res, flag, dest) {
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
					complete(buffer, res, dest);
					res.end();
				}
			});
		});
	} else {
		image.scale(width, height).toBuffer('JPEG', function (err, buffer) {
			if (err) {
				console.error(err);
				sendError(res);
			} else {
				complete(buffer, res, dest);
			}
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
			var destiny = host + req.url;
			var url = destiny.replace('/t/', '/i/').replace(/_[^.]*/, ''); // removes _YYYxZZZ extension and changes base folder.
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

			console.log(url);
			request.get({
				url: url,
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
							complete(image, res, destiny);
						});
					} else {
						tryGM(body, width, height, res, flag, destiny);
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

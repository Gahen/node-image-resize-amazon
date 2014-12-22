Simple resizing deamon that may be placed behind an Amazon Cloud Front.

It redirects to the host passed as parameter replacing a "t" path for an "i" path, i.e.:

$ node index.js http://my-image-server.com

GET http://mynodeserver.com/someurl/t/someimage_100x200.jpg

will return a 100 x 200 box constrained image (scaled up or down) that would be searched on http://my-image-server.com/someurl/i/someimage.jpg

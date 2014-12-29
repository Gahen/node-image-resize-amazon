Simple resizing deamon that may be placed behind an Amazon Cloud Front.

It redirects to the host passed as parameter replacing a "t" path for an "i" path, i.e.:

<pre>
$ node index.js http://my-image-server.com
</pre>

Then doing
<pre>
GET http://mynodeserver.com/someurl/t/someimage_100x200.jpg
</pre>

will return a 100 x 200 box constrained image (scaled up or down) that would be fetched from http://my-image-server.com/someurl/i/someimage.jpg

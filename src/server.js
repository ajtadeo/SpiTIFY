/* Load the HTTP library */
var http = require("http");

/* Create an HTTP server to handle responses */
const hostname = '192.168.1.31';
const port = 8888;

http.createServer(function(request, response) {
response.writeHead(200, {"Content-Type": "text/plain"});
response.write("Hello World");
response.end();
}).listen(port, hostname);
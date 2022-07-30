const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 8888;
const hostname = '192.168.1.31';

app.get("/", (req, res) =>{
    res.sendFile(__dirname + "/app/index.html");
});

io.on("connection", (socket)=>{
    console.log(`User connected`);
});

server.listen(port, hostname, ()=>{
    console.log(`App running on ${hostname}:${port}`);
});
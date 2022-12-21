import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { getEnv } from "./static/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var loggedIn = false;

/* dotenv Setup */
const result = dotenv.config();
if (result.error){
    console.log("Spotipi: Error: dotenv not configured correctly.")
    throw result.error;
}

const port = getEnv("PORT");
const hostname = getEnv("HOSTNAME");

/* Express.js and socket.io Setup */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* Rendering Methods */
app.use("/static", express.static("./static/"));

app.get("/", (req, res) => {
    var view;
    if (loggedIn == false){
        view = "/public/views/Login.html";
    } else {
        view = "/public/views/Home.html";
    }
    res.sendFile(__dirname + view);
});

app.get("*", (req, res) => {
    res.status(404).sendFile(__dirname + "/public/views/NotFound.html");
})

/* Server connection */
io.on("connection", (socket) => {
    console.log(`User connected`);
}).on("error", (err) => {
    console.log("Spotipi: Error: socket.io error, Raspberry Pi not turned on or connected to internet.")
    console.log(err);
});

server.listen(port, hostname, () => {
    console.log(`App running on ${hostname}:${port}`);
}).on("error", (err) => {
    console.log("Spotipi: Error: Express server not configured correctly.")
    console.log(err);
});
const { assert } = require("console");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv")
var cookieParser = require('cookie-parser');
var request = require('request');
const { access } = require("fs");

/* dotenv setup */
const result = dotenv.config();
if (result.error){
    console.log("Spotipi: Error: dotenv not configured correctly.")
    throw result.error;
}
// assert(!result.error, "Spotipi: Error: dotenv not configured correctly.")

const port = process.env.PORT;
assert(port, "Spotipi: Error: PORT environment variable is required.");
const hostname = process.env.HOSTNAME;
assert(hostname, "Spotipi: Error: HOSTNAME environment variable is required.");
const client_id = process.env.SPOTIFY_CLIENT_ID;
assert(client_id, "Spotipi: Error: SPOTIFY_CLIENT_ID environment variable is required.");
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
assert(redirect_uri, "Spotipi: Error: SPOTIFY_REDIRECT_URI environment variable is required.");
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
assert(client_secret, "Spotipi: Error: SPOTIFY_CLIENT_SECRET environment variable is required.");

/* Express.js and socket.io setup */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* Cookie methods */
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
var stateKey = 'spotify_auth_state';

/* Routing methods */
app.use(cookieParser());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// request authorization from Spotify
app.get("/login", (req, res) => {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var scope = "user-read-currently-playing";
    var params = new URLSearchParams([
        ['response_type', 'code'],
        ['client_id', client_id],
        ['scope', scope],
        ['redirect_uri', redirect_uri],
        ['state', state]
    ]);
    res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

// Spotify authorization callback
app.get("/callback", (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state == null || state !== storedState) {
        var params = new URLSearchParams({ 'error': 'state_mismatch' });
        res.redirect('/#' + params.toString());
    } else {
        // get api token
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
            },
            json: true
        };

        // post response
        var status = "";
        request.post(authOptions, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token;
                var refresh_token = body.refresh_token;
                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                request.get(options, (error, response, body) => {
                    console.log(body);
                });

                // pass token to the browser
                var params = new URLSearchParams([
                    ["access_token", access_token],
                    ["refresh_token", refresh_token]
                ]);
                status = "Authorized"
                res.redirect('/#' + params.toString());
            } else {
                var params = new URLSearchParams({ "error": "invalid_token" });
                status = "Invalid Token"
                res.redirect('/#', params.toString());
            }
        });
    }
});

// refresh access token
app.get("/refresh_token", (req, res) => {
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64') },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, (error, response, body) =>{
        if (!error && response.statusCode == 200){
            var access_token = body.access_token;
            res.send({
                "access_token": access_token
            });
        }
    });
});


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
    console.log("Spotipi: Error: Express error, Raspberry Pi not turned on or connected to internet.")
    console.log(err);
});
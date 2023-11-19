// const { assert, log } = require("console");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv")
const cookieParser = require('cookie-parser');
const request = require('request');
// const { access } = require("fs");
const { Liquid } = require('liquidjs');
const { generateRandomString, getEnv } = require("./helpers");

/* dotenv setup */
const result = dotenv.config();
if (result.error) {
    console.log("Error: dotenv not configured correctly.")
    throw result.error;
}

const port = 8888;
const hostname = "localhost";
const client_id = getEnv("SPOTIFY_CLIENT_ID");
const redirect_uri = getEnv("SPOTIFY_REDIRECT_URI");
const client_secret = getEnv("SPOTIFY_CLIENT_SECRET");
var stateKey = 'spotify_auth_state';

/* Express.js setup with LiquidJS */
const app = express();
const engine = new Liquid();
app.engine("liquid", engine.express());
app.set("views", __dirname + "/views");
app.set("view engine", "liquid");
app.use(express.static(__dirname + "/static"))
app.use(cookieParser());

/* Socket.io setup */
const server = http.createServer(app);
const io = new Server(server);

// home page
app.get("/", (req, res) => {
    res.render('home');
});

// dashboard - login required
app.get("/dashboard", (req, res) => {
    if (req.cookies['access_token']) {
        var currently_playing_params = {
            url: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: { 'Authorization': 'Bearer ' + req.cookies["access_token"] },
            json: true
        };

        request.get(currently_playing_params, (error, response, body) => {
            if (response.statusCode == 200) {
                // music currently playing
                var albumURL = body.item.album.images[0].url;
                var title = body.item.name;
                var artists = body.item.artists.map((artist) => artist.name).join(', ')
                var progress = body.progress_ms;
                var duration = body.item.duration_ms;
                var nextRefresh = duration - progress;
                res.render('dashboard', {
                    user: req.cookies['user'],
                    title: title,
                    artists: artists,
                    albumURL: albumURL
                });
            } else if (response.statusCode == 204) {
                // no music currently playing
                res.render('dashboard', {
                    user: req.cookies['user'],
                    error: "Play some music to start!",
                })
            } else if (response.statusCode == 401) {
                // bad or expired token
                res.redirect("/refresh_token?next=/dashboard")
            } else {
                // invalid HTTP code received
                res.render('dashboard', {
                    user: req.cookies['user'],
                    error: 'Error: Invalid HTTP code received.'
                });
            }
        });
    } else {
        res.redirect('/')
    }
})

// request authorization from Spotify
app.get("/login", (req, res) => {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var scope = "user-read-currently-playing user-read-private user-read-email";
    var params = new URLSearchParams({
        'response_type': 'code',
        'client_id': client_id,
        'scope': scope,
        'redirect_uri': redirect_uri,
        'state': state,
        'show_dialog': true
    });
    res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

// Spotify authorization callback
app.get("/callback", (req, res) => {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state == null || state !== storedState) {
        var params = new URLSearchParams({ 'error': 'Error: State mismatch on callback.' });
        res.redirect('/?' + params.toString());
    } else {
        // generate token request
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

        // post token request
        request.post(authOptions, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                // store access token and refresh token in session cookie
                const cookieAttributes = {
                    httpOnly: true,
                    secure: true,
                }
                res.cookie("access_token", body.access_token, cookieAttributes)
                res.cookie("refresh_token", body.refresh_token, cookieAttributes);

                // username request
                var userOptions = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + body.access_token },
                    json: true
                };

                request.get(userOptions, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        // store username in cookie
                        res.cookie("user", body.display_name)
                        res.redirect('/dashboard');
                    } else {
                        var params = new URLSearchParams({ "error": "Error: Failed to fetch username from Spotify." });
                        res.redirect('/?' + params.toString());
                    }
                })
            } else {
                var params = new URLSearchParams({ "error": "Error: Invalid token in callback." });
                res.redirect('/?' + params.toString());
            }
        });
    }
});

// refresh access token
app.get("/refresh_token", (req, res) => {
    var next = req.query.next
    var refresh_token = req.cookies['refresh_token']
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            res.cookie('access_token', body.access_token)
            res.cookie('refresh_token', body.refresh_token)
            res.redirect(next)
        } else {
            var params = new URLSearchParams({ "error": "Error: Failed to fetch refresh token from Spotify" });
            res.redirect('/?' + params.toString());
        }
    });
});


/* Server connection */
io.on("connection", (socket) => {
    console.log(`User connected`);
}).on("error", (err) => {
    console.log("Error: socket.io error, Raspberry Pi not turned on or connected to internet.")
    console.log(err);
});

server.listen(port, hostname, () => {
    console.log(`App running on ${hostname}:${port}`);
}).on("error", (err) => {
    console.log("Error: Express server not configured correctly.")
    console.log(err);
});
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv")
const cookieParser = require('cookie-parser');
const request = require('request');
const { Liquid } = require('liquidjs');
const { generateRandomString, getEnv } = require("./helpers");
const { kmeans } = require("./kmeans");
const { exit } = require("process");
var session = require("express-session")
const { Client } = require('pg')

/* dotenv Setup */
const result = dotenv.config();
if (result.error) {
    console.log("Error: dotenv not configured correctly.")
    throw result.error;
}

const PORT = 8888;
const HOSTNAME = "localhost";
const CLIENT_ID = getEnv("SPOTIFY_CLIENT_ID");
const REDIRECT_URI = getEnv("SPOTIFY_REDIRECT_URI");
const CLIENT_SECRET = getEnv("SPOTIFY_CLIENT_SECRET");
const SESSION_SECRET = getEnv("SESSION_SECRET")
var stateKey = 'spotify_auth_state';

/* Express.js setup with socket.io and LiquidJS templating */
const app = express();
const engine = new Liquid();
app.engine("liquid", engine.express());
app.set("views", __dirname + "/views");
app.set("view engine", "liquid");
app.use(express.static(__dirname + "/static"))
app.use(cookieParser());
const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        // secure: true
    }
})
app.use(sessionMiddleware)
const server = createServer(app);
const io = new Server(server);
io.engine.use(sessionMiddleware);

/* Connect to Postgres DB */
// connection information is provided with .env variables
const client = new Client();
client.connect()
    .then(() => {
        console.log("Connected to PostgreSQL database")
    })
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })

async function fetchColors(albumID, albumURL) {
    var colors = ['#D9D9D9', '#D9D9D9', '#D9D9D9', '#D9D9D9', '#D9D9D9']
    try {
        const res = await client.query('SELECT * FROM colors WHERE albumID = $1 LIMIT 1;', [albumID])
        if (res.rows.length > 0) {
            colors = res.rows[0].colors
        } else {
            colors = await kmeans(albumURL)
            await client.query('INSERT INTO colors (albumID, colors) VALUES ($1, $2)', [albumID, colors])
        }
    } catch (err) {
        console.error(err)
    }
    return colors
}

function fetchCurrentlyPlaying(socket, access_token) {
    var currently_playing_params = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(currently_playing_params, async (error, response, body) => {
        if (error) {
            console.log(error)
            socket.emit('error', 'Error: Invalid response from Spotify: ' + error)
        } else if (response.statusCode == 200) {
            // response OK
            var albumURL = body.item.album.images[0].url;
            var title = body.item.name;
            var artists = body.item.artists.map((artist) => artist.name).join(', ')
            var albumID = body.item.album.id
            try {
                var colors = await fetchColors(albumID, albumURL)
                socket.emit("currentlyPlaying", title, artists, albumURL, colors)
            } catch (error) {
                socket.emit("error", "Error: Async function kmeans failed: " + error)
            }
        } else if (response.statusCode == 401) {
            // bad or expired token
            socket.emit('refreshToken')
        } else if (response.statusCode == 429) {
            // exceeded data rate
            socket.emit('error', "Error: Spotipi exceeded Spotify API data rate.")
        } else if (response.statusCode != 204) {
            // invalid HTTP code received
            socket.emit("error", "Error: invalid HTTP code received" + response.statusCode)
        }
    });
}

// home page
app.get("/", (req, res) => {
    var error = req.query['error']
    if (error) {
        res.render('home', {
            error: error
        });
    } else {
        res.render('home');
    }
});

// dashboard - login required
app.get("/dashboard", (req, res) => {
    if (req.session.user) {
        res.render('dashboard', {
            user: req.session.user,
        });
    } else {
        var params = new URLSearchParams({ "error": "Error: Login required." });
        res.redirect('/?' + params.toString())
    }
})

// request authorization from Spotify
app.get("/auth/login", (req, res) => {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var params = new URLSearchParams({
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'scope': "user-read-currently-playing user-read-private user-read-email",
        'redirect_uri': REDIRECT_URI,
        'state': state,
    });
    if (req.query['show_dialog']) {
        params.append('show_dialog', true)
    }
    res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

// Spotify authorization callback
app.get("/auth/callback", (req, res) => {
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
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            json: true
        };

        // post token request
        request.post(authOptions, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                req.session.access_token = body.access_token
                req.session.refresh_token = body.refresh_token

                var userOptions = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + body.access_token },
                    json: true
                };

                request.get(userOptions, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        req.session.user = body.display_name
                        res.redirect('/dashboard');
                    } else {
                        req.session.access_token = null
                        req.session.refresh_token = null
                        req.session.user = null
                        var params = new URLSearchParams({ "error": "Error: Failed to fetch username from Spotify." });
                        res.redirect('/?' + params.toString());
                    }
                })
            } else {
                req.session.access_token = null
                req.session.refresh_token = null
                req.session.user = null
                var params = new URLSearchParams({ "error": "Error: Invalid token in callback." });
                res.redirect('/?' + params.toString());
            }
        });
    }
});

// refresh access token
app.get("/auth/refresh_token", (req, res) => {
    if (req.session.user) {
        var refresh_token = req.session.refresh_token
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            },
            json: true
        };

        request.post(authOptions, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                const cookieAttributes = {
                    httpOnly: true,
                    secure: true,
                }
                req.session.access_token = body.access_token
                req.session.refresh_token = body.refresh_token
                res.redirect(next)
            } else {
                var params = new URLSearchParams({ "error": "Error: Failed to fetch refresh token from Spotify" });
                res.redirect('/?' + params.toString());
            }
        });
    } else {
        var params = new URLSearchParams({ "error": "Error: Login required." });
        res.redirect('/?' + params.toString())
    }
});

/* Cleanup PostgreSQL connection */
process.on('SIGINT', async () => {
    console.log("Disconnecting from PostgreSQL database")
    await client.end()
    process.exit(0)
})

/* Websocket connection */
io.on("connection", (socket) => {
    console.log("* socket.io client " + socket.id + " connected");

    var session = socket.request.session
    if (session) {
        fetchCurrentlyPlaying(socket, session.access_token); // initial fetch
        const intervalId = setInterval(() => {
            fetchCurrentlyPlaying(socket, session.access_token);
        }, 5000);

        socket.on('disconnect', () => {
            console.log('* socket.io client ' + socket.id + ' disconnected');
            clearInterval(intervalId);
        });
    }
}).on("error", (err) => {
    console.log("Error: Failed to connect to websocket, Raspberry Pi not turned on or connected to internet.")
    console.log(err);
});

/* Express Server connection */
server.listen(PORT, HOSTNAME, () => {
    console.log(`App running on ${HOSTNAME}:${PORT}`);
}).on("error", (err) => {
    console.log("Error: Express server not configured correctly.")
    console.log(err);
});
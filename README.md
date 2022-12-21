# Spotipi
This program uses Spotify API and websockets to control Raspberry Pi and display song album art on LED strip lights.
## Spotify API Setup
1. Login to https://developer.spotify.com/
2. Create the Spotipi app
3. Note the app Client ID and Client Secret
4. Set the redirect URI to http://[HOSTNAME]:[PORT]/callback/

## Express Server Setup on Raspberry Pi
1. `ssh pi@[HOSTNAME]:[PORT]`
2. `git clone https://github.com/ajtadeo/Spotipi.git`
2. `cd Spotipi`
3. `npm i`
4. `touch .env`
5. Edit `.env` to include the following variables:
```
PORT /* Raspberry Pi port */
HOSTNAME /* Raspberry Pi IP */
SPOTIFY_CLIENT_ID /* Generated from https://developer.spotify.com/ */
SPOTIFY_CLIENT_SECRET /* Generated from https://developer.spotify.com/ */
SPOTIFY_REDIRECT_URI /* http://[HOSTNAME]:[PORT]/callback/ */
```

Note: HOSTNAME should not contain "http://"

3. `pm2 start app.js`

## Running the App
1. Open `[HOSTNAME]:[PORT]` in a web browser
2. Login with Spotify Credentials

## Resources
https://dev.to/bogdaaamn/run-your-nodejs-application-on-a-headless-raspberry-pi-4jnn

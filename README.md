# Spotipi
This program uses Spotify API and websockets to control Raspberry Pi and display song album art on LED strip lights.
## Spotify API Setup
1. Login to https://developer.spotify.com/
2. Create the Spotipi app
3. Note the app Client ID and Client Secret
4. Set the redirect URI to a desired URI

## Express Server Setup
1. > npm i
2. Create `.env` file with the following entries: 

* PORT
* HOSTNAME
* SPOTIFY_CLIENT_ID
* SPOTIFY_REDIRECT_URI
* SPOTIFY_CLIENT_SECRET

3. > npm start

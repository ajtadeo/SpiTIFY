# SpotiPi
This program uses Spotify API and websockets to control Raspberry Pi and display song album art on LED strip lights.

## About SpotiPi
### Tech Stack
* Node
* Express.js
* Liquid.js
* Spotify API
* Raspberry Pi


### K-Means Clustering Algorithm
A K-Means Clustering algorithm was implemented to determine the k dominant colors for a given image.  

Given a collection of points in D-dimensional space (music preferences, birthday, etc.), natural clusters form. Such is the case with dominant colors in an image. Clustering can be applied to a weighted graph G=(V,E) where each cluster has a distance from another cluster $d_{ij}$. To determine a clustering of points that maximizes the distance between clusters such that the distance among points in those clusters are minimized, the following algorithm is used:

1. Convert the image into a 2D array of RGB values.
2. At random, select k points from the 2D array which are the k centroids.
3. For each point p in the array:
   1. Determine the Euclidean distance from p to each centroid.
   2. Add the point p to the centroid cluster with the minimum Euclidean distance.
4. Determine the mean of each of the k clusters, these are the new centroids.
5. If the new centroids = old centroids, return the resulting cluster. Else, repeat 3.

## Setup
### Spotify API
1. Login to https://developer.spotify.com/
2. Create the SpotiPi app
3. Note the app Client ID and Client Secret
4. Set the redirect URI to `http://[RASPBERRY PI IP]:8888/`

### Express Server on Raspberry Pi
1. `ssh [RASPBERRY PI IP]`
2. `git clone https://github.com/ajtadeo/Spotipi.git`
2. `cd SpotiPi`
3. `npm i`
4. `touch .env`
5. Edit `.env` to include the following variables:
```
SPOTIFY_CLIENT_ID /* Generated from https://developer.spotify.com/ */
SPOTIFY_CLIENT_SECRET /* Generated from https://developer.spotify.com/ */
SPOTIFY_REDIRECT_URI /* http://[HOSTNAME]:[PORT]/callback/ */
```
6. `pm2 start app.js`

### Using the App
1. Open `[RASPBERRY PI IP]:8888` in a web browser

## Resources
* https://dev.to/bogdaaamn/run-your-nodejs-application-on-a-headless-raspberry-pi-4jnn
* https://sonyarouje.com/2010/12/17/approach-to-count-dominant-colors-in-a-image/
* https://tatasz.github.io/dominant_colors/
* https://dordnung.de/raspberrypi-ledstrip/

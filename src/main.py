import numpy as np
import matplotlib.pyplot as plt
import cv2 as cv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

from config import * # contains spotify client ID, client secret keys

scope = "user-read-currently-playing"

client_credentials_manager=SpotifyClientCredentials(client_id=SPOTIFY_CLIENT_ID, client_secret=SPOTIFY_CLIENT_SECRET)
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(scope=scope), client_credentials_manager=client_credentials_manager)


// WEBSOCKET CONNECTION
import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
const socket = io();

socket.on("connect", () => {
  console.log("socket.io client connected")

  socket.on("currentlyPlaying", (title, artists, albumURL, colors) => {
    document.getElementById("player-artists").innerHTML = artists
    document.getElementById("player-title").innerHTML = title
    document.getElementById("player-albumart").setAttribute("src", albumURL)
    for (var i = 0; i < 5; i++){
      document.getElementById("color" + i).setAttribute("fill", colors[i])
    }
  })

  socket.on("refreshToken", () => {
    window.location.href = "/auth/refresh_token";
  })

  socket.on("exceededDataRate", () => {
    document.getElementById("error").innerHTML = "Spotipi exceeded Spotify API data rate."
  })
})


// ERROR MODAL ANIMATION
document.addEventListener('DOMContentLoaded', function () {
  var error = document.getElementById('error')
  var errorMessage = document.getElementById('error-message')

  if (errorMessage.innerHTML.trim() !== "") {
    error.style.display = 'block'
    error.style.animation = 'slideDown 0.7s ease';
    error.style.top = '0%'

    setTimeout(function () {
      error.style.animation = 'slideUp 0.7s ease';
      error.style.top = '-100%';
    }, 7000);
  }
})
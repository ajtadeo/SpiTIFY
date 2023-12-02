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

  socket.on("error", (msg) => {
    document.getElementById("error").innerHTML = msg
  })
})
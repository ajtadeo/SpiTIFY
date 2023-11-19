const { createCanvas, loadImage } = require('node-canvas')

// KMEANS ALGORITHM
async function kmeans(albumURL) {
  var colors = ['#000', '#000', '#000', '#000', '#000']
  
  // load image
  var image = await loadImage(albumURL)
  var width = image.width
  var height = image.height

  // draw image to server-side canvas and get pixel data
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  //   r    g    b    a
  //   0,  50,  50, 255, - index 1
  //  10,  90,  90, 255, - index 2
  // 127, 127, 255, 255, - index 3
  // ...
  const pixelData = imageData.data;

  console.log(pixelData)
  return colors
}

module.exports = { kmeans }
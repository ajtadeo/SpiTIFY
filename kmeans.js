const { createCanvas, loadImage } = require('node-canvas')
const MAX_ITERS = 50;

// HELPER FUNCTIONS
function RGBAToLAB(rgba) {
  // https://github.com/antimatter15/rgb-lab
  // since album art is a jpg, a = 255 for all pixels. we can disregard rgba[3]
  var r = rgba[0] / 255,
    g = rgba[1] / 255,
    b = rgba[2] / 255,
    x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
  y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
  z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

function LABtoRGBA(lab) {
  // https://github.com/antimatter15/rgb-lab
  // since album art is a jpg, a = 1 for all pixels.
  var y = (lab[0] + 16) / 116,
    x = lab[1] / 500 + y,
    z = y - lab[2] / 200,
    r, g, b;

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

  r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  b = x * 0.0557 + y * -0.2040 + z * 1.0570;

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

  return [
    Math.max(0, Math.min(1, r)) * 255,
    Math.max(0, Math.min(1, g)) * 255,
    Math.max(0, Math.min(1, b)) * 255,
    1
  ]
}

function deltaE(labA, labB) {
  // https://github.com/antimatter15/rgb-lab
  // original code, broken link: https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs
  var deltaL = labA[0] - labB[0];
  var deltaA = labA[1] - labB[1];
  var deltaB = labA[2] - labB[2];
  var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  var deltaC = c1 - c2;
  var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  var sc = 1.0 + 0.045 * c1;
  var sh = 1.0 + 0.015 * c1;
  var deltaLKlsl = deltaL / (1.0);
  var deltaCkcsc = deltaC / (sc);
  var deltaHkhsh = deltaH / (sh);
  var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

// KMEANS ALGORITHM
async function kmeans(albumURL) {
  const start = performance.now()
  console.log("Running kmeans on " + albumURL)
  var image = await loadImage(albumURL)
  var width = image.width
  var height = image.height

  // draw image to server-side canvas and get RGBA pixel data
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  // convert RGBA to LAB to group colors based on human perception
  const pixelDataRGBA = imageData.data; // [R, G, B, A, R, G, B, A, ..., R, G, B, A]
  var pixelDataLAB = [] // [[L, A, B], [L, A, B], ... [L, A, B]]
  for (var i = 0; i < pixelDataRGBA.length; i += 4) {
    var pixel = [
      pixelDataRGBA[i],
      pixelDataRGBA[i + 1],
      pixelDataRGBA[i + 2],
      pixelDataRGBA[i + 3]
    ]
    pixelDataLAB.push(RGBAToLAB(pixel))
  }

  // select k random pixels
  var centroids = []
  for (var i = 0; i < 5; i++) {
    while (true) {
      var random = Math.floor(Math.random() * pixelDataLAB.length)
      if (centroids.includes(pixelDataLAB[random]) === false) {
        centroids.push(pixelDataLAB[random])
        break
      }
    }
  }

  // repeat until centroids no longer change
  var newCentroids = []
  var iters = 0
  while (true) {
    // for each point, determine euclidean distance to each centroid and add it to the closest centroid cluster
    iters++
    var clusters = [[], [], [], [], []]
    for (var i = 0; i < pixelDataLAB.length; i++) {
      var distances = []
      for (var j = 0; j < 5; j++) {
        distances.push(deltaE(pixelDataLAB[i], centroids[j]))
      }
      var minIndex = distances.indexOf(Math.min(...distances))
      clusters[minIndex].push(pixelDataLAB[i])
    }

    // push the mean of each cluster to new centroids
    for (var i = 0; i < 5; i++) {
      var mean = []
      // find mean of LAB values
      for (var j = 0; j < 3; j++) {
        var values = clusters[i].map((x) => x[j])
        mean.push(values.reduce((acc, val) => acc + val, 0) / values.length)
      }
      newCentroids.push(mean)
    }

    if (iters === MAX_ITERS || JSON.stringify(newCentroids) === JSON.stringify(centroids)) {
      break;
    } else {
      centroids = newCentroids
      newCentroids = []
    }
  }

  // convert LAB to RGBA strings for CSS attribute
  var result = []
  for (var i = 0; i < 5; i++) {
    var rgba = LABtoRGBA(centroids[i])
    result.push("rgba(" + rgba.join(", ") + ")")
  }

  const end = performance.now()
  console.log("Time elapsed: " + (end - start) + "ms")
  return result
}

module.exports = { kmeans }
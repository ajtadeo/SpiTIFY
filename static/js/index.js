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
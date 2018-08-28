var oldLoad = window.onload;

window.onload = function() {
  document.getElementById("webpack").innerHTML = "Webpack works! ouhirt";

  if (oldLoad) {
    oldLoad();
  }
};


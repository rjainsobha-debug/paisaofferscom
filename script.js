function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert("✅ Code Copied: " + code);
}

window.onscroll = function() {
  document.getElementById("topBtn").style.display =
    window.scrollY > 200 ? "block" : "none";
};

function topFunction() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

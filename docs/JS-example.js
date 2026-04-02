// Select the div element
const box = document.getElementById("color-box");

// When mouse enters, change background to blue
box.addEventListener("mouseenter", () => {
  box.style.backgroundColor = "blue";
});

// When mouse leaves, change background back to red
box.addEventListener("mouseleave", () => {
  box.style.backgroundColor = "red";
});
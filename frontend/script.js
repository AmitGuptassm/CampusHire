let slideIndex = 0;

function showSlide(index) {

    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".dot");

    // If we reach the last slide
    if (index >= slides.length) {
        slideIndex = 0;
    }

    // If we go before the first slide
    if (index < 0) {
        slideIndex = slides.length - 1;
    }

    // Remove active class
    slides.forEach(function(slide) {
        slide.classList.remove("active");
    });

    dots.forEach(function(dot) {
        dot.classList.remove("active");
    });

    // Add active class
    slides[slideIndex].classList.add("active");
    dots[slideIndex].classList.add("active");
}


/* Next / Previous */

function changeSlide(direction) {

    slideIndex = slideIndex + direction;

    showSlide(slideIndex);
}


/* Dot navigation */

function currentSlide(index) {

    slideIndex = index;

    showSlide(slideIndex);
}


/* Automatic Slider */

setInterval(function() {

    slideIndex++;

    showSlide(slideIndex);

}, 3000);
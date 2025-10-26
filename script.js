function showSection(sectionId) {
  document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
}

// Dummy forms for now (no backend yet)
document.getElementById('voterLoginForm').addEventListener('submit', e => {
  e.preventDefault();
  alert("Voter logged in successfully (dummy).");
  showSection('votingPage');
});

document.getElementById('adminLoginForm').addEventListener('submit', e => {
  e.preventDefault();
  alert("Admin logged in successfully (dummy).");
  showSection('results');
});

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  alert("Registration successful (dummy).");
  showSection('voterLogin');
});

document.getElementById('voteForm').addEventListener('submit', e => {
  e.preventDefault();
  const selected = document.querySelector('input[name="candidate"]:checked');
  if (selected) alert(`You voted for ${selected.value} (dummy).`);
  showSection('results');
});
// Manual Image Slider
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;

document.getElementById('nextBtn').addEventListener('click', () => {
  changeSlide(currentSlide + 1);
});

document.getElementById('prevBtn').addEventListener('click', () => {
  changeSlide(currentSlide - 1);
});

function changeSlide(index) {
  slides[currentSlide].classList.remove('active');
  currentSlide = (index + totalSlides) % totalSlides; // loop slides
  slides[currentSlide].classList.add('active');
}


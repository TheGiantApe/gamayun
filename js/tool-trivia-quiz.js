/* TRIVIA_QUIZ — curated question bank, no repeats within a round, and a
   local-storage streak/best-score so replaying actually accumulates
   toward something instead of resetting to zero every visit (most
   simple trivia widgets don't reward repeat play at all). */

const TRIVIA_BANK = {
  science: [
    { q: "What gas do plants absorb from the atmosphere for photosynthesis?", a: "Carbon dioxide", d: ["Oxygen", "Nitrogen", "Hydrogen"] },
    { q: "What is the hardest naturally occurring substance on Earth?", a: "Diamond", d: ["Quartz", "Titanium", "Graphite"] },
    { q: "How many bones are in the adult human body?", a: "206", d: ["186", "226", "256"] },
    { q: "What planet has the most moons confirmed as of the mid-2020s?", a: "Saturn", d: ["Jupiter", "Uranus", "Neptune"] },
    { q: "What is the speed of light in a vacuum, approximately?", a: "300,000 km/s", d: ["150,000 km/s", "3,000 km/s", "3,000,000 km/s"] },
    { q: "What particle has a negative electric charge?", a: "Electron", d: ["Proton", "Neutron", "Positron"] },
    { q: "What is the chemical symbol for gold?", a: "Au", d: ["Ag", "Go", "Gd"] },
    { q: "What organ produces insulin?", a: "Pancreas", d: ["Liver", "Kidney", "Spleen"] },
    { q: "What is the most abundant gas in Earth's atmosphere?", a: "Nitrogen", d: ["Oxygen", "Carbon dioxide", "Argon"] },
    { q: "What force keeps planets in orbit around the sun?", a: "Gravity", d: ["Magnetism", "Friction", "Inertia"] },
    { q: "What is the boiling point of water at sea level, in Celsius?", a: "100°C", d: ["90°C", "110°C", "212°C"] },
    { q: "What is the study of fungi called?", a: "Mycology", d: ["Botany", "Entomology", "Herpetology"] },
  ],
  history: [
    { q: "In what year did the Berlin Wall fall?", a: "1989", d: ["1979", "1991", "1985"] },
    { q: "Who was the first person to walk on the Moon?", a: "Neil Armstrong", d: ["Buzz Aldrin", "Yuri Gagarin", "John Glenn"] },
    { q: "What ancient wonder stood in Alexandria?", a: "The Lighthouse of Alexandria", d: ["The Colossus of Rhodes", "The Hanging Gardens", "The Temple of Artemis"] },
    { q: "What empire built Machu Picchu?", a: "The Inca", d: ["The Maya", "The Aztec", "The Olmec"] },
    { q: "What year did World War II end?", a: "1945", d: ["1944", "1946", "1943"] },
    { q: "Who wrote the Declaration of Independence's first draft?", a: "Thomas Jefferson", d: ["Benjamin Franklin", "John Adams", "George Washington"] },
    { q: "What was the name of the ship the Pilgrims sailed on in 1620?", a: "The Mayflower", d: ["The Santa Maria", "The Nina", "The Endeavour"] },
    { q: "What century did the Renaissance begin in?", a: "14th century", d: ["12th century", "16th century", "18th century"] },
    { q: "Who was the first female Prime Minister of the United Kingdom?", a: "Margaret Thatcher", d: ["Theresa May", "Angela Merkel", "Indira Gandhi"] },
    { q: "What wall divided a European capital city until 1989?", a: "Berlin", d: ["Vienna", "Prague", "Warsaw"] },
    { q: "What was the primary language of the Roman Empire?", a: "Latin", d: ["Greek", "Italian", "Gaulish"] },
  ],
  geography: [
    { q: "What is the longest river in the world?", a: "The Nile", d: ["The Amazon", "The Yangtze", "The Mississippi"] },
    { q: "What is the smallest country in the world by area?", a: "Vatican City", d: ["Monaco", "San Marino", "Liechtenstein"] },
    { q: "What desert is the largest hot desert on Earth?", a: "The Sahara", d: ["The Gobi", "The Kalahari", "The Mojave"] },
    { q: "What mountain range separates Europe and Asia?", a: "The Urals", d: ["The Alps", "The Himalayas", "The Andes"] },
    { q: "What ocean is the largest by surface area?", a: "The Pacific", d: ["The Atlantic", "The Indian", "The Arctic"] },
    { q: "What country has the most time zones?", a: "France", d: ["Russia", "USA", "China"] },
    { q: "What is the capital of Australia?", a: "Canberra", d: ["Sydney", "Melbourne", "Perth"] },
    { q: "What is the deepest point in Earth's oceans?", a: "Mariana Trench", d: ["Puerto Rico Trench", "Java Trench", "Tonga Trench"] },
    { q: "What continent is the Sahara Desert located on?", a: "Africa", d: ["Asia", "South America", "Australia"] },
    { q: "What strait separates Asia from North America?", a: "Bering Strait", d: ["Strait of Gibraltar", "Strait of Malacca", "Cook Strait"] },
  ],
  tech: [
    { q: "What does 'HTTP' stand for?", a: "Hypertext Transfer Protocol", d: ["High Transfer Text Protocol", "Hyperlink Transit Process", "Home Tool Transfer Protocol"] },
    { q: "Who is credited as a co-founder of Apple alongside Steve Jobs?", a: "Steve Wozniak", d: ["Bill Gates", "Tim Cook", "Jony Ive"] },
    { q: "What does 'CPU' stand for?", a: "Central Processing Unit", d: ["Computer Processing Unit", "Central Program Utility", "Core Processing Unit"] },
    { q: "What year was the first iPhone released?", a: "2007", d: ["2005", "2009", "2010"] },
    { q: "What programming language is named after a snake?", a: "Python", d: ["Java", "Ruby", "C++"] },
    { q: "What does 'RAM' stand for?", a: "Random Access Memory", d: ["Rapid Access Memory", "Read-Only Access Memory", "Runtime Allocation Module"] },
    { q: "What company created the JavaScript language?", a: "Netscape", d: ["Microsoft", "Google", "Sun Microsystems"] },
    { q: "What was the first widely-used web browser called?", a: "Mosaic", d: ["Netscape Navigator", "Internet Explorer", "Chrome"] },
    { q: "What does 'URL' stand for?", a: "Uniform Resource Locator", d: ["Universal Reference Link", "United Resource Locator", "Uniform Reference Locale"] },
    { q: "What is the binary representation of the decimal number 2?", a: "10", d: ["11", "100", "01"] },
  ],
};

const TRIVIA_ROUND_SIZE = 5;
const TRIVIA_STORAGE_KEY = "gama_trivia_stats";

let triviaQueue = [];
let triviaCurrentIndex = 0;
let triviaScore = 0;
let triviaAnswered = false;

function getTriviaStats() {
  try {
    return JSON.parse(localStorage.getItem(TRIVIA_STORAGE_KEY)) || { best: 0, streak: 0 };
  } catch {
    return { best: 0, streak: 0 };
  }
}

function saveTriviaStats(stats) {
  try { localStorage.setItem(TRIVIA_STORAGE_KEY, JSON.stringify(stats)); } catch { /* localStorage unavailable - stats just won't persist */ }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newTriviaQuiz() {
  const category = document.getElementById("trivia-category").value;
  triviaQueue = shuffleArray(TRIVIA_BANK[category]).slice(0, TRIVIA_ROUND_SIZE);
  triviaCurrentIndex = 0;
  triviaScore = 0;
  renderTriviaQuestion();
}

function renderTriviaQuestion() {
  triviaAnswered = false;
  const item = triviaQueue[triviaCurrentIndex];
  document.getElementById("trivia-feedback").textContent = "";
  document.getElementById("trivia-question").textContent = `${triviaCurrentIndex + 1}/${triviaQueue.length}: ${item.q}`;
  const options = shuffleArray([item.a, ...item.d]);
  document.getElementById("trivia-options").innerHTML = options
    .map((opt) => `<button style="display:block; width:100%; text-align:left; margin-bottom:0.4rem;" onclick="executeTriviaAnswer(this, ${opt === item.a})">${opt}</button>`)
    .join("");
  renderTriviaScoreLine();
}

function renderTriviaScoreLine() {
  const stats = getTriviaStats();
  document.getElementById("trivia-score").textContent = `score: ${triviaScore}/${triviaQueue.length} this round &middot; best: ${stats.best} &middot; streak: ${stats.streak}`;
}

function executeTriviaAnswer(btn, isCorrect) {
  if (triviaAnswered) return;
  triviaAnswered = true;
  const feedback = document.getElementById("trivia-feedback");
  [...document.getElementById("trivia-options").children].forEach((b) => (b.disabled = true));

  if (isCorrect) {
    triviaScore++;
    feedback.textContent = "> correct";
    GAMA.say("success");
  } else {
    feedback.textContent = `> incorrect - the answer was: ${triviaQueue[triviaCurrentIndex].a}`;
    GAMA.say("idle");
  }

  if (triviaCurrentIndex === triviaQueue.length - 1) {
    const stats = getTriviaStats();
    stats.best = Math.max(stats.best, triviaScore);
    stats.streak = triviaScore === triviaQueue.length ? stats.streak + 1 : 0;
    saveTriviaStats(stats);
    feedback.textContent += ` — round complete: ${triviaScore}/${triviaQueue.length}`;
    renderTriviaScoreLine();
  } else {
    setTimeout(() => { triviaCurrentIndex++; renderTriviaQuestion(); }, 1200);
  }
}

document.addEventListener("DOMContentLoaded", newTriviaQuiz);

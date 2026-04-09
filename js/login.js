
const USERS_KEY = 'ja-today-users';
const AUTH_KEY  = 'ja-today-session';

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg; el.style.display = 'block';
}

async function login() {
  const email = document.getElementById('f-email').value.trim().toLowerCase();
  const pass  = document.getElementById('f-pass').value;

  if (!email || !pass) return showError('Please fill in all fields.');

  try {
    const response = await fetch('https://itsdanithelaw.github.io/Jamaica-Today/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const result = await response.json();

    if (!response.ok) return showError(result.error);

    localStorage.setItem('ja-today-session', JSON.stringify({
    name:  result.name,
    email: result.email,
    role:  result.role
}));
    window.location.href = 'ja-today.html';

  } catch(err) {
    showError('Could not connect to server. Is it running?');
  }
}

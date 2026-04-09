
const USERS_KEY = 'ja-today-users';
const AUTH_KEY  = 'ja-today-session';

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg; el.style.display = 'block';
}

async function register() {
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim().toLowerCase();
  const pass  = document.getElementById('f-pass').value;
  const pass2 = document.getElementById('f-pass2').value;

  // Frontend validation first
  if (!name)                return showError('Please enter your name.');
  if (!email.includes('@')) return showError('Please enter a valid email.');
  if (pass.length < 6)     return showError('Password must be at least 6 characters.');
  if (pass !== pass2)      return showError('Passwords do not match.');

  try {
    // Send the data to your Python server
    const response = await fetch('http://127.0.0.1:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });

    const result = await response.json();

    if (!response.ok) {
      return showError(result.error);
    }

    // Save session locally and redirect
    localStorage.setItem('ja-today-session', JSON.stringify({ name, email }));
    window.location.href = 'ja-today.html';

  } catch(err) {
    showError('Could not connect to server. Is it running?');
  }
}


// Allow Enter key
document.addEventListener('keydown', e => { if (e.key === 'Enter') register(); });

// Using native fetch

async function testFetchUsers() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nehalv@adobe.com', password: 'password123' }) // Assuming default pass
  });
  const loginJson = await loginRes.json();
  console.log('Login:', loginJson);

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Cookie:', cookie);

  const usersRes = await fetch('http://localhost:5000/api/users', {
    headers: { cookie }
  });
  const usersJson = await usersRes.text();
  console.log('Users:', usersJson);
}

testFetchUsers().catch(console.error);

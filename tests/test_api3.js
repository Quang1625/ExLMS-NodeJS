async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@exlms.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    
    if (!token) console.log('No token! Login failed:', loginData);
    
    const listRes = await fetch('http://localhost:3000/api/assignments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const id = listData.data[0]?._id;
    if (!id) return console.log('No assignments found.');

    const detRes = await fetch(`http://localhost:3000/api/assignments/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET /:id =>', detRes.status, await detRes.text());

    const dashRes = await fetch(`http://localhost:3000/api/assignments/${id}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GET /:id/dashboard =>', dashRes.status, await dashRes.text());
  } catch (err) {
    console.error(err);
  }
}
test();

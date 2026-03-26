const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  try {
    // 1. Get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@exlms.com',
      password: 'password123'
    });
    const token = loginRes.data.access_token;
    
    // 2. Get assignments list
    const listRes = await axios.get('http://localhost:5000/api/assignments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const assignments = listRes.data.data;
    if (assignments.length === 0) {
      console.log('No assignments found.');
      return;
    }
    
    const id = assignments[0]._id;
    console.log(`Testing assignment ID: ${id}`);
    
    // 3. Test GET /:id
    try {
      const detailRes = await axios.get(`http://localhost:5000/api/assignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('GET /:id SUCCESS');
    } catch (e) {
      console.error('GET /:id FAILED:', e.response?.data || e.message);
    }
    
    // 4. Test GET /:id/dashboard
    try {
      const dbRes = await axios.get(`http://localhost:5000/api/assignments/${id}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('GET /:id/dashboard SUCCESS');
    } catch (e) {
      console.error('GET /:id/dashboard FAILED:', e.response?.data || e.message);
    }
    
  } catch (err) {
    console.error('Test init failed:', err.response?.data || err.message);
  }
}
test();

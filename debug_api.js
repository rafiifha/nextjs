const jwt = require('jsonwebtoken');

// Generate an admin token
const token = jwt.sign(
  { userId: 1, email: 'admin@toko.com', role: 'admin' },
  process.env.JWT_SECRET || 'toko-naning-secret-key-2024-change-in-production',
  { expiresIn: '1d' }
);

console.log('Generated token:', token);

fetch('http://localhost:3000/api/pesanan?limit=1000000', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(async (res) => {
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Keys in response:', Object.keys(data));
  console.log('Data is array?', Array.isArray(data));
  if (data.data) {
    console.log('data.data is array?', Array.isArray(data.data));
    console.log('data.data length:', data.data.length);
    if (data.data.length > 0) {
      console.log('Sample order keys:', Object.keys(data.data[0]));
      console.log('Sample order items:', data.data[0].items);
    }
  } else {
    console.log('Sample output:', data);
  }
})
.catch(err => console.error(err));

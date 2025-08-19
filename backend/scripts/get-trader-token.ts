#!/usr/bin/env bun

async function getTraderToken() {
  try {
    const response = await fetch('http://localhost:3000/api/user/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'trader@test.com',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    
    if (data.token) {
      console.log(data.token);
    } else {
      console.error('No token received:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getTraderToken();
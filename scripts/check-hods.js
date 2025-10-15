// Quick script to call local /api/hods to inspect output
import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/hods');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Failed to fetch /api/hods', err);
  }
}

main();

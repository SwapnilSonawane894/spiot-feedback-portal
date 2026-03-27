const bcrypt = require('bcrypt');

async function run() {
  try {
    const hash = await bcrypt.hash('taware', 10);
    console.log('\n=== STAFF HASH GENERATION ===');
    console.log('Password:   taware');
    console.log('Salt Rounds: 10');
    console.log('Algorithm:  bcrypt');
    console.log('\nGenerated Hash for "taware" password:');
    console.log(hash);
    console.log('\n=== MongoDB Update Command ===');
    console.log(`db.users.updateOne(
  { email: "taware@gmail.com" },
  { $set: { hashedPassword: "${hash}" } }
)`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();

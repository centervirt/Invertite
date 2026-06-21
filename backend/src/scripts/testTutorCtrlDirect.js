const tutorCtrl = require('../controllers/tutorController');
require('dotenv').config();

async function main() {
  const req = {
    user: {
      id: '5de35dfc-c061-4d8d-9832-79db81858f60' // The user ID from the database rows we printed
    },
    body: {
      message: 'Cuando cotizo el dolar mep hoy ?'
    }
  };

  const res = {
    status(code) {
      console.log('Status code:', code);
      return this;
    },
    json(payload) {
      console.log('JSON payload returned:');
      console.log(JSON.stringify(payload, null, 2));
      return this;
    }
  };

  const next = (err) => {
    console.error('Error passed to next:', err);
  };

  console.log('Calling tutorCtrl.chat directly...');
  await tutorCtrl.chat(req, res, next);
}

main();

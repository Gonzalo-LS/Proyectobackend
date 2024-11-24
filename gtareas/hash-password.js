const bcrypt = require('bcryptjs');

const password = 'usuario321';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error generando el hash:', err);
        return;
    }
    console.log('Hash generado:', hash);
});
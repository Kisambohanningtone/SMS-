const bcrypt = require('bcrypt')
bcrypt.hash('123456', 12).then(h => console.log(h))

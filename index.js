

var app = require('./app');
const mongoose = require('mongoose');

const port = 3000;
const url = 'mongodb://localhost:27017';
const dbName = 'ticketbai';


mongoose.Promise = global.Promise;
mongoose.connect(url+"/"+dbName)
    .then( () => {
        console.log('Conexión a la BD realizada con éxito');
        app.listen(port, () => {
            console.log("Servidor corriendo correctamente en la url: localhost:"+port);
        });
    })
    .catch(err => console.log(err));


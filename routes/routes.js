var express = require('express');
var controller = require('../controller/controller');

var router = express.Router();







//Rutas


router.get('/validate', controller.validate);
router.get('/createdb', controller.createDb);
router.get('/gr', controller.getFacturaByTbai);
router.get('/agrupar', controller.agrupar);
router.get('/test', controller.test);



module.exports = router;
var express = require('express');
var controller = require('../controller/controller');

var router = express.Router();







//Rutas

router.get('/home', controller.home);
router.get('/sign', controller.sign);
router.get('/validate', controller.validate);
router.get('/generator', controller.generate);
router.get('/generate-data', controller.generateData);



module.exports = router;
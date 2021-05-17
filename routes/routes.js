var express = require('express');
var controller = require('../controller/controller');

var router = express.Router();







//Rutas


router.get('/validate', controller.validate);
router.get('/createdb', controller.createDb);
router.get('/createcassandra', controller.createDbCassandra);
router.get('/gr', controller.getFacturaByTbai);
router.get('/cassandragr', controller.getFacturaCassandra);
router.get('/agrupar', controller.agrupar);
router.get('/agruparcassandra', controller.agruparCassandra);
router.get('/test', controller.test);
router.get('/testcassandra', controller.testCassandra);
router.get('/factura', controller.unaFactura);



module.exports = router;
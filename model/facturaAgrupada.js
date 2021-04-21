'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FacturaSchema = Schema({
    nifFecha : {
        type: Schema.Types.String,
        required: true
    },
    idents : {
        type: Schema.Types.Array,
        required : true
    },
    agrupacion : {
        type: Schema.Types.String,
        required : true
    }
});

module.exports = mongoose.model('facturas_agrupada', FacturaSchema);
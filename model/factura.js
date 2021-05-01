'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FacturaSchema = Schema({
    _id : {
        type: Schema.Types.String,
        required: true
    },
    NIF : {
        type: Schema.Types.String,
        required : true
    },
    FechaExpedicionFactura : {
        type: Schema.Types.Date,
        required : true
    },
    HoraExpedicionFactura : {
        type: Schema.Types.Date,
        required : true
    },
    ImporteTotalFactura : {
        type : Schema.Types.Number,
        required: true
    },
    SerieFactura : {
        type: Schema.Types.String,
        required : true
    },
    NumFactura : {
        type: Schema.Types.String,
        required : true
    },
    Descripcion :{
        type: Schema.Types.String,
        required : true
    },
    /*DetallesFactura: {
        required : true,
        type : [
            {
                DescripcionDetalle : {
                    type: Schema.Types.String,
                    required : true
                },
                Cantidad : {
                    type: Schema.Types.Decimal128,
                    required : true
                },
                ImporteUnitario : {
                    type: Schema.Types.Number,
                    required : true
                },
                ImporteTotal : {
                    type: Schema.Types.Number,
                    required : true
                }
            }
        ]
    },*/
    FacturaComprimida : {
        required : true,
        type : Schema.Types.String
    }
});

module.exports = mongoose.model('Factura', FacturaSchema);
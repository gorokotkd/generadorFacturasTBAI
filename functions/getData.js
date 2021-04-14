'use strict'

var xpath = require('xpath');
var tbai = require('./calculateIdentTBAI');
var dom = require('xmldom').DOMParser


function getIdentTBAI(xml) {
    return tbai.getIdent(xml);
}

function getNIF(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Sujetos/Emisor/NIF/text()", doc).toString();
}

function getFechaExp(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/CabeceraFactura/FechaExpedicionFactura/text()", doc).toString();
}

/**
 * 
 * @param {*} xml 
 * @returns Si el campo no existe devuelve vacio.
 */
function getSerieFactura(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/CabeceraFactura/SerieFactura/text()", doc).toString();
}

function getImporteTotalFactura(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/DatosFactura/ImporteTotalFactura/text()", doc).toString();
}

function getNumFactura(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/CabeceraFactura/NumFactura/text()", doc).toString();
}

function getHoraExpedionFactura(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/CabeceraFactura/HoraExpedicionFactura/text()", doc).toString();
}

function getDescripcion(xml) {
    var doc = new dom().parseFromString(xml);
    return xpath.select("//Factura/DatosFactura/DescripcionFactura/text()", doc).toString();
}

function getDetallesFactura(xml) {
    var doc = new dom().parseFromString(xml);
    var numDetalles = xpath.select("count(//IDDetalleFactura)", doc);
    //console.log(numDetalles);
    var detallesFactura = [];
    for(var i = 1; i <= numDetalles; i++){ //En XPATH se empieza a contar desde 1.
        var detalle = {
            "DescripcionDetalle" : xpath.select("//IDDetalleFactura["+i+"]/DescripcionDetalle/text()", doc).toString(),
            "Cantidad" : xpath.select("//IDDetalleFactura["+i+"]/Cantidad/text()", doc).toString(),
            "ImporteUnitario" : xpath.select("//IDDetalleFactura["+i+"]/ImporteUnitario/text()", doc).toString(),
            "ImporteTotal" : xpath.select("//IDDetalleFactura["+i+"]/ImporteTotal/text()", doc).toString()
        };
        detallesFactura.push(detalle);
    }

    //console.log(detallesFactura);
    return detallesFactura;
}




module.exports = {
    getIdentTBAI : function (xml) {
        return getIdentTBAI(xml);
    },
    getNif: function (xml) {
        return getNIF(xml);
    },
    getFechaExp : function(xml){
        return getFechaExp(xml);
    },
    getSerieFactura : function(xml){
        return getSerieFactura(xml);
    },
    getImporteTotalFactura : function(xml){
        return getImporteTotalFactura(xml);
    },
    getNumFactura : function(xml){
        return getNumFactura(xml);
    },
    getHoraExpedionFactura : function(xml){
        return getHoraExpedionFactura(xml);
    },
    getDescripcion : function(xml){
        return getDescripcion(xml);
    },
    getDetallesFactura : function(xml){
        return getDetallesFactura(xml);
    }
}

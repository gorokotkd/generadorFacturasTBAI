'use strict'

var xpath = require('xpath');
var tbai = require('./calculateIdentTBAI');


function getNIF(xml) {
    return xpath.select("//Sujetos/Emisor/NIF/text()", xml);
}

function getFechaExp(xml) {
    return xpath.select("//Factura/CabeceraFactura/FechaExpedicionFactura/text()", xml);
}

/**
 * 
 * @param {*} xml 
 * @returns Puede que devuelva NULL si el campo no existe.
 */
function getSerieFactura(xml) {
    return xpath.select("//Factura/CabeceraFatura/SerieFactura/text()", xml);
}

function getImporteTotal(xml) {
    return xpath.select("//Factura/DatosFactura/ImporteTotalFactura/text()", xml);
}

function getNumFactura(xml) {
    return xpath.select("//Factura/CabeceraFactura/NumFactura/text()", xml);
}

function getIdentTBAI(xml) {
    return tbai.getIdent(xml);
}




module.exports = {

};

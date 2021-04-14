'use strict'

var xpath = require('xpath')
var dom = require('xmldom').DOMParser
var crc8 = require('crc').crc8

/**
 * Obtiene el identificador TicketBai de la factura
 * @param {xml} xml - XML con la factura de la que obtener el identificador.
 * @returns - Identificador TBAI
 */
function getIdentTicketBai(xml) {
    
    
    var nif = xpath.select("//Sujetos/Emisor/NIF/text()", xml);
    var fechaExp = xpath.select("//Factura/CabeceraFactura/FechaExpedicionFactura/text()", xml);
    var select = xpath.useNamespaces({"ds": "http://www.w3.org/2000/09/xmldsig#"});
    var firma = select("substring(//ds:SignatureValue/text(), 0, 14)", xml);
    var fechaSplit = fechaExp.toString().split("-");

    var identTBAI = "TBAI-"+nif+"-"+fechaSplit[0]+fechaSplit[1]+fechaSplit[2].substr(2,2)+"-"+firma+"-";
    return identTBAI;
}


function calculateCRC(identTBAI){
    return crc8(identTBAI).toString();
}


module.exports = {
    getIdent: function(xml){
        var doc = new dom().parseFromString(xml)
        var identTBAISinCRC = getIdentTicketBai(doc);
        var crc = calculateCRC(identTBAISinCRC);
        crc = crc.padStart(3,"0");
        return identTBAISinCRC+crc;
    }

};
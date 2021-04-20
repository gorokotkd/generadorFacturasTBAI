'use strict'

var fs = require('fs');
var SignedXml = require('xml-crypto').SignedXml;
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var FileKeyinfo = require('xml-crypto').FileKeyInfo;
var schema_validator = require('xsd-schema-validator');
var generator = require('../functions/generator')
var dataGenerator = require('../functions/data_generator');
var crcCalculator = require('../functions/calculateIdentTBAI');
var dataGen= require('../functions/getData');
const nif_list = require('../files/nif_list').nif_list;
const moment = require('moment');
const pako = require('pako');
const { StringDecoder } = require('string_decoder');

var Factura = require('../model/factura');
var DATA = require('../functions/getData');
const GZIP_LEVEL = 1;
const NUM_FACTURAS = 200000;


function formatNumberLength(num, length) {
    var r = "" + num;
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}

function charDNI(dni) {
    var chain = "TRWAGMYFPDXBNJZSQVHLCKET";
    var pos = dni % 23;
    var letter = chain.substring(pos, pos + 1);
    return letter;
}


function rand_dni() {
    var num = Math.floor((Math.random() * 100000000));
    var sNum = formatNumberLength(num, 8);
    return sNum + charDNI(sNum);
}

var controller = {
    home: function(req, res){
        return res.status(200).send('Home');
    },
    sign: function(req, res){
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var publicKey = fs.readFileSync('./keys/user1-pub.pem');
        //var xml = fs.readFileSync('./files/factura.xml').toString();
        var data = dataGenerator.generate();
        var xml = generator.generate(data).toString();

        //var sig = new SignedXml(null, {canonicalizationAlgorithm: "http://www.w3.org/2000/09/xmldsig#enveloped-signature"});
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']")
        //sig.canonicalizationAlgorithm = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
        sig.signingKey = privateKey;
        sig.computeSignature(xml);

        fs.writeFileSync("./signed-files/signed.xml", sig.getSignedXml());

        crcCalculator.getIdent(sig.getSignedXml());
        //console.log(dataGen.getNif(sig.getSignedXml()).toString());
        //Validacion del xml frente al Schema
        /*schema_validator.validateXML(sig.getSignedXml(), './signed-files/ticketBai_schema.xsd', function(err, result){
            if (err) {
                console.log(err);
                //throw err;
              }           
              result.valid; // true
              console.log(result);
        });*/
        return res.status(200).send(sig.getSignedXml());
    },
    validate: function(req, res){
        var xml = fs.readFileSync('./signed-files/signed.xml').toString();
        var doc = new dom().parseFromString(xml);
        var sig = new SignedXml();

        //var signature = doc.getElementsByTagName("Signature");

        var signature = select(doc, "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];

        sig.keyInfoProvider = new FileKeyinfo('./keys/user1-pub.pem');
        sig.loadSignature(signature.toString());
        var resul = sig.checkSignature(xml);
        if(!resul){
            return res.status(200).send({
                error: sig.validationErrors
            });
        }
        else{
            return res.status(200).send("La firma es válida");
        }

    },
    generate: function(req, res){
        //var file = fs.readFileSync('./files/data_2.json');
        //var data = JSON.parse(file.toString());
        var data = dataGenerator.generate();
        fs.writeFileSync('./files/prueba.json', Buffer.from(JSON.stringify(data)));
        var resul = generator.generate(data);
        fs.writeFileSync('./files/prueba.xml', resul);
        return res.status(200).send({
            resul
        });
    },
    generateData : function(req, res){
        return res.status(200).send(dataGenerator.generate());
    },
    createDb : function (req, res) {
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;
        var facturaTbai;
        var factura;
        var nif_pos;
        var nif;
        var data;
        var xml;

        for(var i = 0; i < NUM_FACTURAS; i++){
            nif_pos = Math.floor(Math.random() * nif_list.length);
            nif = nif_list[nif_pos];

            data = dataGenerator.generate(nif);
            xml = generator.generate(data).toString();

            sig.computeSignature(xml);
        

            facturaTbai = sig.getSignedXml();

            //var long = facturaTbai.length * 2 / 1000000 * 0.9537;
            //console.log(long);
            
            
            factura = new Factura();
            factura._id                     = DATA.getIdentTBAI(facturaTbai);
            factura.NIF                     = DATA.getNif(facturaTbai);
            factura.FechaExpedicionFactura  = moment(DATA.getFechaExp(facturaTbai), "YYYY-MM-DD");
            factura.HoraExpedicionFactura   = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss");
            factura.ImporteTotalFactura     = DATA.getImporteTotalFactura(facturaTbai);
            factura.SerieFactura            = DATA.getSerieFactura(facturaTbai);
            factura.NumFactura              = DATA.getNumFactura(facturaTbai);
            factura.Descripcion             = DATA.getDescripcion(facturaTbai);
            factura.DetallesFactura         = DATA.getDetallesFactura(facturaTbai);
            factura.FacturaComprimida       = pako.gzip(facturaTbai, {level: GZIP_LEVEL});
            factura.save();

            if(i % 1000 == 0){
                console.log("Se ha guardado la factura --> "+i);
            }
            
        }//End for

        res.status(200).send("OK");

    },
    getFacturaByTbai : function(req, res){
        var tbai_id = req.query.id;
        //console.log(tbai_id);
        
        
        if(tbai_id == null){
            return res.status(404).send("No se ha proporcionado id");
        }
        //Factura.find({_id:"TBAI-04119553T-070120-jlBpXVW/QrAWA-115"}).pretty()

        Factura.findById(tbai_id, (err, factura) => {
            if(err) return res.status(500).send("Error al devolver los datos");
            if(!factura) return res.status(404).send("No se ha encontrado la factura con ese identificador");

            var array = JSON.parse("["+factura.FacturaComprimida+"]");
            var facturaDescom = pako.inflate(array);

            //console.log(facturaDescom);
            return res.status(200).send({factura: factura,
                xml: new TextDecoder().decode(facturaDescom)
            });

        });

    }

};


module.exports = controller;
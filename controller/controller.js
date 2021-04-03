'use strict'

var fs = require('fs');
var SignedXml = require('xml-crypto').SignedXml;
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var FileKeyinfo = require('xml-crypto').FileKeyInfo;
var schema_validator = require('xsd-schema-validator');
var generator = require('../functions/generator')
var dataGenerator = require('../functions/data_generator');
var crcCalculator = require('../functions/calculate-crc');



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

        crcCalculator.getCrc(sig.getSignedXml());
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
    }

};

module.exports = controller;
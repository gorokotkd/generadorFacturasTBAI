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
var dataGen = require('../functions/getData');
const nif_list = require('../files/nif_list').nif_list;
const moment = require('moment');
const pako = require('pako');
const { StringDecoder } = require('string_decoder');
const { performance } = require('perf_hooks');

var Factura = require('../model/factura');
var AgrupacionFactura = require('../model/facturaAgrupada');
var DATA = require('../functions/getData');
const GZIP_LEVEL = 1;
const NUM_FACTURAS = 1000000;


function insert(data) {

    return new Promise(resolve => {
        const fact = new Factura();
        fact.collection.insertMany(data, { ordered: false }, (err, docs) => {
            if (err) { console.log(err) }
            else { resolve("Insertados " + docs.length + " datos"); }
        });
    });
}

function insert_agrupadas(data){
    return new Promise((resolve)=> {
        const group = new AgrupacionFactura();
        group.collection.insertMany(data, {ordered: false}, (err, docs) => {
            if(err) {console.log(err);}
            else {resolve("Insertadas "+docs.length+" agrupaciones");}
        });
    });
}

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
    home: function (req, res) {
        return res.status(200).send('Home');
    },
    sign: function (req, res) {
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
    validate: function (req, res) {
        var xml = fs.readFileSync('./signed-files/signed.xml').toString();
        var doc = new dom().parseFromString(xml);
        var sig = new SignedXml();

        //var signature = doc.getElementsByTagName("Signature");

        var signature = select(doc, "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];

        sig.keyInfoProvider = new FileKeyinfo('./keys/user1-pub.pem');
        sig.loadSignature(signature.toString());
        var resul = sig.checkSignature(xml);
        if (!resul) {
            return res.status(200).send({
                error: sig.validationErrors
            });
        }
        else {
            return res.status(200).send("La firma es válida");
        }

    },
    generate: function (req, res) {
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
    generateData: function (req, res) {
        return res.status(200).send(dataGenerator.generate());
    },
    createDb: async function (req, res) {
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

        var array = [];
        var json = {};
        var total_fact = 0;

        for (var i = 0; i < NUM_FACTURAS / 10; i++) {
            array = [];
            factura = new Factura();
            for (var j = 0; j < 10; j++) {
                //console.log(j);
                json = {};
                nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];

                data = dataGenerator.generate(nif);
                xml = generator.generate(data).toString();

                sig.computeSignature(xml);


                facturaTbai = sig.getSignedXml();

                json._id = DATA.getIdentTBAI(facturaTbai);
                json.NIF = DATA.getNif(facturaTbai);
                json.FechaExpedicionFactura = moment(DATA.getFechaExp(facturaTbai), "YYYY-MM-DD").toISOString();
                json.HoraExpedicionFactura = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss").toISOString();
                json.ImporteTotalFactura = DATA.getImporteTotalFactura(facturaTbai);
                json.SerieFactura = DATA.getSerieFactura(facturaTbai);
                json.NumFactura = DATA.getNumFactura(facturaTbai);
                json.Descripcion = DATA.getDescripcion(facturaTbai);
                json.DetallesFactura = DATA.getDetallesFactura(facturaTbai);
                json.FacturaComprimida = pako.gzip(facturaTbai, { level: GZIP_LEVEL }).toString();
                //factura.save();
                array.push(json);
            }

            //save(array).then(console.log);
            await insert(array);
            total_fact += 1000;
            console.log("Creadas un total de --> " + total_fact);

        }//End for
        //res.status(200).send("OK");
        factura = new Factura();
        factura.collection.insertMany(array, function (err, docs) {
            if (err) {
                console.log(err);
            } else {
                res.status(200).send(docs.insertedCount + " facturas guardadas correctamente");
            }
        });



    },
    getFacturaByTbai: function (req, res) {
        var tbai_id = req.query.id;
        //console.log(tbai_id);


        if (tbai_id == null) {
            return res.status(404).send("No se ha proporcionado id");
        }
        //"TBAI-82275936Z-010120-dPmfSHpsGqWpI-120"

        Factura.findById(tbai_id, (err, factura) => {
            if (err) return res.status(500).send("Error al devolver los datos");
            if (!factura) {//No he encontrado una factura con esa id (Estará comprimida)
                //return res.status(404).send("No se ha encontrado la factura con ese identificador");
                AgrupacionFactura.find({idents:tbai_id}, (err, facturas_agrupadas) => {
                    if(err) return res.status(500).send("Error al devolver los datos");
                    if(!facturas_agrupadas) {
                        return res.status(404).send("No se ha encontrado la factura con ese identificador");
                    }else{
                        var pos = Array.from(facturas_agrupadas[0].idents).indexOf(tbai_id);

                        var array = JSON.parse("["+facturas_agrupadas[0].agrupacion+"]");
                        var facturasDescom = pako.inflate(array);
                        var facturas_string = new TextDecoder().decode(facturasDescom);
                        var facturas_array = facturas_string.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                        res.status(200).send(facturas_array[pos]);
                    }
                    
                });

            }else{
                var array = JSON.parse("[" + factura.FacturaComprimida + "]");
                var facturaDescom = pako.inflate(array);

                //console.log(facturaDescom);
                return res.status(200).send({
                    factura: factura,
                    xml: new TextDecoder().decode(facturaDescom)
                });
            }

            

        });

    },
    agruparFacturas: async function (req, res) {
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;

        var data;
        var xml;
        let nif;
        const MAX_AGRUPACION = 100; //Más o menos la media de facturas de una semana de una empresa.
        const MAX_FACTURAS_AGRUPADAS = 25000;
        const repeat = 10;
        var agrupacion = "";
        for(var i = 0; i < MAX_FACTURAS_AGRUPADAS/repeat; i++){
            var array = [];
            for(var j = 0; j < repeat; j++){
                agrupacion = "";
                var tbai_idents = [];
                let nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];
                var agrupacion_fact = {};
                for (var k = 0; k < MAX_AGRUPACION; k++) {
                    data = dataGenerator.generate(nif);
                    xml = generator.generate(data).toString();
                    sig.computeSignature(xml);
                    let factura = sig.getSignedXml();
                    agrupacion += factura;
                    tbai_idents.push(DATA.getIdentTBAI(factura));
                }
                let grupo = pako.gzip(agrupacion, { level: GZIP_LEVEL });
                agrupacion_fact.nifFecha = nif + "/01-01-2021/01-02-2021";
                agrupacion_fact.agrupacion = grupo.toString();
                agrupacion_fact.idents = tbai_idents;
                array.push(agrupacion_fact);
            }
            await insert_agrupadas(array);

            console.log("Insertadas " +(i+1)*10 +" agrupaciones.");

        }
        res.status(200).send("OK");
    }

};

module.exports = controller;
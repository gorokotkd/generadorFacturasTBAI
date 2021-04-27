'use strict'

var fs = require('fs');
const readline = require('readline');
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
const zlib = require('zlib');
const { StringDecoder } = require('string_decoder');
const { performance } = require('perf_hooks');

var mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const {Readable} = require('stream');
var streamToString = require('stream-to-string');

var Factura = require('../model/factura');
var AgrupacionFactura = require('../model/facturaAgrupada');
var DATA = require('../functions/getData');
const MB = 1000000;
const GZIP_LEVEL = 1;
const NUM_FACTURAS = 2000000;


function insert(data) {

    return new Promise(resolve => {
        const fact = new Factura();
        fact.collection.insertMany(data, { ordered: false }, (err, docs) => {
            if (err) { console.log(err) }
            else { resolve("Insertados " + docs.length + " datos"); }
        });
    });
}

function insert_agrupadas(data) {
    return new Promise((resolve) => {
        const group = new AgrupacionFactura();
        group.collection.insertMany(data, { ordered: false }, (err, docs) => {
            if (err) { console.log(err); }
            else { resolve("Insertadas " + docs.length + " agrupaciones"); }
        });
    });
}

function compressData(data){
    return new Promise((resolve) => {
        zlib.gzip(data, {level: GZIP_LEVEL}, (err, result) =>{
            if(!err) resolve(result.toString('hex'));
            console.log(err);
        });
    });
}

function unCompressData(data){
    return new Promise((resolve, reject) => {
        zlib.gunzip(Buffer.from(data, "hex"), (err, result) =>{
            if(!err) resolve(result.toString());
            reject(err);
        });
    });
}

function randomDate(start, end) {
    var options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    var dt = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));//.toLocaleDateString('es', options).replace('/','-').replace('/','-');
    var year = dt.getFullYear();
    var month = (dt.getMonth() + 1).toString().padStart(2, "0");
    var day = dt.getDate().toString().padStart(2, "0");

    return (day + "-" + month + "-" + year);
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

        for (var i = 0; i < NUM_FACTURAS / 100; i++) {
            array = [];
            factura = new Factura();
            for (var j = 0; j < 100; j++) {
                //console.log(j);
                json = {};
                nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];

                data = dataGenerator.generate(nif, randomDate(new Date(2021, 0 , 1), new Date()));
                xml = generator.generate(data).toString();

                sig.computeSignature(xml);


                facturaTbai = sig.getSignedXml();

                json._id = DATA.getIdentTBAI(facturaTbai);
                json.NIF = DATA.getNif(facturaTbai);
                json.FechaExpedicionFactura = moment(DATA.getFechaExp(facturaTbai), "DD-MM-YYYY").toDate();
                json.HoraExpedicionFactura = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss").toDate();
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
            total_fact += 100;
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
    getFacturaByTbai: async function (req, res) {
        var tbai_id = req.query.id;
        //console.log(tbai_id);


        if (tbai_id == null) {
            return res.status(404).send("No se ha proporcionado id");
        }

        let resul = await findByTBAI(tbai_id);

        return res.status(resul.code).send(resul);


/*

        Factura.findById(tbai_id, (err, factura) => {
            if (err) return res.status(500).send("Error al devolver los datos");
            if (!factura) {//No he encontrado una factura con esa id (Estará comprimida)
                //return res.status(404).send("No se ha encontrado la factura con ese identificador");
                /*AgrupacionFactura.find({ idents: tbai_id }, (err, facturas_agrupadas) => {
                    if (err) return res.status(500).send("Error al devolver los datos");
                    if (!facturas_agrupadas) {
                        res.status(404).send("No se ha encontrado la factura con ese identificador");
                    } else {
                        console.log(facturas_agrupadas);
                        for(var i = 0; i < facturas_agrupadas.length; i++){
                            if(facturas_agrupadas[i].idents.includes(tbai_id)){
                                var pos = Array.from(facturas_agrupadas[0].idents).indexOf(tbai_id);

                                var array = JSON.parse("[" + facturas_agrupadas[0].agrupacion + "]");
                                var facturasDescom = pako.inflate(array);
                                var facturas_string = new TextDecoder().decode(facturasDescom);
                                var facturas_array = facturas_string.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                                return res.status(200).send(facturas_array[pos]);
                            }
                        }
                       
                    }

                });
                //TBAI-14585388F-230221-PKcm5LPQTfI0i-227
                //"TBAI-82275936Z-010120-dPmfSHpsGqWpI-120"
                var tbai_split = tbai_id.split("-");
                let nif = tbai_split[1];
                let fecha = moment(tbai_split[2], "DDMMYY").toDate();
                console.log(tbai_split);

                AgrupacionFactura.find({nif: nif, fechaInicio : {$lte: fecha}, fechaFin: {$gte: fecha}}, (err, docs) => {
                    if(err) return res.status(500).send("Error al devolver los datos");
                    if(!docs) return res.status(404).send("No se han encontrado facturas con ese identificador.");

                    for(var i = 0; i < docs.length; i++){
                        if(docs[i].idents.includes(tbai_id)){

                            var pos = Array.from(docs[i].idents).indexOf(tbai_id);

                            var array = JSON.parse("[" + docs[i].agrupacion + "]");
                            var facturasDescom = pako.inflate(array);
                            var facturas_string = new TextDecoder().decode(facturasDescom);
                            var facturas_array = facturas_string.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                            return res.status(200).send(facturas_array[pos]);
                        }
                    }
                });


            } else {
                var array = JSON.parse("[" + factura.FacturaComprimida + "]");
                var facturaDescom = pako.inflate(array);

                //console.log(facturaDescom);
                return res.status(200).send(new TextDecoder().decode(facturaDescom));
            }



        });
*/
    },
    agrupar: async function(req, res){
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;

        
        const MAX_GRUPO = 5000
        for(var i = 5000; i <= MAX_GRUPO; i+=10){
            //console.log(i);
            let nif_pos = Math.floor(Math.random() * nif_list.length);
            let nif = nif_list[nif_pos];

            var fechaExpInicio = randomDate(new Date(2021, 0, 1), new Date(2021, 1, 21));
            let time = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
            time.setDate(time.getDate() + 7);
            var fechaExpFin = time.getDate().toString().padStart(2, "0")+"-"+(time.getMonth() + 1).toString().padStart(2, "0")+"-"+time.getFullYear();

            let facturas_agrupadas = agruparNFacturas(i, nif, fechaExpInicio, fechaExpFin);
            //let compress = pako.gzip(facturas_agrupadas.agrupacion, {level: GZIP_LEVEL}).toString();
            let compress = await compressData(facturas_agrupadas.agrupacion);



            var data_to_insert = {};
            data_to_insert.nif = nif;
            data_to_insert.fechaInicio = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
            data_to_insert.fechaFin = moment(fechaExpFin, "DD-MM-YYYY").toDate();
            data_to_insert.idents = facturas_agrupadas.tbai_idents;
            data_to_insert.agrupacion = compress;
            
            let numParticiones = 0;
            let bytes = new TextEncoder().encode(JSON.stringify(data_to_insert)).byteLength;
            if(bytes % (15*MB) == 0){
                numParticiones = Math.floor(bytes / (15*MB));
            }else{
                numParticiones = 1 + Math.floor(bytes / (15*MB));
                
            }
            console.log(numParticiones);
            let array = [];

            if(numParticiones == 1){
                array.push(data_to_insert);
            }else{
                //let fact_array = JSON.parse("[" + compress + "]");
                //let facturas_descomp = pako.inflate(fact_array);
                let facturas_string = await unCompressData(compress);
                //let facturas_string = new TextDecoder().decode(facturas_descomp);
                var facturas_array = facturas_string.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);

                for(var k = 0; k < numParticiones; k++){
                    //let agrupacion = agruparNFacturas(i/numParticiones, nif, fechaExpInicio, fechaExpFin);
                    let agrupacion = facturas_array.slice((k*i)/numParticiones, ((k+1)*i)/numParticiones);
                    let agrupacion_compress = compressData(agrupacion);
                    //let data_to_insert = {};
                    data_to_insert.nif = nif;
                    data_to_insert.fechaInicio = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
                    data_to_insert.fechaFin = moment(fechaExpFin, "DD-MM-YYYY").toDate();
                    data_to_insert.idents = tbai_idents.slice((k*i)/numParticiones, ((k+1)*i)/numParticiones);
                    data_to_insert.agrupacion = agrupacion_compress;
                    array.push(data_to_insert);
                }//end for
            }//end if

            await insert_agrupadas(array);
            fs.writeFileSync('./files/identsGrupos.txt', i + " / " + array[array.length-1].idents[array[array.length-1].idents.length-1] + "\n", { flag: 'a' });
            console.log("Insertadas " + i + " agrupaciones.");

        }//end for

        res.status(200).send("OK");
    },
    test: async function(req, res){

        fs.writeFileSync("./files/test.csv", "Numero de facturas Agrupadas;Tiempo de búsqueda en BD;Tiempo de descompresión;Tiempo de búsqueda de factura\n", {flag: 'w'});
        const file = fs.readFileSync("./files/identsGrupos.txt").toString();

        const lines = file.split("\n");

        for(var i = 0; i < lines.length-1; i++){
            let line_split = lines[i].split(" / ");
            let resul = await findByTBAI(line_split[1]);
            fs.writeFileSync("./files/test.csv", line_split[0]+";"+resul.stats.busqueda_datos+";"+resul.stats.descompresion+";"+resul.stats.busqueda_factura+"\n", {flag: 'a'});
        }
        
        return res.status(200).send(fs.readFileSync("./files/test.csv").toString());
    }

};


async function findByTBAI(tbai_id){

    return new Promise ((resolve) => {
        Factura.findById(tbai_id, (err, factura) => {
            if (err) resolve({
                code: 500,
                data: "Error al devolver los datos",
                stats : {}
            });
            if (!factura) {//No he encontrado una factura con esa id (Estará comprimida)
                //TBAI-14585388F-230221-PKcm5LPQTfI0i-227
                //"TBAI-82275936Z-010120-dPmfSHpsGqWpI-120"
                var tbai_split = tbai_id.split("-");
                let nif = tbai_split[1];
                let fecha = moment(tbai_split[2], "DDMMYY").toDate();
                var busqueda_datos_start = performance.now();
                AgrupacionFactura.find({nif: nif, fechaInicio : {$lte: fecha}, fechaFin: {$gte: fecha}}, (err, docs) => {
                    var busqueda_datos_fin = performance.now();
                    if(err) resolve({
                        code: 500,
                        data: "Error al devolver los datos",
                        stats : {}
                    });
                    if(!docs) resolve ({
                        code: 404,
                        data: "No se ha encontrado la factura con ese identificador",
                        stats : {}
                    });
                    
                    for(var i = 0; i < docs.length; i++){
                        if(docs[i].idents.includes(tbai_id)){
                            var pos = Array.from(docs[i].idents).indexOf(tbai_id);
                            
                            //var array = JSON.parse("[" + docs[i].agrupacion + "]");
                            var descompresion_start = performance.now();
                            //var facturasDescom = pako.inflate(array);
                            //var facturas_string = new TextDecoder().decode(facturasDescom);
                            //var facturas_string = await unCompressData(docs[i].agrupacion);

                            unCompressData(docs[i].agrupacion).then((resul) =>{
                                var descompresion_fin = performance.now();
                            
                                var busqueda_factura_start = performance.now();
                                var facturas_array = resul.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                                let data = facturas_array[pos];
                                var busqueda_factura_fin = performance.now();
        
                                //return res.status(200).send(facturas_array[pos]);
                                resolve ({
                                    code: 200,
                                    data: data,
                                    stats : {
                                        busqueda_datos: busqueda_datos_fin - busqueda_datos_start,
                                        descompresion: descompresion_fin - descompresion_start,
                                        busqueda_factura: busqueda_factura_fin - busqueda_factura_start
                                    }
                                });
                            });
                            
                        }
                    }
                });
            } else {
                var busqueda_datos_fin = performance.now();
                var descompresion_start = performance.now();
                var array = JSON.parse("[" + factura.FacturaComprimida + "]");
                var facturaDescom = pako.inflate(array);
                var descompresion_fin = performance.now();
                //console.log(facturaDescom);
                //return res.status(200).send(new TextDecoder().decode(facturaDescom));
                resolve ({
                    code:200,
                    data: new TextDecoder().decode(facturaDescom),
                    stats: {
                        busqueda_datos: busqueda_datos_fin - busqueda_datos_start,
                        descompresion: descompresion_fin - descompresion_start
                    }
                });
            }
        });
    });
    
}

function agruparNFacturas(num, nif, fechaInicio, fechaFin){
    var privateKey = fs.readFileSync('./keys/user1.pem');
    var sig = new SignedXml();
    sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
    sig.signingKey = privateKey;
    var to_return = {};
    var tbai_idents = [];
    var agrupacion = "";
    for(var i = 0; i < num; i++){
        let data = dataGenerator.generate(nif, randomDate(moment(fechaInicio, "DD-MM-YYYY").toDate(), moment(fechaFin, "DD-MM-YYYY").toDate()));
        let xml = generator.generate(data).toString();
        sig.computeSignature(xml);
        let factura = sig.getSignedXml();

        agrupacion += factura;
        tbai_idents.push(DATA.getIdentTBAI(factura));
    }

    to_return.agrupacion = agrupacion;
    to_return.tbai_idents = tbai_idents;

    return to_return;


}

module.exports = controller;
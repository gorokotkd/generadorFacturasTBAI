'use strict'

var fs = require('fs');
const readline = require('readline');
var SignedXml = require('xml-crypto').SignedXml;
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var FileKeyinfo = require('xml-crypto').FileKeyInfo;

var generator = require('../functions/generator')
var dataGenerator = require('../functions/data_generator');
var crcCalculator = require('../functions/calculateIdentTBAI');

const nif_list = require('../files/nif_list').nif_list;
const moment = require('moment');

const zlib = require('zlib');

const { performance } = require('perf_hooks');


var Factura = require('../model/factura');
var AgrupacionFactura = require('../model/facturaAgrupada');
var DATA = require('../functions/getData');
const MB = 1000000;
const GZIP_LEVEL = 1;



function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

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
            //console.log(err);
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
        const NUM_FACTURAS = 500000;
        const NUM_GRUPO = 100;

        for (var i = 0; i < NUM_FACTURAS / NUM_GRUPO; i++) {
            array = [];
            factura = new Factura();
            for (var j = 0; j < NUM_GRUPO; j++) {
                //console.log(j);
                json = {};
                nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];
                var genera_factura_start = performance.now();
                data = dataGenerator.generate(nif, randomDate(new Date(2021, 0 , 1), new Date()), dataGenerator.sujetos_config,dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.tipo_desglose_config, dataGenerator.huellaTBAI_config);
                xml = generator.generate(data).toString();
                var genera_factura_fin = performance.now();

                var firmar_factura_start = performance.now();
                sig.computeSignature(xml);
                var firmar_factura_fin = performance.now();

                facturaTbai = sig.getSignedXml();

                json._id = DATA.getIdentTBAI(facturaTbai);
                json.NIF = DATA.getNif(facturaTbai);
                json.FechaExpedicionFactura = moment(DATA.getFechaExp(facturaTbai), "DD-MM-YYYY").toDate();
                json.HoraExpedicionFactura = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss").toDate();
                json.ImporteTotalFactura = DATA.getImporteTotalFactura(facturaTbai);
                json.SerieFactura = DATA.getSerieFactura(facturaTbai);
                json.NumFactura = DATA.getNumFactura(facturaTbai);
                json.Descripcion = DATA.getDescripcion(facturaTbai);
                //json.DetallesFactura = DATA.getDetallesFactura(facturaTbai);
                var comprimir_factura_start = performance.now();
                json.FacturaComprimida = await compressData(facturaTbai);
                var comprimir_factura_fin = performance.now();
                //factura.save();
                array.push(json);
                //fs.writeFileSync('./idents_grandes.txt',total_fact + " // "+json._id+"\n", {flag: 'a'});
                /*console.log("Factura número "+total_fact+"\nTiempo en generar datos factura --> "+(genera_factura_fin-genera_factura_start)+
                "\nTiempo en firmar la factura --> "+(firmar_factura_fin-firmar_factura_start)+"\nTiempo en comprimir factura --> "+(comprimir_factura_fin-comprimir_factura_start)
                 + "\n==========================================================================");*/

            }
            fs.writeFileSync('./files/idents.txt',array[getRandomInt(0, array.length)]._id+"\n", {flag: 'a'});
            //save(array).then(console.log);
            await insert(array);
            total_fact += NUM_GRUPO;
            console.log("Creadas un total de --> " + total_fact);

        }//End for
        res.status(200).send("OK");
    },
    getFacturaByTbai: async function (req, res) {
        var tbai_id = req.query.id;
        //console.log(tbai_id);


        if (tbai_id == null) {
            return res.status(404).send("No se ha proporcionado id");
        }

        let resul = await findByTBAI(tbai_id);

        return res.status(resul.code).send(resul);

    },
    agrupar: async function(req, res){
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;

        
        const MAX_GRUPO = 10000
        for(var i = 1000; i <= MAX_GRUPO; i+=10){
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
            //console.log(numParticiones);
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
                    let agrupacion = facturas_array.slice((k*i)/numParticiones, ((k+1)*i)/numParticiones).join('');
                    let agrupacion_compress = await compressData(agrupacion);
                    let new_data_to_insert = {};
                    new_data_to_insert.nif = nif;
                    new_data_to_insert.fechaInicio = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
                    new_data_to_insert.fechaFin = moment(fechaExpFin, "DD-MM-YYYY").toDate();
                    new_data_to_insert.idents = facturas_agrupadas.tbai_idents.slice((k*i)/numParticiones, ((k+1)*i)/numParticiones);
                    new_data_to_insert.agrupacion = agrupacion_compress;
                    array.push(new_data_to_insert);
                }//end for
            }//end if

            await insert_agrupadas(array);
            fs.writeFileSync('./files/identsGrupos.txt', i + " / " + array[array.length-1].idents[array[array.length-1].idents.length-1] + " / "+numParticiones+ "\n", { flag: 'a' });
            console.log("Insertadas " + i + " agrupaciones.");

        }//end for

        res.status(200).send("OK");
    },
    test: async function(req, res){
/*
        fs.writeFileSync("./files/test_agrupadas.csv", "Numero de facturas Agrupadas;Tiempo de búsqueda en BD;Tiempo de descompresión;Tiempo de búsqueda de factura\n", {flag: 'w'});
        const file = fs.readFileSync("./files/identsGrupos.txt").toString();

        const lines = file.split("\n");

        for(var i = 0; i < lines.length-1; i++){
            let line_split = lines[i].split(" / ");
            let resul = await findByTBAI(line_split[1]);
            fs.writeFileSync("./files/test_agrupadas.csv", line_split[0]+";"+resul.stats.busqueda_datos+";"+resul.stats.descompresion+";"+resul.stats.busqueda_factura+"\n", {flag: 'a'});
        }
        
        return res.status(200).send("OK");
*/

        const file = fs.readFileSync("./files/idents_facturas_detalles_crecientes.txt").toString();
        const lines = file.split("\n");
        fs.writeFileSync('./files/test_facturas_crecientes.csv', 'Tiempo Búsqueda Directa;Tiempo Búsqueda comprimida;Tamaño(KB)\n', {flag:'w'});

        for(var i = 0; i < lines.length-1; i++){
            
            let line_split = lines[i].split(" // ");
            var busqueda_directa_start = performance.now();
            await executeQuery({_id:line_split[0]}, 'ImporteTotalFactura');
            var busqueda_directa_fin = performance.now();
            
            var busqueda_comprimida_start = performance.now();
            
            let result = await executeQuery({_id: line_split[0]}, 'FacturaComprimida');
            //console.log(result);
            let descomp = await unCompressData(result[0].FacturaComprimida);
            DATA.getImporteTotalFactura(descomp);
            var busqueda_comprimida_fin = performance.now();


            fs.writeFileSync('./files/test_facturas_crecientes.csv',  (busqueda_directa_fin-busqueda_directa_start)+';'+(busqueda_comprimida_fin-busqueda_comprimida_start)+';'+(line_split[3]/1000)+'\n', {flag:'a'});
        }

        res.status(200).send('OK');
    },
    ascendingDB: async function(req, res){
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
        const NUM_FACTURAS = 10000;
        const NUM_GRUPO = 1;

        var factura_config = {
            sujetos_config: dataGenerator.sujetos_config,
            cabecera_factura_config: dataGenerator.cabecera_factura_config,
            datos_factura_config: dataGenerator.datos_factura_config,
            tipo_desglose_config: dataGenerator.tipo_desglose_config,
            huellaTBAI_config: dataGenerator.huellaTBAI_config
        };
        factura_config.datos_factura_config.detallesFactura.numDetalles = 101;
        factura_config.sujetos_config.destinatarios = 10;

        for (var i = 1001; i <= NUM_FACTURAS / NUM_GRUPO; i++) {
            array = [];
            factura = new Factura();
            for (var j = 0; j < NUM_GRUPO; j++) {
                
                json = {};
                nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];
                var genera_factura_start = performance.now();
                data = dataGenerator.generate(nif, randomDate(new Date(2021, 0 , 1), new Date()), );
                xml = generator.generate(data).toString();
                var genera_factura_fin = performance.now();

                var firmar_factura_start = performance.now();
                sig.computeSignature(xml);
                var firmar_factura_fin = performance.now();

                facturaTbai = sig.getSignedXml();
                var factura_bytes = new TextEncoder().encode(facturaTbai).byteLength;

                json._id = DATA.getIdentTBAI(facturaTbai);
                json.NIF = DATA.getNif(facturaTbai);
                json.FechaExpedicionFactura = moment(DATA.getFechaExp(facturaTbai), "DD-MM-YYYY").toDate();
                json.HoraExpedicionFactura = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss").toDate();
                json.ImporteTotalFactura = DATA.getImporteTotalFactura(facturaTbai);
                json.SerieFactura = DATA.getSerieFactura(facturaTbai);
                json.NumFactura = DATA.getNumFactura(facturaTbai);
                json.Descripcion = DATA.getDescripcion(facturaTbai);
                //json.DetallesFactura = DATA.getDetallesFactura(facturaTbai);
                var comprimir_factura_start = performance.now();
                json.FacturaComprimida = await compressData(facturaTbai);
                var comprimir_factura_fin = performance.now();
                //factura.save();
                array.push(json);


            }
            fs.writeFileSync('./files/idents_facturas_detalles_crecientes.txt',array[0]._id+" // "+factura_config.sujetos_config.destinatarios
            +" // "+factura_config.datos_factura_config.detallesFactura.numDetalles+ " // "+factura_bytes+"\n", {flag: 'a'});
            //save(array).then(console.log);
            await insert(array);
            total_fact += NUM_GRUPO;
            console.log("Creadas un total de --> " + total_fact);
            if(i % 10 == 0){
                factura_config.datos_factura_config.detallesFactura.numDetalles += 1;
            }
            if(i % 100 == 0){
                if(factura_config.sujetos_config.destinatarios == -1){
                    factura_config.sujetos_config.destinatarios = 1;
                }else{
                    factura_config.sujetos_config.destinatarios += 1;
                }
            }

        }//End for
        res.status(200).send("OK");
    }

};


async function executeQuery(query, projection){
    return new Promise((resolve) =>{
        Factura.find(query, projection, (err, result) =>{
            if(!err) resolve(result);
        });
    });
}

async function findByTBAI(tbai_id){

    return new Promise ((resolve) => {
        var busqueda_datos_start = performance.now();
        Factura.findById(tbai_id, (err, factura) => {
            var busqueda_datos_fin = performance.now();
            if (err) resolve({
                code: 500,
                data: "Error al devolver los datos",
                stats : {}
            });
            if (!factura) {//No he encontrado una factura con esa id (Estará comprimida)
                //TBAI-14585388F-230221-PKcm5LPQTfI0i-227
                //TBAI-82275936Z-010120-dPmfSHpsGqWpI-120
                var tbai_split = tbai_id.split("-");
                let nif = tbai_split[1];
                let fecha = moment(tbai_split[2], "DDMMYY").toDate();
                busqueda_datos_start = performance.now();
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
                var descompresion_start = performance.now();
                unCompressData(factura.FacturaComprimida).then((resul) => {
                    var descompresion_fin = performance.now();
                    //console.log(facturaDescom);
                    //return res.status(200).send(new TextDecoder().decode(facturaDescom));
                    //fs.writeFileSync('./files/factura.xml', resul);
                    resolve ({
                        code:200,
                        data: resul,
                        stats: {
                            busqueda_datos: busqueda_datos_fin - busqueda_datos_start,
                            descompresion: descompresion_fin - descompresion_start
                        }
                    });
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
        let data = dataGenerator.generate(nif, randomDate(moment(fechaInicio, "DD-MM-YYYY").toDate(), moment(fechaFin, "DD-MM-YYYY").toDate()),
            dataGenerator.sujetos_config, dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.tipo_desglose_config, dataGenerator.huellaTBAI_config);
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

const sujetos_config = {
    destinatarios: 2, //Numero de destinatarios. (-1) si no existen destinatarios
    emitidaPorTercerosODestinatario: true //Indica si quiero el elemento emitida por terceros
};

const cabecera_factura_config = {
    serieFactura: true,
    facturaSimplificada: true,
    facturaEmitidaSustitucionSimplificada: false,
    facturaRectificativa: {
        value: false, //Indica si quiero el elemento FacturaRectificativa
        importeRectificacion: true,
        cuotaRecargo: true
    },
    facturaRectificadaSustituida: {
        value: true, //Indica si quiero el elemento FacturaRectificadaSustituida
        serieFactura: true,
        numFacturas: 2 //(1 a 100)
    }
};
const datos_factura_config = {
    fechaOperacion: true,
    detallesFactura: { numDetalles: 3 },
    retencionSoportada: true,
    baseImponibleACoste: false,
    numClaves: 1 // 1 a 3
};
const tipo_desglose_config = {
    desgloseFactura: false, //TipoDesglose --> DesgloseFactura / Si es true da igual lo que valga desgloseTipoOperacion
    desgloseTipoOperacion: { prestacionServicios: true, entrega: false }, // Solo se genera si desgloseFactura
    //no esta definido o es false y ademas prestacionServicios o entrega  o los dos es true.
    desglose: {
        sujeta: {
            value: false, // Si es true, se genera la factura sujeta, aunque puede que este vacia.
            exenta: {
                value: true,// Si es true genero la factura sujeta exenta
                numDetallesExenta: 7 //Numero de deralles de la factura exenta (1 a 7)
            },
            noExenta: {
                value: true, // Si es true genero la factura NoExenta
                numDetallesNoExenta: 2, //Numero de detalles (1 a 2)
                numDetallesIVA: 6 //Numero de detalles de desglose de IVA (1 a 6)
            }
        },
        noSujeta: {
            value: true, //Si es true genero la factura NoSujeta
            numDetallesNoSujeta: 2 //Numero de detalles de la factura NoSujeta (1 a 2)
        }
    }
};

const huellaTaBAI_config = {
    encadenamiento: {
        value: true, //Si es true genero el elemento EncadenamientoFacturaAnterior
        serieFacturaAnterior: true //Si es true genero el campo SerieFacturaAnterior
    },
    entidadNIF: true, //Si es true la entidad se identifica mediante el NIF. (Si es false o no existe se identifica con el otro metodo)
    entidadIdOtro: true, // Si es true la entidad se identifica de otra forma
    numSerieDispositivo: true //Indica si quiero el campo numSerieDispositivo
};





module.exports = controller;
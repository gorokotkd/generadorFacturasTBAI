'use strict'

var fs = require('fs');
var SignedXml = require('xml-crypto').SignedXml;
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var FileKeyinfo = require('xml-crypto').FileKeyInfo;
const moment = require('moment');
const zlib = require('zlib');
var dom = require('xmldom').DOMParser;
const { performance } = require('perf_hooks');
const cassandra = require('cassandra-driver');

var generator = require('../functions/generator')
var dataGenerator = require('../functions/data_generator');
const nif_list = require('../files/nif_list').nif_list;
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

function compressData(data) {
    return new Promise((resolve) => {
        zlib.gzip(data, { level: GZIP_LEVEL }, (err, result) => {
            if (!err) resolve({
                result: result.toString('base64'),
                bytes: result.byteLength
            });
        });
    });
}

function unCompressData(data) {
    return new Promise((resolve, reject) => {
        zlib.gunzip(Buffer.from(data, "base64"), (err, result) => {
            if (!err) resolve(result.toString());
            reject(err);
        });
    });
}

function randomDate(start, end) {
    var dt = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));//.toLocaleDateString('es', options).replace('/','-').replace('/','-');
    var year = dt.getFullYear();
    var month = (dt.getMonth() + 1).toString().padStart(2, "0");
    var day = dt.getDate().toString().padStart(2, "0");

    return (day + "-" + month + "-" + year);
}

var controller = {
    unaFactura: function (req, res) {
        let data = dataGenerator.generate("12345678A", new Date(), dataGenerator.sujetos_config, dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.huellaTBAI_config);
        let xml = generator.generate(data);
        res.status(200).send(xml);
        //res.status(200).send(data);
    },
    validate: function (req, res) {
        var xml = fs.readFileSync('./signed-files/signed.xml').toString();
        var doc = new dom().parseFromString(xml);
        var sig = new SignedXml();

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
        const NUM_FACTURAS = 1000;//TOTAL DE FACTURAS A GENERAR
        const NUM_GRUPO = 1;//DE CUANTO EN CUANTO INTRODUZCO ESAS FACTURAS EN LA BD


        fs.writeFileSync("./files/idents_grandes_sin_detalles.txt", "Numfactura / Identificador / Ratio de Compresion / Tiempo en Comprimir / Tiempo de Insercion / Tiempo generar factura / Tiempo firmar factura / Tiempo total\n", { flag: 'w' });

        for (var i = 0; i < NUM_FACTURAS / NUM_GRUPO; i++) {
            array = [];
            factura = new Factura();
            for (var j = 0; j < NUM_GRUPO; j++) {

                json = {};
                nif_pos = Math.floor(Math.random() * nif_list.length);
                nif = nif_list[nif_pos];

                //GENERACION Y FIRMA DE FACTURA
                var genera_factura_start = performance.now();
                data = dataGenerator.generate(nif, moment(randomDate(new Date(2021, 0, 1), new Date()), "DD-MM-YYYY").toDate(), dataGenerator.sujetos_config, dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.huellaTBAI_config);
                xml = generator.generate(data).toString();
                var genera_factura_fin = performance.now();

                var firmar_factura_start = performance.now();
                sig.computeSignature(xml);
                var firmar_factura_fin = performance.now();


                facturaTbai = sig.getSignedXml();
                var tiempo_total_start = performance.now();
                //GUARDADO DE DATOS EN JSON PARA POSTERIOR INSERCION
                json._id = DATA.getIdentTBAI(facturaTbai);
                json.NIF = DATA.getNif(facturaTbai);
                json.FechaExpedicionFactura = moment(DATA.getFechaExp(facturaTbai), "DD-MM-YYYY").toDate();
                json.HoraExpedicionFactura = moment(DATA.getHoraExpedionFactura(facturaTbai), "hh:mm:ss").toDate();
                json.ImporteTotalFactura = DATA.getImporteTotalFactura(facturaTbai);
                json.SerieFactura = DATA.getSerieFactura(facturaTbai);
                json.NumFactura = DATA.getNumFactura(facturaTbai);
                json.Descripcion = DATA.getDescripcion(facturaTbai);
                //var obtener_detalles_start = performance.now();
                //json.DetallesFactura = DATA.getDetallesFactura(facturaTbai);
                //var obtener_detalles_stop = performance.now();

                //COMPRESION DE FACTURA
                var comprimir_factura_start = performance.now();
                let compresion = await compressData(facturaTbai);
                json.FacturaComprimida = compresion.result;
                var comprimir_factura_fin = performance.now();

                var bytes_sin_comprimir = new TextEncoder().encode(facturaTbai).byteLength;
                var bytes_comprimida = compresion.bytes;
                array.push(json);
            }

            //INSERCION EN LA BD
            var insertar_start = performance.now();
            await insert(array);
            var insertar_stop = performance.now();
            var tiempo_total_stop = performance.now();
            fs.writeFileSync('./files/idents_grandes_sin_detalles.txt', total_fact + " / " + array[getRandomInt(0, array.length)]._id + " / " + (1 - (bytes_comprimida / bytes_sin_comprimir)) + " / " + (comprimir_factura_fin - comprimir_factura_start) + " / " + (insertar_stop - insertar_start) + " / " + (genera_factura_fin - genera_factura_start) + " / " + (firmar_factura_fin - firmar_factura_start) + " / " + (tiempo_total_stop - tiempo_total_start) +/*" / "+ (obtener_detalles_stop-obtener_detalles_start) + */"\n", { flag: 'a' });
            total_fact += NUM_GRUPO;

        }//End for
        res.status(200).send("OK");
    },
    getFacturaByTbai: async function (req, res) {
        var tbai_id = req.query.id;

        if (tbai_id == null) {
            return res.status(404).send("No se ha proporcionado id");
        }

        let resul = await findByTBAI(tbai_id);

        return res.status(resul.code).send(resul);

    },
    agrupar: async function (req, res) {
        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;


        const MAX_GRUPO = 5080
        for (var i = 1000; i <= MAX_GRUPO; i += 10) {
            //console.log(i);
            let nif_pos = Math.floor(Math.random() * nif_list.length);
            let nif = nif_list[nif_pos];

            //GENERACIÓN DE FECHAS DE LA AGRUPACION
            var fechaExpInicio = randomDate(new Date(2021, 0, 1), new Date(2021, 1, 21));
            let time = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
            time.setDate(time.getDate() + 7);
            var fechaExpFin = time.getDate().toString().padStart(2, "0") + "-" + (time.getMonth() + 1).toString().padStart(2, "0") + "-" + time.getFullYear();

            //GENERACION DE LA AGRUPACION
            let facturas_agrupadas = agruparNFacturas(i, nif, fechaExpInicio, fechaExpFin);
            //let tiempo_comprimir_start = performance.now();
            //COMPRESION DE LA AGRUPACION
            let compression = await compressData(facturas_agrupadas.agrupacion);
            //let tiempo_comprimir_fin = performance.now();

            let compress = compression.result;

            var bytes_sin_comprimir = new TextEncoder().encode(facturas_agrupadas.agrupacion).byteLength;
            var bytes_comprimida = compression.bytes;


            var data_to_insert = {};
            data_to_insert.nif = nif;
            data_to_insert.fechaInicio = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
            data_to_insert.fechaFin = moment(fechaExpFin, "DD-MM-YYYY").toDate();
            data_to_insert.idents = facturas_agrupadas.tbai_idents;
            data_to_insert.agrupacion = compress;


            let numParticiones = 0;
            //BYTES DE TODO EL DOCUMENTO A INSERTAR EN LA BD (NO PUEDE SUPERAR LOS 16MB)
            let bytes = new TextEncoder().encode(JSON.stringify(data_to_insert)).byteLength;
            //CALCULO EL NUMERO DE PARTICIONES DEL DOCUMENTO
            if (bytes % (15 * MB) == 0) {
                numParticiones = Math.floor(bytes / (15 * MB));
            } else {
                numParticiones = 1 + Math.floor(bytes / (15 * MB));
            }

            let array = [];

            if (numParticiones == 1) {
                array.push(data_to_insert);
            } else {
                //SI TENGO MAS DE UNA PARTICION DESCOMPRIMO (PARA NO TENER QUE VOLVER A GENERAR), Y VOY COGIENDO LAS FACTURAS
                let facturas_string = await unCompressData(compress);
                var facturas_array = facturas_string.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);

                for (var k = 0; k < numParticiones; k++) {
                    //Con slice le digo de donde a donde cojo.
                    /**
                     * [1,2,3,4,5,6,7,8,9,10,11].
                     * 
                     * Si tengo que hacer 4 particiones
                     * 
                     * P1 --> [1,2,3]
                     * P2 --> [4,5,6]
                     * P3 --> [7,8,9]
                     * P4 --> [10,11]
                     * 
                     */
                    let agrupacion = facturas_array.slice((k * i) / numParticiones, ((k + 1) * i) / numParticiones).join('');

                    //Comprimo y guardo la agrupacion partida en x trozos
                    let res = await compressData(agrupacion);
                    let agrupacion_compress = res.result;
                    let new_data_to_insert = {};
                    new_data_to_insert.nif = nif;
                    new_data_to_insert.fechaInicio = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
                    new_data_to_insert.fechaFin = moment(fechaExpFin, "DD-MM-YYYY").toDate();
                    new_data_to_insert.idents = facturas_agrupadas.tbai_idents.slice((k * i) / numParticiones, ((k + 1) * i) / numParticiones);
                    new_data_to_insert.agrupacion = agrupacion_compress;
                    array.push(new_data_to_insert);
                }//end for
            }//end if

            await insert_agrupadas(array);
            fs.writeFileSync('./files/identsGrupos_pequenas.txt', i + " / " + array[array.length - 1].idents[array[array.length - 1].idents.length - 1] + " / " + numParticiones + " / " + (1 - (bytes_comprimida / bytes_sin_comprimir)) + "\n", { flag: 'a' });
            console.log("Insertadas " + i + " agrupaciones.");

        }//end for

        res.status(200).send("OK");
    },
    test: async function (req, res) {

        //fs.writeFileSync("./files/test_facturas_pequenas_agrupadas_con_indice.csv", "Total Facturas Agrupadas;Numero de Particiones"/*;Ratio De Compresión*/ + ";Tiempo de búsqueda en BD;Tiempo de descompresión;Tiempo de búsqueda factura\n", { flag: 'w' });
        //fs.writeFileSync("./files/test_obtener_facturas_pequenas.csv", "Numero de Factura;Tiempo de búsqueda en BD;Tiempo de descompresión\n", {flag: 'w'});
        fs.writeFileSync("./files/test_facturas_grandes_sin_detalles.csv", "Numero Factura;Tiempo en Comprimir;Tiempo de Insercion;Ratio De Compresión;Tiempo de búsqueda en BD;Tiempo de descompresión;Tiempo Total insercion;Tiempo insertar detalles\n", { flag: 'w' });

        const file = fs.readFileSync("./files/idents_grandes_sin_detalles.txt").toString();

        const lines = file.split("\n");

        for (var i = 1; i < lines.length - 1; i++) {
            let line_split = lines[i].split(" / ");
            let resul = await findByTBAI(line_split[1]);
            //fs.writeFileSync("./files/test_facturas_pequenas_agrupadas_con_indice.csv", line_split[0] + ";" + line_split[2]/*+";"+line_split[3]*/ + ";" + resul.stats.busqueda_datos + ";" + resul.stats.descompresion + ";" + resul.stats.busqueda_factura + "\n", { flag: 'a' });
            fs.writeFileSync("./files/test_facturas_grandes_sin_detalles.csv", (i) + ";" + line_split[3] + ";" + line_split[4] + ";" + line_split[2] + ";" + resul.stats.busqueda_datos + ";" + resul.stats.descompresion + ";" + line_split[7] + ";" + line_split[8] + "\n", { flag: 'a' });
            //fs.writeFileSync("./files/test_obtener_facturas_pequenas.csv", (i+1)+";"+resul.stats.busqueda_datos+";"+resul.stats.descompresion+"\n", {flag: 'a'});
        }

        return res.status(200).send("OK");
    },
    createDbCassandra: async function (req, res) {
        const client = new cassandra.Client({
            contactPoints: ['127.0.0.1'],
            keyspace: 'ticketbai',
            localDataCenter: 'datacenter1'
        });

        client.connect()
            .then(function () {
                console.log('Connected to cluster with %d host(s): %j', client.hosts.length, client.hosts.keys());
                //console.log('Keyspaces: %j', Object.keys(client.metadata.keyspaces));
            })
            .catch(function (err) {
                console.error('There was an error when connecting', err);
                return client.shutdown().then(() => { throw err; });
            });

        var privateKey = fs.readFileSync('./keys/user1.pem');
        var sig = new SignedXml();
        sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
        sig.signingKey = privateKey;
        const MAX_FACTURAS = 1000;

        fs.writeFileSync('./cassandra_files/idents_facturas_grandes.txt', "NumFactura / Ident / Tiempo Inserción / Tiempo Compresion / Tiempo Insercion en BD\n", { flag: 'w' });

        for (var i = 1; i <= MAX_FACTURAS; i++) {

            let nif_pos = Math.floor(Math.random() * nif_list.length);
            let nif = nif_list[nif_pos];

            //GENERACION Y FIRMA DE FACTURA
            var genera_factura_start = performance.now();
            let data = dataGenerator.generate(nif, moment(randomDate(new Date(2021, 0, 1), new Date(2021, 1, 1)), "DD-MM-YYYY"), dataGenerator.sujetos_config, dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.huellaTBAI_config);
            let xml = generator.generate(data).toString();
            var genera_factura_fin = performance.now();
            //console.log(data);
            var firmar_factura_start = performance.now();
            sig.computeSignature(xml);
            var firmar_factura_fin = performance.now();

            let facturaTbai = sig.getSignedXml();
            var insercion_start = performance.now();
            const insertQuery = "insert into facturas (nif, fecha, tbai_id, importe, num_factura, serie, xml) values (?, ?, ?, ?, ?, ?, ?)";
            var comprimir_start = performance.now();
            let comprimida = await compressData(facturaTbai);
            var comprimir_fin = performance.now();
            const params = [
                DATA.getNif(facturaTbai),
                moment(DATA.getFechaExp(facturaTbai), "DD-MM-YYYY").toDate(),
                DATA.getIdentTBAI(facturaTbai),
                DATA.getImporteTotalFactura(facturaTbai),
                DATA.getNumFactura(facturaTbai),
                DATA.getSerieFactura(facturaTbai),
                comprimida.result
            ];
            var insercion_bd_start = performance.now();
            await client.execute(insertQuery, params, { prepare: true });
            var insercion_bd_fin = performance.now();
            var insercion_fin = performance.now();
            if (i % 1 == 0) {
                //console.log(i + ' Facturas insertadas'); 
                fs.writeFileSync('./cassandra_files/idents_facturas_grandes.txt', (i / 1) + ' / ' + params[2] + " / " + (insercion_fin - insercion_start) + " / " + (comprimir_fin - comprimir_start) + " / " + (insercion_bd_fin - insercion_bd_start) + "\n", { flag: 'a' });
            }

        }

        await client.shutdown();
        res.status(200).send("Generadas " + MAX_FACTURAS + " facturas.");

    },
    agruparCassandra: async function (req, res) {
        const client = new cassandra.Client({
            contactPoints: ['127.0.0.1'],
            keyspace: 'ticketbai',
            localDataCenter: 'datacenter1'
        });

        client.connect()
            .then(function () {
                console.log('Connected to cluster with %d host(s): %j', client.hosts.length, client.hosts.keys());
                //console.log('Keyspaces: %j', Object.keys(client.metadata.keyspaces));
            })
            .catch(function (err) {
                console.error('There was an error when connecting', err);
                return client.shutdown().then(() => { throw err; });
            });

        const MAX_AGRUPADAS = 1000;

        //fs.writeFileSync('./cassandra_files/idents_agrupadas_grandes.txt', 'NumAgrupaciones / Ident / TiempoCompresion / TiempoInsercion\n', {flag: 'w'});
        for (var i = 440; i <= MAX_AGRUPADAS; i += 10) {
            let nif_pos = Math.floor(Math.random() * nif_list.length);
            let nif = nif_list[nif_pos];

            //GENERACIÓN DE FECHAS DE LA AGRUPACION
            var fechaExpInicio = randomDate(new Date(2021, 0, 1), new Date(2021, 1, 21));
            let time = moment(fechaExpInicio, "DD-MM-YYYY").toDate();
            time.setDate(time.getDate() + 7);
            var fechaExpFin = time.getDate().toString().padStart(2, "0") + "-" + (time.getMonth() + 1).toString().padStart(2, "0") + "-" + time.getFullYear();
            var resultado = agruparNFacturas(i, nif, fechaExpInicio, fechaExpFin);

            var comprimir_start = performance.now();
            let compress_result = await compressData(resultado.agrupacion);
            var comprimir_fin = performance.now();


            const insert_query = 'insert into facturas_agrupadas (nif, fecha_inicio, agrupacion, fecha_fin, tbai_id_list) values (?, ?, ?, ?, ?)';
            const params = [
                nif,
                moment(fechaExpInicio, "DD-MM-YYYY").toDate(),
                compress_result.result,
                moment(fechaExpFin, "DD-MM-YYYY").toDate(),
                resultado.tbai_idents
            ];
            var insertar_start = performance.now();
            await client.execute(insert_query, params, { prepare: true });
            var insertar_fin = performance.now();

            fs.writeFileSync('./cassandra_files/idents_agrupadas_grandes.txt', i + ' / ' + resultado.tbai_idents[i - 1] + ' / ' + (comprimir_fin - comprimir_start) + ' / ' + (insertar_fin - insertar_start) + '\n', { flag: 'a' });
            console.log("Generadas " + i + " agrupaciones.");
        }

        res.status(200).send("Generadas " + MAX_AGRUPADAS + " agrupacions.");

    },
    getFacturaCassandra: async function (req, res) {
        var tbai_id = req.query.id;

        if (tbai_id == null) {
            return res.status(404).send("No se ha proporcionado id");
        }

        const client = new cassandra.Client({
            contactPoints: ['127.0.0.1'],
            keyspace: 'ticketbai',
            localDataCenter: 'datacenter1'
        });

        client.connect()
            .then(function () {
                console.log('Connected to cluster with %d host(s): %j', client.hosts.length, client.hosts.keys());
                //console.log('Keyspaces: %j', Object.keys(client.metadata.keyspaces));
            })
            .catch(function (err) {
                console.error('There was an error when connecting', err);
                return client.shutdown().then(() => { throw err; });
            });

        let ident_split = tbai_id.split('-');
        const query = "select * from facturas where nif=? and fecha=?";
        const params = [ident_split[1], moment(ident_split[2], "DDMMYY").format("YYYY-MM-DD")];

        let result = await client.execute(query, params, { prepare: true });
        let xml = await unCompressData(result.rows[0].xml);

        await client.shutdown();
        res.status(200).send(xml);

    },
    testCassandra: async function (req, res) {
        const client = new cassandra.Client({
            contactPoints: ['127.0.0.1'],
            keyspace: 'ticketbai',
            localDataCenter: 'datacenter1'
        });

        client.connect()
            .then(function () {
                console.log('Connected to cluster with %d host(s): %j', client.hosts.length, client.hosts.keys());
                //console.log('Keyspaces: %j', Object.keys(client.metadata.keyspaces));
            })
            .catch(function (err) {
                console.error('There was an error when connecting', err);
                return client.shutdown().then(() => { throw err; });
            });

        const file = fs.readFileSync('./cassandra_files/idents_agrupadas_pequenas.txt').toString();
        //fs.writeFileSync('./cassandra_files/test_obtener_facturas_grandes.csv', 'Numero factura; Tiempo en insertar Total;Tiempo en insertar en BD;Tiempo en comprimir;Tiempo en obtener de BD; Tiempo en Descomprimir\n', { flag: 'w' });
        fs.writeFileSync('./cassandra_files/test_agrupadas_pequenas_new.csv', 'Numero factura; Tiempo en Comprimir;Tiempo en insertar;Tiempo en obtener de BD; Tiempo en Descomprimir;Tiempo en Buscar Factura\n', { flag: 'w' });
        var lines = file.split('\n');

        for (var i = 1; i < lines.length - 1; i++) {
            var line_split = lines[i].split(" / ");
            let ident_split = line_split[1].split('-');
            var query = "select * from facturas where nif=? and fecha=?";
            var params = [ident_split[1], moment(ident_split[2], "DDMMYY").format("YYYY-MM-DD")];
            var busqueda_start = performance.now();
            let result = await client.execute(query, params, { prepare: true });

            if (result.rowLength == 0) {//La factura esta en la agrupacion
                
                query = "select * from facturas_agrupadas where nif=? and fecha_inicio <= ?";

                let result = await client.execute(query, params, {prepare:true});
                if(result.rowLength == 1){
                    //console.log(params[0] + " --> " + result.rowLength);
                    var busqueda_fin = performance.now();
                    var compresion_start = performance.now();
                    let xml = await unCompressData(result.rows[0].agrupacion);;
                    var compresion_fin = performance.now();
                    var busqueda_factura_agrupacion_start = performance.now();
                    var busqueda_factura_agrupacion_fin;
                    var facturas_array = xml.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                    
                    /*for(var j = 0; j < facturas_array.length; j++){
                        if(line_split[1] == DATA.getIdentTBAI(facturas_array[j])){
                            busqueda_factura_agrupacion_fin = performance.now();
                            break;
                        }
                    }*/
                    var pos = Array.from(result.rows[0].tbai_id_list).indexOf(line_split[1]);
                    let data = facturas_array[pos];
                    busqueda_factura_agrupacion_fin = performance.now();
                    fs.writeFileSync('./cassandra_files/test_agrupadas_pequenas_new.csv', line_split[0] + ";" + line_split[2] + ";" + line_split[3] + ";"+ (busqueda_fin - busqueda_start) + ";" + (compresion_fin - compresion_start) +";"+(busqueda_factura_agrupacion_fin- busqueda_factura_agrupacion_start)+ "\n", { flag: 'a' });
                }
               //res.status(200).send("OK");


            } else {
                var busqueda_fin = performance.now();
                var compresion_start = performance.now();
                let xml = await unCompressData(result.rows[0].xml);;
                var compresion_fin = performance.now();

                fs.writeFileSync('./cassandra_files/test_obtener_facturas_grandes.csv', line_split[0] + ";" + line_split[2] + ";" + line_split[4] + ";" + line_split[3] + ";" + (busqueda_fin - busqueda_start) + ";" + (compresion_fin - compresion_start) + "\n", { flag: 'a' });
            }

        }

        await client.shutdown().then(console.log("Connection closed"));
        res.status(200).send("OK");
    }
};




async function executeQuery(query, projection) {
    return new Promise((resolve) => {
        Factura.find(query, projection, (err, result) => {
            if (!err) resolve(result);
        });
    });
}
/**
 * Busca la factura que coincide con el id que se le pasa como parametro. Primero busca en la coleccion Facturas,
 * que es la coleccion que contiene las facturas unitarias. Si no lo encuentra, busca en la coleccion de facturas_agrupadas,
 * y devulve la factura correspondiente.
 * @param {string} tbai_id identificador de la factura
 * @returns La factura cuyo identificador coincide con tbai_id
 */
async function findByTBAI(tbai_id) {
    return new Promise((resolve) => {
        var busqueda_datos_start = performance.now();
        Factura.findById(tbai_id, (err, factura) => {
            var busqueda_datos_fin = performance.now();
            if (err) resolve({
                code: 500,
                data: "Error al devolver los datos",
                stats: {}
            });
            if (!factura) {//No he encontrado una factura con esa id (Estará comprimida)
                //TBAI-82275936Z-010120-dPmfSHpsGqWpI-120
                var tbai_split = tbai_id.split("-");
                let nif = tbai_split[1];
                let fecha = moment(tbai_split[2], "DDMMYY").toDate();
                busqueda_datos_start = performance.now();
                AgrupacionFactura.find({ nif: nif, fechaInicio: { $lte: fecha }, fechaFin: { $gte: fecha } }, (err, docs) => {
                    var busqueda_datos_fin = performance.now();
                    if (err) resolve({
                        code: 500,
                        data: "Error al devolver los datos",
                        stats: {}
                    });
                    if (!docs) resolve({
                        code: 404,
                        data: "No se ha encontrado la factura con ese identificador",
                        stats: {}
                    });

                    for (var i = 0; i < docs.length; i++) {
                        if (docs[i].idents.includes(tbai_id)) {
                            var pos = Array.from(docs[i].idents).indexOf(tbai_id);
                            var descompresion_start = performance.now();
                            unCompressData(docs[i].agrupacion).then((resul) => {
                                var descompresion_fin = performance.now();

                                var busqueda_factura_start = performance.now();
                                var facturas_array = resul.split(/(?=\<\?xml version="1\.0" encoding="utf-8"\?\>)/);
                                let data = facturas_array[pos];
                                var busqueda_factura_fin = performance.now();
                                resolve({
                                    code: 200,
                                    data: data,
                                    stats: {
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
                    //fs.writeFileSync('./files/factura_pequena.xml', resul);
                    resolve({
                        code: 200,
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

function agruparNFacturas(num, nif, fechaInicio, fechaFin) {
    var privateKey = fs.readFileSync('./keys/user1.pem');
    var sig = new SignedXml();
    sig.addReference("//*[local-name(.)='Cabecera' or local-name(.) = 'Sujetos' or local-name(.) = 'Factura' or local-name(.) = 'HuellaTBAI']");
    sig.signingKey = privateKey;
    var to_return = {};
    var tbai_idents = [];
    var agrupacion = "";
    for (var i = 0; i < num; i++) {
        let data = dataGenerator.generate(nif, moment(randomDate(moment(fechaInicio, "DD-MM-YYYY").toDate(), moment(fechaFin, "DD-MM-YYYY").toDate()), "DD-MM-YYYY"),
            dataGenerator.sujetos_config, dataGenerator.cabecera_factura_config, dataGenerator.datos_factura_config, dataGenerator.huellaTBAI_config);
        let xml = generator.generate(data).toString();
        sig.computeSignature(xml);
        let factura = sig.getSignedXml();
        //console.log("NumFactura --> "+i+" // Tamano (MB) --> "+((new TextEncoder().encode(agrupacion).byteLength)/MB));
        agrupacion += factura;
        tbai_idents.push(DATA.getIdentTBAI(factura));
    }

    to_return.agrupacion = agrupacion;
    to_return.tbai_idents = tbai_idents;

    return to_return;
}

module.exports = controller;
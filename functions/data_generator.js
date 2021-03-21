'use strict'

const { uniqueNamesGenerator, names, adjectives, colors } = require('unique-names-generator');
const namesConfig = {
    dictionaries: [names, adjectives, colors]
}

const MAX_NUMBER = 100000;

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


function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Devuelve un string aleatorio de longitud length
 * @param {Number} length Longitud del string
 * @returns String aleatorio
 */
function getRandomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Numero aleatorio entre min (incluido) y max (excluido) con fix decimales
 * @param {Number} min - Minimo numero posible
 * @param {Number} max - Máximo número posible (Excluido)
 * @param {Number} fix - Número de decimales
 * @returns un número aleatorio
 */
function getRandomArbitrary(min, max, fix) {
    return (Math.random() * (max - min) + min).toFixed(fix);
}

/**
 * Genera una fecha aleatoria entre las dos fechas que se pasan por parametro
 * @param {Date} start 
 * @param {Date} end 
 * @returns Fecha en formato DD-MM-AAAA
 */
function randomDate(start, end) {
    var options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    var dt = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));//.toLocaleDateString('es', options).replace('/','-').replace('/','-');
    var year = dt.getFullYear();
    var month = (dt.getMonth() + 1).toString().padStart(2, "0");
    var day = dt.getDate().toString().padStart(2, "0");

    return (day + "-" + month + "-" + year);
}

/**
 * Devuelve la Hora aleatoria de un dia aleatorio entre las fechas dadas. 
 * @param {Date} start
 * @param {Date} end 
 * @returns Hora aleatoria de un dia aleatorio entre start y end
 */
function randomHour(start, end) {
    var options = { hour: 'numeric', minute: 'numeric', second: 'numeric' };
    var dt = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    var hours = (dt.getHours() + 1).toString().padStart(2, "0");
    var minutes = (dt.getMinutes() + 1).toString().padStart(2, "0");
    var sec = (dt.getSeconds() + 1).toString().padStart(2, "0");

    return (hours + ":" + minutes + ":" + sec);
}


function desgloseSujetaNoSujeta(desglose, options = {
    sujeta: {
        exenta: { numDetallesExenta: -1 },
        noExenta: {
            numDetallesNoExenta: -1,
            numDetallesIVA: -1
        }
    },
    noSujeta: { numDetallesNoSujeta: -1 }
}) {
    console.log(options.sujeta.exenta.numDetallesExenta);
    if (options.hasOwnProperty('sujeta')) {//Creo el desglose "Sujeta"
        if (options.sujeta.hasOwnProperty('exenta')) {
            if (options.sujeta.exenta.numDetallesExenta != -1) {
                
                var max = 1;
                if (options.sujeta.exenta.hasOwnProperty('numDetallesExenta')) {
                    if (options.sujeta.exenta.numDetallesExenta > 0 && options.sujeta.exenta.numDetallesExenta < 8) {
                        max = options.sujeta.exenta.numDetallesExenta;
                    } else {
                        max = getRandomInt(1, 8);
                    }
                } else {
                    max = getRandomInt(1, 8);
                }
                desglose.Sujeta.Exenta = [];
                for (var i = 0; i < max; i++) {
                    var exenta = {
                        "CausaExencion": "E" + getRandomInt(1, 7),
                        "BaseImponible": getRandomArbitrary(0, MAX_NUMBER, 2)
                    };
                    desglose.Sujeta.Exenta.push(exenta);
                }
            }
        }//Fin Exenta

        if (options.sujeta.hasOwnProperty('noExenta')) {
            if (options.sujeta.noExenta.hasOwnProperty('numDetallesNoExenta')) {
                if (options.sujeta.noExenta.numDetallesNoExenta != -1) {
                    var maxDetallesNoExenta = getRandomInt(1, 3);
                    var maxDetallesIVA = getRandomInt(1, 7);

                    if (options.sujeta.noExenta.hasOwnProperty('numDetallesNoExenta')) {
                        if (options.sujeta.noExenta.numDetallesNoExenta > 0 && options.sujeta.noExenta.numDetallesNoExenta < 3) {
                            maxDetallesNoExenta = options.sujeta.noExenta.numDetallesNoExenta;
                        }
                    }

                    if (options.sujeta.noExenta.hasOwnProperty('numDetallesIVA')) {
                        if (options.sujeta.noExenta.numDetallesIVA > 0 && options.sujeta.noExenta.numDetallesIVA < 3) {
                            maxDetallesIVA = options.sujeta.noExenta.numDetallesIVA;
                        }
                    }

                    desglose.Sujeta.NoExenta = [];
                    for (var i = 0; i < maxDetallesNoExenta; i++) {
                        var noExenta = {
                            "TipoNoExenta": "S" + getRandomInt(1, 3),
                            "DesgloseIVA": []
                        };
                        for (var j = 0; j < maxDetallesIVA; j++) {
                            var desgloseIva = {
                                "BaseImponible": getRandomArbitrary(0, MAX_NUMBER, 2)
                            };

                            var rand = getRandomInt(0, 2);
                            if (rand == 0) {
                                desgloseIva.TipoImpositivo = getRandomArbitrary(0, 101, 2);
                            }

                            rand = getRandomInt(0, 2);
                            if (rand == 0) {
                                desgloseIva.CuotaImpuesto = getRandomArbitrary(0, MAX_NUMBER, 2);
                            }

                            rand = getRandomInt(0, 2);
                            if (rand == 0) {
                                desgloseIva.TipoRecargoEquivalencia = getRandomArbitrary(0, 101, 2);
                            }

                            rand = getRandomInt(0, 2);
                            if (rand == 0) {
                                desgloseIva.CuotaRecargoEquivalencia = getRandomArbitrary(0, MAX_NUMBER, 2);
                            }

                            rand = getRandomInt(0, 2);
                            if (rand == 0) {
                                desgloseIva.OperacionEnRecargoDeEquivalenciaORegimenSimplificado = sinNo_list[getRandomInt(0, 2)];
                            }
                            noExenta.DesgloseIVA.push(desgloseIva);
                        }//End for
                        desglose.Sujeta.NoExenta.push(noExenta);
                    }//End for
                }
            }
        }//Fin NoExenta
    }//Fin Sujeta

    if (options.hasOwnProperty('noSujeta')) {//Creo el desglose "NoSujeta"
        var maxDetallesNoSujeta = getRandomInt(1, 3);
        if (options.noSujeta.hasOwnProperty('numDetallesNoSujeta')) {
            if (options.noSujeta.numDetallesNoSujeta > 0 && options.noSujeta.numDetallesNoSujeta < 3) {
                maxDetallesNoSujeta = options.noSujeta.numDetallesNoSujeta;
            }
        }
        desglose.NoSujeta = [];
        for (var i = 0; i < maxDetallesNoSujeta; i++) {
            var desgloseNoSujeta = {
                "Causa": noSujeta_list[getRandomInt(0, noSujeta_list.length)],
                "Importe": getRandomArbitrary(0, MAX_NUMBER, 2)
            };
            desglose.NoSujeta.push(desgloseNoSujeta);
        }//End for
    }//End If
    return desglose;
}//End function


function generarSujetos(json, options = {
    destinatarios : -1,
    emitidaPorTercerosODestinatario: false
}) {
    if(options.hasOwnProperty('destinatarios')){
        if(options.destinatarios > 0){
            generarDestinatarios(json, options.destinatarios);
            json.VariosDestinatarios = "S";
        }
    }

    if(options.hasOwnProperty('emitidaPorTercerosODestinatarios')){
        if(options.emitidaPorTercerosODestinatario){
            json.emitidaPorTercerosODestinatario = "S";
        }
    }
}


/**
 * Crea numDest destinatarios aleatorios para una factura
 * @param {JSON} json - Contenido del elemento "Sujetos" de la factura
 * @param {number} numDest - Numero de destinatarios a crear
 * @returns {JSON} - Contenido del elemento "Sujetos" actualizado con el numero de destinatarios correspondientes.
 */
function generarDestinatarios(json, numDest) {
    json.Destinatarios = [];

    //var max_dest = getRandomInt(1, 101);
    for (var i = 0; i < numDest; i++) {
        var destinatario = {};
        if (getRandomInt(0, 2) == 0) { //NIF
            destinatario.NIF = rand_dni();
        } else {//IDOtro
            destinatario.IDOtro = {
                "IDType": "0" + getRandomInt(2, 7),
                "ID": getRandomString(getRandomInt(1, 21))
            };

            if (getRandomInt(0, 2) == 0) {//Tengo Codigo Pais
                destinatario.IDOtro.CodigoPais = country_list[getRandomInt(0, country_list.length)];
            }
        }

        destinatario.ApellidosNombreRazonSocial = getRandomString(getRandomInt(1, 121));
        destinatario.CodigoPostal = getRandomString(getRandomInt(1, 21));
        destinatario.Direccion = getRandomString(getRandomInt(1, 251));
        json.Destinatarios.push(destinatario);
    }//End for
    return json;
}

/**
 * Añade el elemento "FacturaRectificativa" al json con los datos
 * @param {JSON} json - Elemento "Cabecera" de la factura
 * @param {JSON} options - Elementos Opcionales de la factura Rectificativa
 * @returns - El elemento "Cabecera" actualizado
 */
function facturaRectificativa(json, options = { importeRectificacion: false, cuotaRecargo: false }) {


    json.FacturaRectificativa = {
        "Codigo": "R" + getRandomInt(1, 6)
    };

    var rand = getRandomInt(0, 2);
    if (rand == 1) {
        json.FacturaRectificativa.Tipo = "S";
    } else {
        json.FacturaRectificativa.Tipo = "I";
    }

    json.FacturaRectificativa.Tipo = rectificativaType_list[getRandomInt(0, rectificativaType_list.length)];
    if (options.hasOwnProperty('importeRectificacion')) {
        if (options.importeRectificacion) {
            json.FacturaRectificativa.ImporteRectificacionSustitutiva = {
                "BaseRectificada": getRandomArbitrary(0, MAX_NUMBER, 2),
                "CuotaRectificada": getRandomArbitrary(0, MAX_NUMBER, 2)
            };
        }
        if (options.hasOwnProperty('cuotaRecargo')) {
            if (options.cuotaRecargo) {
                json.FacturaRectificativa.ImporteRectificacionSustitutiva.CuotaRecargoRectificada = getRandomArbitrary(0, MAX_NUMBER, 2);
            }
        }

    }
}

function facturasRectificadasSustituidas(json, options = {
    serieFactura: false,
    numFacturas: 0
}) {
    //rand = getRandomInt(1,101);
    json.FacturasRectificadasSustituidas = [];
    var max = 0;
    if (options.hasOwnProperty('numFacturas')) {
        if (options.numFacturas < 1) {
            max = getRandomInt(1, 101);
        } else {
            max = options.numFacturas;
        }
    } else {
        max = getRandomInt(1, 101);
    }

    for (var i = 0; i < max; i++) {
        var factRectSust = {
            "NumFactura": getRandomString(getRandomInt(0, 21)),
            "FechaExpedicionFactura": randomDate(new Date(2012, 0, 1), new Date())
        };

        if (options.hasOwnProperty('serieFactura')) {
            if (options.serieFactura) {
                factRectSust.SerieFactura = getRandomString(getRandomInt(0, 21));
            }
        }
        json.FacturasRectificadasSustituidas.push(factRectSust);
    }//End for
}


/**
 * 
 * @param {JSON} json - Elemento "Cabecera" de la factura
 * @param {JSON} options - Parametros opcionales de la Cabecera de la factura
 */
function generarCabeceraFactura(json, options = {
    serieFactura: false,
    facturaSimplificada: false,
    facturaEmitidaSustitucionSimplificada: false,
    facturaRectificativa: { importeRectificacion: false, cuotaRecargo: false },
    facturaRectificadaSustituida: { serieFactura: false, numFacturas: 0 }
}) {
    //json == json.Factura.Cabecera

    if (options.hasOwnProperty('serieFactura')) {
        if (options.serieFactura) {
            json.SerieFactura = getRandomString(getRandomInt(1, 20));
        }
    }

    if (options.hasOwnProperty('facturaSimplificada')) {
        if (options.facturaSimplificada) {
            json.FacturaSimplificada = sinNo_list[getRandomInt(0, 2)];
        }
    }

    if (options.hasOwnProperty('facturaEmitidaSustitucionSimplificada')) {
        if (options.facturaEmitidaSustitucionSimplificada) {
            json.FacturaEmitidaSustitucionSimplificada = sinNo_list[getRandomInt(0, 2)];
        }
    }

    if (options.hasOwnProperty('facturaRectificativa')) {
        facturaRectificativa(json, options.facturaRectificativa);
    }

    if (options.hasOwnProperty('facturaRectificadaSustituida')) {
        facturasRectificadasSustituidas(json, options.facturaRectificadaSustituida);
    }
}


function detallesDatosFactura(json, options = {
    numDetalles: 0
}) {
    var detalle_size = 1;
    if (options.hasOwnProperty('numDetalles')) {
        if (options.numDetalles < 1) {
            detalle_size = getRandomInt(1, 1001);
        } else {
            detalle_size = options.numDetalles;
        }
    } else {
        detalle_size = getRandomInt(1, 1001);
    }

    json.DetallesFactura = [];

    for (var i = 0; i < detalle_size; i++) {
        var detalle = {
            "DescripcionDetalle": getRandomString(getRandomInt(0, 251)),
            "Cantidad": getRandomArbitrary(0, MAX_NUMBER, 2),
            "ImporteUnitario": getRandomArbitrary(0, MAX_NUMBER, 8),
            "ImporteTotal": getRandomArbitrary(0, MAX_NUMBER, 2)
        };

        if (getRandomInt(0, 2) == 0) {
            detalle.Descuento = getRandomArbitrary(0, 101, 2);
        }

        json.DetallesFactura.push(detalle);
    }
}

function datosFactura(json, options = {
    fechaOperacion: false,
    detallesFactura: { numDetalles: 0 },
    retencionSoportada: false,
    baseImponibleACoste: false,
    numClaves: 0
}) {

    if (options.hasOwnProperty('fechaOperacion')) {
        if (options.fechaOperacion) {
            json.FechaOperacion = randomDate(new Date(2012, 0, 1), new Date());
        }
    }

    if (options.hasOwnProperty('detallesFactura')) {
        detallesDatosFactura(json, options.detallesFactura);
    }

    if (options.hasOwnProperty('retencionSoportada')) {
        if (options.retencionSoportada) {
            json.RetencionSoportada = getRandomArbitrary(0, MAX_NUMBER, 2);
        }
    }

    if (options.hasOwnProperty('baseImponibleACoste')) {
        if (options.baseImponibleACoste) {
            json.BaseImponibleACoste = getRandomArbitrary(0, MAX_NUMBER, 2);
        }
    }

    var claves_size = 1;
    if (options.hasOwnProperty('numClaves')) {
        if (options.numClaves < 1 || options.numClaves > 3) {
            claves_size = getRandomInt(1, 4);
        } else {
            claves_size = options.numClaves;
        }
    } else {
        claves_size = getRandomInt(1, 4);
    }

    json.Claves = [];
    for (var i = 0; i < claves_size; i++) {
        var clave = {
            "ClaveRegimenIvaOpTrascendencia": ClaveRegimenIvaOpTrascendencia_list[getRandomInt(0, ClaveRegimenIvaOpTrascendencia_list.length)]
        };
        json.Claves.push(clave);
    }
}

function tipoDesglose(json, options = {
    desgloseFactura: false,
    desgloseTipoOperacion: { prestacionServicios: false, entrega: false },
    desglose: {
        sujeta: {
            exenta: { numDetallesExenta: 0 },
            noExenta: {
                numDetallesNoExenta: 0,
                numDetallesIVA: 0
            }
        },
        noSujeta: { numDetallesNoSujeta: 0 }
    }
}) {
    console.log(options.desglose);
    if (options.hasOwnProperty('desgloseFactura')) {
        if (options.desgloseFactura) {
            if (!options.hasOwnProperty('desgloseTipoOperacion')) {
                json.DesgloseFactura = {};
                json.DesgloseFactura = desgloseSujetaNoSujeta(json.DesgloseFactura);
            } else {
                throw "Error en TipoDesglose --> desgloseFactura y desgloseTipoOperacion son EXCLUYENTES";
            }
        } else {
            json.DesgloseTipoOperacion = {};
            if (options.hasOwnProperty('desgloseTipoOperacion')) {
                if (options.desgloseTipoOperacion.hasOwnProperty('prestacionServicios')) {
                    if (options.desgloseTipoOperacion.prestacionServicios) {
                        desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.PrestacionServicios = {}, options.desglose);
                    }
                }

                if (options.desgloseTipoOperacion.hasOwnProperty('entrega')) {
                    if (options.desgloseTipoOperacion.entrega) {
                        desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.Entrega = {}, options.desglose);
                    }
                }
            }
        }
    } else {
        if (options.hasOwnProperty('desgloseTipoOperacion')) {
            json.DesgloseTipoOperacion = {};
            if (options.hasOwnProperty('prestacionServicios')) {
                if (options.prestacionServicios) {
                    desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.PrestacionServicios, options.desglose);
                }
                if (options.entrega) {
                    desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.Entrega, options.desglose);
                }
            }
        }
    }
}

function huellaTBAI(json, options = {
    encademaniento : {
        value: false,
        serieFacturaAnterior: false
    },
    entidadNIF: true,
    entidadIdOtro: false,
    numSerieDispositivo: false
}) {
    
    if(options.hasOwnProperty('encadenamiento')){
        if(options.encademaniento.hasOwnProperty('value')){
            if(options.encademaniento.value){
                json.EncadenamientoFacturaAnterior = {
                    "NumFacturaAnterior": getRandomString(getRandomInt(0, 21)),
                    "FechaExpedicionFacturaAnterior": randomDate(new Date(2012, 0, 1), new Date()),
                    "SignatureValueFirmaFacturaAnterior": getRandomString(100)
                };
                if (options.encademaniento.hasOwnProperty('serieFacturaAnterior')) {
                    if(options.encademaniento.serieFacturaAnterior){
                        json.EncadenamientoFacturaAnterior.SerieFacturaAnterior = getRandomString(getRandomInt(0, 21));
                    }
                    
                }
            }
        }
    }//Fin encadenamiento


    if(options.hasOwnProperty('entidadNIF')){
        if(options.entidadNIF){
            json.Software.EntidadDesarrolladora = {
                "NIF": rand_dni()
            };
        }else{
            json.Software.EntidadDesarrolladora = {
                "IDOtro": {
                    "IDType": "0" + getRandomInt(2, 7),
                    "ID": getRandomString(getRandomInt(0, 21))
                }
            };
            var rand = getRandomInt(0, 2);
            if (rand == 0) {
                json.Software.EntidadDesarrolladora.IDOtro.CodigoPais = country_list[getRandomInt(0, country_list.length)];
            }
        }
    }else{
        json.Software.EntidadDesarrolladora = {
            "IDOtro": {
                "IDType": "0" + getRandomInt(2, 7),
                "ID": getRandomString(getRandomInt(0, 21))
            }
        };
        var rand = getRandomInt(0, 2);
        if (rand == 0) {
            json.Software.EntidadDesarrolladora.IDOtro.CodigoPais = country_list[getRandomInt(0, country_list.length)];
        }
    }

    if(options.hasOwnProperty('numSerieDispositivo')){
        if(options.numSerieDispositivo){
            json.NumSerieDispositivo = getRandomString(getRandomInt(0, 31));
        }
    }
}

module.exports = {
    generate: function generate() {
        var json = {
            "Sujetos": {
                "Emisor": {
                    "NIF": rand_dni(),
                    "ApellidosNombreRazonSocial": getRandomString(getRandomInt(0, 120))
                }
            },
            "Factura": {
                "Cabecera": {
                    "NumFactura": getRandomInt(0, MAX_NUMBER),
                    "FechaExpedicionFactura": randomDate(new Date(2012, 0, 1), new Date()),
                    "HoraExpedicionFactura": randomHour(new Date(2012, 0, 1), new Date())
                },
                "DatosFactura": {
                    "DescripcionFactura": getRandomString(getRandomInt(0, 250)),
                    "ImporteTotalFactura": getRandomArbitrary(0, MAX_NUMBER, 2)
                },
                "TipoDesglose": {

                }
            },
            "HuellaTBAI": {
                "Software": {
                    "LicenciaTBAI": getRandomString(getRandomInt(0, 21)),
                    //"Nombre" : nameList[getRandomInt(0,nameList.length)],
                    "Nombre": getRandomString(getRandomInt(0, 121)),
                    "Version": getRandomString(getRandomInt(0, 21))
                }
            }
        };

        generarSujetos(json.Sujetos, {
            destinatarios: 2,
            emitidaPorTercerosODestinatario: true
        })

        /* FACTURA */

        generarCabeceraFactura(json.Factura.Cabecera, {
            serieFactura: true, facturaSimplificada: true, facturaEmitidaSustitucionSimplificada: true, facturaRectificativa: {
                importeRectificacion: true, cuotaRecargo: false
            }
        });

        datosFactura(json.Factura.DatosFactura, {
            fechaOperacion: true,
            detallesFactura: {
                numDetalles: 2
            },
            retencionSoportada: true,
            baseImponibleACoste: true,
            numClaves: 2
        });

        tipoDesglose(json.Factura.TipoDesglose, {
            desgloseFactura: true,
            desglose: {
                sujeta: {
                    exenta: {numDetallesExenta: 4}
                }
            }
        });

        /* HUELLA TBAI*/

        huellaTBAI(json.HuellaTBAI, {
            encademaniento:{
                value: true,
                serieFacturaAnterior: true
            },
            entidadNIF: false,
            numSerieDispositivo: true
        });

        return json;
    }
};

const rectificativaType_list = ["S", "I"];
const sinNo_list = ["S", "N"];
const emitidaPorTerceros_list = ["N", "T", "D"];
const noSujeta_list = ["OT", "RL"];
const ClaveRegimenIvaOpTrascendencia_list = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "51", "52", "53"];
const country_list = ["AD", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AT", "AU", "AW", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GG", "GH", "GI", "GL", "GM", "GN", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"];
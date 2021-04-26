'use strict'

const { uniqueNamesGenerator, names, adjectives, colors } = require('unique-names-generator');
const namesConfig = {
    dictionaries: [names, adjectives, colors]
}

const MAX_NUMBER = 100000;


const sujetos_config = {
    destinatarios: -1, //Numero de destinatarios. (-1) si no existen destinatarios
    emitidaPorTercerosODestinatario: true //Indica si quiero el elemento emitida por terceros
};

const cabecera_factura_config = {
    serieFactura: true,
    facturaSimplificada: true,
    facturaEmitidaSustitucionSimplificada: true,
    facturaRectificativa: {
        value: true, //Indica si quiero el elemento FacturaRectificativa
        importeRectificacion: true,
        cuotaRecargo: false
    },
    facturaRectificadaSustituida: {
        value: false, //Indica si quiero el elemento FacturaRectificadaSustituida
        serieFactura: true,
        numFacturas: 1
    }
};
const datos_factura_config = {
    fechaOperacion: false,
    detallesFactura: { numDetalles: 1 },
    retencionSoportada: false,
    baseImponibleACoste: true,
    numClaves: 1
};
const tipo_desglose_config = {
    desgloseFactura: false, //TipoDesglose --> DesgloseFactura / Si es true da igual lo que valga desgloseTipoOperacion
    desgloseTipoOperacion: { prestacionServicios: false, entrega: false }, // Solo se genera si desgloseFactura
    //no esta definido o es false y ademas prestacionServicios o entrega  o los dos es true.
    desglose: {
        sujeta: {
            value: false, // Si es true, se genera la factura sujeta, aunque puede que este vacia.
            exenta: {
                value: false,// Si es true genero la factura sujeta exenta
                numDetallesExenta: 1 //Numero de deralles de la factura exenta (1 a 7)
            },
            noExenta: {
                value: true, // Si es true genero la factura NoExenta
                numDetallesNoExenta: 1, //Numero de detalles (1 a 2)
                numDetallesIVA: 1 //Numero de detalles de desglose de IVA (1 a 6)
            }
        },
        noSujeta: {
            value: false, //Si es true genero la factura NoSujeta
            numDetallesNoSujeta: 1 //Numero de detalles de la factura NoSujeta
        }
    }
};

const huellaTaBAI_config = {
    encadenamiento: {
        value: true, //Si es true genero el elemento EncadenamientoFacturaAnterior
        serieFacturaAnterior: true //Si es true genero el campo SerieFacturaAnterior
    },
    entidadNIF: false, //Si es true la entidad se identifica mediante el NIF. (Si es false o no existe se identifica con el otro metodo)
    entidadIdOtro: true, // Si es true la entidad se identifica de otra forma
    numSerieDispositivo: true //Indica si quiero el campo numSerieDispositivo
};



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

/**
 * 
 * @returns Número de DNI, con letra incluida.
 */
function rand_dni() {
    var num = Math.floor((Math.random() * 100000000));
    var sNum = formatNumberLength(num, 8);
    return sNum + charDNI(sNum);
}

/**
 * Devuelve un número aleatorio entre [min,max)
 * @param {Number} min - Limite inferior
 * @param {Number} max - Limite superior (Excluido)
 * @returns Numero aleatorio entre min y max
 */
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
    var dt = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    var hours = (dt.getHours()).toString().padStart(2, "0");
    var minutes = (dt.getMinutes()).toString().padStart(2, "0");
    var sec = (dt.getSeconds()).toString().padStart(2, "0");

    return (hours + ":" + minutes + ":" + sec);
}

/**
 * 
 * @param {JSON} desglose - Elemento al que añadir el desglose de factura Sujeta y/o NoSujeta
 * @param {JSON} options - Opciones de configuracion del desglose
 * @returns El desglose actualizado
 */
function desgloseSujetaNoSujeta(desglose, options = {
    sujeta: {
        value: false,   //Indica si quiero o no que exista el elemento Sujeta, si es false lo demas no se evalua
        exenta: {
            value: false, //Indica si quiero o no que exista el elemento Exenta.
            numDetallesExenta: -1 //Numero de detalles en Exenta, si el valor no es valido se da uno aleatorio.
        },
        noExenta: {
            value: false, //Indica si quiero o no que exista el elemento NoExenta.
            numDetallesNoExenta: -1, //Indica el numero de detalles en NoExenta
            numDetallesIVA: -1 //Indica el numero de detalles en el desglose de IVA
        }
    },
    noSujeta: {
        value: false, //Indica si quiero o no que exista el elemento NoSujeta
        numDetallesNoSujeta: -1 //Indica el numero de detalles del elemento NoSujeta
    }
}) {
    if (options.hasOwnProperty('sujeta')) {//Creo el desglose "Sujeta"
        if (options.sujeta.hasOwnProperty('value')) {
            if (options.sujeta.value) {
                desglose.Sujeta = {};
                if (options.sujeta.hasOwnProperty('exenta')) {
                    if (options.sujeta.exenta.hasOwnProperty('value')) {
                        if (options.sujeta.exenta.value) {
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
                        }
                    }
                }//Fin Exenta

                if (options.sujeta.hasOwnProperty('noExenta')) {
                    if (options.sujeta.noExenta.hasOwnProperty('value')) {
                        if (options.sujeta.noExenta.value) {
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
                                        if (options.sujeta.noExenta.numDetallesIVA > 0 && options.sujeta.noExenta.numDetallesIVA < 7) {
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
                        }
                    }
                }//Fin NoExenta
            }
        }
    }//Fin Sujeta

    if (options.hasOwnProperty('noSujeta')) {//Creo el desglose "NoSujeta"
        if (options.noSujeta.hasOwnProperty('value')) {
            if (options.noSujeta.value) {
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
            }
        }
    }//End NoSujeeta
    return desglose;
}//End function

/**
 * Genera el bloque Sujetos de la factura
 * @param {JSON} json - JSON con el elemento Sujetos
 * @param {JSON} options - Parametros de configuracion de los Sujetos
 */
function generarSujetos(json, options = {
    destinatarios: -1, //Numero de destinatarios. (-1) si no existen destinatarios
    emitidaPorTercerosODestinatario: false //Indica si quiero el elemento emitida por terceros
}) {
    if (options.hasOwnProperty('destinatarios')) {
        if (options.destinatarios > 0) {
            generarDestinatarios(json, options.destinatarios);
            json.VariosDestinatarios = "S";
        }
    }

    if (options.hasOwnProperty('emitidaPorTercerosODestinatario')) {
        if (options.emitidaPorTercerosODestinatario) {
            json.EmitidaPorTercerosODestinatario = emitidaPorTerceros_list[getRandomInt(0, emitidaPorTerceros_list.length)];
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
    
    var max_dest = getRandomInt(1, 101);
    if(numDest > 0 && numDest < 101){
        max_dest = numDest;
    }
    for (var i = 0; i < max_dest; i++) {
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

    json.FacturaRectificativa.Tipo = rectificativaType_list[getRandomInt(0, rectificativaType_list.length)];
    if (options.hasOwnProperty('importeRectificacion')) {
        if (options.importeRectificacion) {
            json.FacturaRectificativa.ImporteRectificacionSustitutiva = {
                "BaseRectificada": getRandomArbitrary(0, MAX_NUMBER, 2),
                "CuotaRectificada": getRandomArbitrary(0, MAX_NUMBER, 2)
            };
            if (options.hasOwnProperty('cuotaRecargo')) {
                if (options.cuotaRecargo) {
                    json.FacturaRectificativa.ImporteRectificacionSustitutiva.CuotaRecargoRectificada = getRandomArbitrary(0, MAX_NUMBER, 2);
                }
            }
        
        }

    }
}

/**
 * 
 * @param {JSON} json - Elemento Cabecera de la factura
 * @param {JSON} options - Parametros de configuración de las facturas
 */
function facturasRectificadasSustituidas(json, options = {
    serieFactura: false, //Indica si quiero o no el campo SerieFactura de las FacturasRectificadasSustituidas
    numFacturas: -1 //Numero de Facturas Rectificadas Sustituidas a crear. Si el valor no esta en rango (1 a 100) se da uno aleatorio
}) {
    json.FacturasRectificadasSustituidas = [];
    var max = getRandomInt(1, 101);
    if (options.hasOwnProperty('numFacturas')) {
        if (options.numFacturas > 0 && options.numFacturas < 101) {
            max = options.numFacturas;
        }
    }

    for (var i = 0; i < max; i++) {
        var factRectSust = {
            "NumFactura": getRandomString(getRandomInt(0, 21)),
            "FechaExpedicionFactura": randomDate(new Date(2012, 0, 1), new Date())
        };

        if (options.hasOwnProperty('serieFactura')) {
            if (options.serieFactura) {
                factRectSust.SerieFactura = getRandomString(getRandomInt(1, 21));
            }
        }
        json.FacturasRectificadasSustituidas.push(factRectSust);
    }//End for
}


/**
 * Genera la cabecera de la factura
 * @param {JSON} json - Elemento "Cabecera" de la factura
 * @param {JSON} options - Parametros opcionales de la Cabecera de la factura
 */
function generarCabeceraFactura(json, options = {
    serieFactura: false,
    facturaSimplificada: false,
    facturaEmitidaSustitucionSimplificada: false,
    facturaRectificativa: {
        value: false, //Indica si quiero el elemento FacturaRectificativa
        importeRectificacion: false,
        cuotaRecargo: false
    },
    facturaRectificadaSustituida: {
        value: false, //Indica si quiero el elemento FacturaRectificadaSustituida
        serieFactura: false,
        numFacturas: -1
    }
}) {

    if (options.hasOwnProperty('serieFactura')) {
        if (options.serieFactura) {
            json.SerieFactura = getRandomString(getRandomInt(1, 21));
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
        if (options.facturaRectificativa.hasOwnProperty('value')) {
            if (options.facturaRectificativa.value) {
                facturaRectificativa(json, options.facturaRectificativa);
            }
        }
    }

    if (options.hasOwnProperty('facturaRectificadaSustituida')) {
        if (options.facturaRectificadaSustituida.hasOwnProperty('value')) {
            if (options.facturaRectificadaSustituida.value) {
                facturasRectificadasSustituidas(json, options.facturaRectificadaSustituida);
            }
        }
    }
}

/**
 * 
 * @param {JSON} json - Elemento DatosFactura de la factura
 * @param {JSON} options - Opciones de los detalles (Numero de detalles)
 * @returns {Number} - Importe total de los detalles de la factura
 */
function detallesDatosFactura(json, options = {
    numDetalles: -1
}) {
    var detalle_size = getRandomInt(1, 1001);
    if (options.hasOwnProperty('numDetalles')) {
        if (options.numDetalles > 0 && options.numDetalles < 1001) {
            detalle_size = options.numDetalles;
        }
    }

    json.DetallesFactura = [];

    for (var i = 0; i < detalle_size; i++) {
        var detalle = {
            "DescripcionDetalle": getRandomString(getRandomInt(1, 251)),
            "Cantidad": getRandomArbitrary(0, MAX_NUMBER, 2),
            "ImporteUnitario": getRandomArbitrary(0, MAX_NUMBER, 8),
            "ImporteTotal": getRandomArbitrary(0, MAX_NUMBER, 2)
        };

        if (getRandomInt(0, 2) == 0) {
            detalle.Descuento = getRandomArbitrary(0, 101, 2);
        }

        json.DetallesFactura.push(detalle);
    }
    var res = json.DetallesFactura.map(detalle => parseFloat(detalle.ImporteTotal)).reduce((acc, detalle) => detalle + acc);
    return res.toFixed(2);
}

/**
 * Genera el elemento DatosFactura de la factura
 * @param {JSON} json - Elemento DatosFactura de la factura
 * @param {JSON} options - Parametros de configuracion de los datos de la factura
 */
function datosFactura(json, options = {
    fechaOperacion: false,
    detallesFactura: { numDetalles: -1 },
    retencionSoportada: false,
    baseImponibleACoste: false,
    numClaves: -1
}) {

    var importe_total = 0;
    if (options.hasOwnProperty('fechaOperacion')) {
        if (options.fechaOperacion) {
            json.FechaOperacion = randomDate(new Date(2012, 0, 1), new Date());
        }
    }

    if (options.hasOwnProperty('detallesFactura')) {
        importe_total = detallesDatosFactura(json, options.detallesFactura);
    }

    json.ImporteTotalFactura = importe_total;

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

    var claves_size = getRandomInt(1, 4);
    if (options.hasOwnProperty('numClaves')) {
        if (options.numClaves > 0 && options.numClaves < 4) {
            claves_size = options.numClaves;
        }
    }

    json.Claves = [];
    for (var i = 0; i < claves_size; i++) {
        var clave = {
            "ClaveRegimenIvaOpTrascendencia": ClaveRegimenIvaOpTrascendencia_list[getRandomInt(0, ClaveRegimenIvaOpTrascendencia_list.length)]
        };
        json.Claves.push(clave);
    }
}

/**
 * 
 * @param {JSON} json - Elemento TipoDesglose de la factura
 * @param {JSON} options - Parametros de configuracion del desglose
 */
function tipoDesglose(json, options = {
    desgloseFactura: true, //TipoDesglose --> DesgloseFactura / Si es true da igual lo que valga desgloseTipoOperacion
    desgloseTipoOperacion: { prestacionServicios: false, entrega: false }, // Solo se genera si desgloseFactura
    //no esta definido o es false y ademas existe prestacionServicios o entrega y ademas es true alguno de los dos.
    desglose: {
        sujeta: {
            value: false, // Si es true, se genera la factura sujeta, aunque puede que este vacia.
            exenta: {
                value: false,// Si es true genero la factura sujeta exenta
                numDetallesExenta: 0 //Numero de deralles de la factura exenta (1 a 7)
            },
            noExenta: {
                value: false, // Si es true genero la factura NoExenta
                numDetallesNoExenta: 0, //Numero de detalles (1 a 2)
                numDetallesIVA: 0 //Numero de detalles de desglose de IVA (1 a 6)
            }
        },
        noSujeta: {
            value: false, //Si es true genero la factura NoSujeta
            numDetallesNoSujeta: 0 //Numero de detalles de la factura NoSujeta
        }
    }
}) {
    if (options.hasOwnProperty('desgloseFactura')) {
        if (options.desgloseFactura) {
            json.DesgloseFactura = {};
            json.DesgloseFactura = desgloseSujetaNoSujeta(json.DesgloseFactura, options.desglose);
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
        json.DesgloseTipoOperacion = {};
        if (options.hasOwnProperty('desgloseTipoOperacion')) {
            if (options.desgloseTipoOperacion.hasOwnProperty('prestacionServicios')) {
                if (options.desgloseTipoOperacion.prestacionServicios) {
                    desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.PrestacionServicios, options.desglose);
                }
                if (options.desgloseTipoOperacion.entrega) {
                    desgloseSujetaNoSujeta(json.DesgloseTipoOperacion.Entrega, options.desglose);
                }
            }
        }
    }
}

/**
 * Genera el contenido del elemento HuellaTBAI
 * @param {JSON} json - Elemento HuellaTBAI de la factura
 * @param {JSON} options - Parametros de configuracion
 */
function huellaTBAI(json, options = {
    encadenamiento: {
        value: false, //Si es true genero el elemento EncadenamientoFacturaAnterior
        serieFacturaAnterior: false //Si es true genero el campo SerieFacturaAnterior
    },
    entidadNIF: true, //Si es true la entidad se identifica mediante el NIF. (Si es false o no existe se identifica con el otro metodo)
    entidadIdOtro: false, // Si es true la entidad se identifica de otra forma
    numSerieDispositivo: false //Indica si quiero el campo numSerieDispositivo
}) {

    if (options.hasOwnProperty('encadenamiento')) {
        if (options.encadenamiento.hasOwnProperty('value')) {
            if (options.encadenamiento.value) {
                json.EncadenamientoFacturaAnterior = {
                    "NumFacturaAnterior": getRandomString(getRandomInt(1, 21)),
                    "FechaExpedicionFacturaAnterior": randomDate(new Date(2012, 0, 1), new Date()),
                    "SignatureValueFirmaFacturaAnterior": getRandomString(100)
                };
                if (options.encadenamiento.hasOwnProperty('serieFacturaAnterior')) {
                    if (options.encadenamiento.serieFacturaAnterior) {
                        json.EncadenamientoFacturaAnterior.SerieFacturaAnterior = getRandomString(getRandomInt(1, 21));
                    }

                }
            }
        }
    }//Fin encadenamiento


    if (options.hasOwnProperty('entidadNIF')) {
        if (options.entidadNIF) {
            json.Software.EntidadDesarrolladora = {
                "NIF": rand_dni()
            };
        } else {
            json.Software.EntidadDesarrolladora = {
                "IDOtro": {
                    "IDType": "0" + getRandomInt(2, 7),
                    "ID": getRandomString(getRandomInt(1, 21))
                }
            };
            var rand = getRandomInt(0, 2);
            if (rand == 0) {
                json.Software.EntidadDesarrolladora.IDOtro.CodigoPais = country_list[getRandomInt(0, country_list.length)];
            }
        }
    } else {
        json.Software.EntidadDesarrolladora = {
            "IDOtro": {
                "IDType": "0" + getRandomInt(2, 7),
                "ID": getRandomString(getRandomInt(1, 21))
            }
        };
        var rand = getRandomInt(0, 2);
        if (rand == 0) {
            json.Software.EntidadDesarrolladora.IDOtro.CodigoPais = country_list[getRandomInt(0, country_list.length)];
        }
    }

    if (options.hasOwnProperty('numSerieDispositivo')) {
        if (options.numSerieDispositivo) {
            json.NumSerieDispositivo = getRandomString(getRandomInt(1, 31));
        }
    }
}

module.exports = {
    generate: function generate(nif, fechaExp) {
        var json = {
            "Sujetos": {
                "Emisor": {
                    "NIF": nif,
                    "ApellidosNombreRazonSocial": getRandomString(getRandomInt(1, 120))
                }
            },
            "Factura": {
                "Cabecera": {
                    "NumFactura": getRandomInt(0, MAX_NUMBER),
                    "FechaExpedicionFactura": fechaExp,
                    "HoraExpedicionFactura": randomHour(new Date(2020, 0, 1), new Date(2020, 1, 1))
                },
                "DatosFactura": {
                    "DescripcionFactura": getRandomString(getRandomInt(1, 250))
                    //"ImporteTotalFactura": getRandomArbitrary(0, MAX_NUMBER, 2)
                },
                "TipoDesglose": {

                }
            },
            "HuellaTBAI": {
                "Software": {
                    "LicenciaTBAI": getRandomString(getRandomInt(1, 21)),
                    "Nombre": getRandomString(getRandomInt(1, 121)),
                    "Version": getRandomString(getRandomInt(1, 21))
                }
            }
        };

        generarSujetos(json.Sujetos, sujetos_config);

        /* FACTURA */

        generarCabeceraFactura(json.Factura.Cabecera, cabecera_factura_config);

        datosFactura(json.Factura.DatosFactura, datos_factura_config);

        tipoDesglose(json.Factura.TipoDesglose, tipo_desglose_config);

        /* HUELLA TBAI*/

        huellaTBAI(json.HuellaTBAI, huellaTaBAI_config);

        return json;
    }
};

const rectificativaType_list = ["S", "I"];
const sinNo_list = ["S", "N"];
const emitidaPorTerceros_list = ["N", "T", "D"];
const noSujeta_list = ["OT", "RL"];
const ClaveRegimenIvaOpTrascendencia_list = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "51", "52", "53"];
const country_list = ["AD", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AT", "AU", "AW", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GG", "GH", "GI", "GL", "GM", "GN", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"];
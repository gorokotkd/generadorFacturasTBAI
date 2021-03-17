'use strict'

const convert = require('xml-js');




function desgloseFacturaSujeta_NoSujeta(factura, data){
    var size = 0;
    if(data.hasOwnProperty('Sujeta')){
        factura.Sujeta = {};
        if(data.Sujeta.hasOwnProperty('Exenta')){
            factura.Sujeta.Exenta = {};
            size = Object.keys(data.Sujeta.Exenta).length;
            factura.Sujeta.Exenta.DetalleExenta = [];
            var detalleExenta = {};
            for(var i = 0; i < size; i++){
                detalleExenta = {
                    "CausaExencion" : {
                        "_text" : data.Sujeta.Exenta[i].CausaExencion
                    },
                    "BaseImponible" : {
                        "_text" : data.Sujeta.Exenta[i].BaseImponible
                    }
                };
                factura.Sujeta.Exenta.DetalleExenta.push(detalleExenta);
            }//End for

        }//End If Exenta

        if(data.Sujeta.hasOwnProperty('NoExenta')){
            factura.Sujeta.NoExenta = {};
            size = Object.keys(data.Sujeta.NoExenta).length;
            factura.Sujeta.NoExenta.DetalleNoExenta = [];
            var detalleNoExenta = {};
            for(var i = 0; i < size; i++){
                detalleNoExenta = {
                    "TipoNoExenta" : {
                        "_text" : data.Sujeta.NoExenta[i].TipoNoExenta
                    },
                    "DesgloseIVA" : {}
                };

                var desglose_size = Object.keys(data.Sujeta.NoExenta[i].DesgloseIVA).length;
                detalleNoExenta.DesgloseIVA.DetalleIVA = [];
                var detalleIVA = {};
                for(var j = 0; j < desglose_size; j++){
                    detalleIVA = {
                        "BaseImponible" : {
                            "_text" : data.Sujeta.NoExenta[i].DesgloseIVA[j].BaseImponible
                        }
                    };

                    var desgloseIVA = data.Sujeta.NoExenta[i].DesgloseIVA[j];
                    if(desgloseIVA.hasOwnProperty('TipoImpositivo')){
                        detalleIVA.TipoImpositivo = {
                            "_text" : desgloseIVA.TipoImpositivo
                        };
                    }

                    if(desgloseIVA.hasOwnProperty('CuotaImpuesto')){
                        detalleIVA.CuotaImpuesto = {
                            "_text" : desgloseIVA.CuotaImpuesto
                        };
                    }

                    if(desgloseIVA.hasOwnProperty('TipoRecargoEquivalencia')){
                        detalleIVA.TipoRecargoEquivalencia = {
                            "_text" : desgloseIVA.TipoRecargoEquivalencia
                        };
                    }

                    if(desgloseIVA.hasOwnProperty('CuotaRecargoEquivalencia')){
                        detalleIVA.CuotaRecargoEquivalencia = {
                            "_text" : desgloseIVA.CuotaRecargoEquivalencia
                        };
                    }

                    if(desgloseIVA.hasOwnProperty('OperacionEnRecargoDeEquivalenciaORegimenSimplificado')){
                        detalleIVA.OperacionEnRecargoDeEquivalenciaORegimenSimplificado = {
                            "_text" : desgloseIVA.OperacionEnRecargoDeEquivalenciaORegimenSimplificado
                        };
                    }

                    detalleNoExenta.DesgloseIVA.DetalleIVA.push(detalleIVA);
                }//End for
                factura.Sujeta.NoExenta.DetalleNoExenta.push(detalleNoExenta);
            }//End for
        }//End If NoExenta

    }//End IF Sujeta

    if(data.hasOwnProperty('NoSujeta')){
        factura.NoSujeta = {};
        size = Object.keys(data.NoSujeta).length;
        factura.NoSujeta.DetalleNoSujeta = [];
        var detalleNoSujeta = {};

        for(var i = 0; i < size; i++){
            detalleNoSujeta = {
                "Causa" : {
                    "_text" : data.NoSujeta[i].Causa
                },
                "Importe" : {
                    "_text" : data.NoSujeta[i].Importe
                }
            };
            factura.NoSujeta.DetalleNoSujeta.push(detalleNoSujeta);
        }//End for

    }//End IF NoSujeta

    return factura;
}



/**
 * @param data JSON que contiene los datos a introducir en el XML
 * @return Factura en XML con los campos deseados
 * 
 */
module.exports = {
    generate: function generarFactura(data){
        var factura = {//Factura que contiene los campos obligatorios
            "_declaration" : {
                "_attributes" : {
                    "version": "1.0",
                    "encoding": "utf-8"
                }
            },
            "T:TicketBai": {
                "_attributes":{
                    "xmlns:ds" : "http://www.w3.org/2000/09/xmldsig#",
                    "xmlns:T" : "urn:ticketbai:emision",
                    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "xsi:schemaLocation": "http://www.w3.org/2001/XMLSchema ticketBai_schema.xsd"

                },
                "Cabecera": {
                    "IDVersionTBAI" : {
                        "_text": "1.2"
                    }
                },
                "Sujetos" : {
                    "Emisor": {
                        "NIF": {
                            "_text": data.Sujetos.Emisor.NIF
                        },
                        "ApellidosNombreRazonSocial":{
                            "_text": data.Sujetos.Emisor.ApellidosNombreRazonSocial
                        }
                    }
                },
                "Factura" : {
                    "CabeceraFactura": {
                        "NumFactura" : {
                            "_text" : data.Factura.Cabecera.NumFactura
                        },
                        "FechaExpedicionFactura" : {
                            "_text" : data.Factura.Cabecera.FechaExpedicionFactura
                        },
                        "HoraExpedicionFactura" : {
                            "_text" : data.Factura.Cabecera.HoraExpedicionFactura
                        }
                    },
                    "DatosFactura":{
                        "DescripcionFactura" : {
                            "_text" : data.Factura.DatosFactura.DescripcionFactura
                        },
                        "DetallesFactura" : {
    
                        },
                        "ImporteTotalFactura" : {
                            "_text" : data.Factura.DatosFactura.ImporteTotalFactura
                        }
                    },
                    "TipoDesglose": {
    
                    }
    
                },
                "HuellaTBAI" : {
                    "Software" : {
                        "LicenciaTBAI" : {
                            "_text" : data.HuellaTBAI.Software.LicenciaTBAI
                        },
                        "EntidadDesarrolladora" : {
    
                        },
                        "Nombre" : {
                            "_text" : data.HuellaTBAI.Software.Nombre
                        },
                        "Version" : {
                            "_text" : data.HuellaTBAI.Software.Version
                        }
                    }
                }
            }
        };


        /* Agrego los destinatarios */
        if(data.Sujetos.hasOwnProperty('Destinatarios')){
            var destinatario = {};
            var size = Object.keys(data.Sujetos.Destinatarios).length;
            factura['T:TicketBai'].Sujetos.Destinatarios = {};
            factura['T:TicketBai'].Sujetos.Destinatarios.IDDestinatario = [];
            for(var i = 0; i < size ; i++ ){
                if(data.Sujetos.Destinatarios[i].hasOwnProperty('NIF')){
                    destinatario = {
                        "NIF" : {
                            "_text" : data.Sujetos.Destinatarios[i].NIF
                        }


                    };
                }else{
                    destinatario = {
                        "IDOtro" : {
                            "IDType" : {
                                "_text" : data.Sujetos.Destinatarios[i].IDOtro.IDType
                            },
                            "ID" : {
                                "_text" : data.Sujetos.Destinatarios[i].IDOtro.ID
                            }
                        }                    
                    };


                    if(data.Sujetos.Destinatarios[i].IDOtro.hasOwnProperty('CodigoPais')){
                        destinatario.IDOtro.CodigoPais = {
                            "_text" : data.Sujetos.Destinatarios[i].IDOtro.CodigoPais
                        };
                    }
                }//End if

                destinatario.ApellidosNombreRazonSocial = {
                    "_text" : data.Sujetos.Destinatarios[i].ApellidosNombreRazonSocial
                };

                destinatario.CodigoPostal = {
                    "_text" : data.Sujetos.Destinatarios[i].CodigoPostal
                };

                destinatario.Direccion = {
                    "_text" : data.Sujetos.Destinatarios[i].Direccion
                };

                
                factura['T:TicketBai'].Sujetos.Destinatarios.IDDestinatario.push(destinatario);
            }//Fin for


        }//Fin Destinatarios

        if(data.Sujetos.hasOwnProperty('VariosDestinatarios')){
            factura['T:TicketBai'].Sujetos.VariosDestinatarios = {
                "_text" : data.Sujetos.VariosDestinatarios
            };
        }

        if(data.Sujetos.hasOwnProperty('EmitidaPorTercerosODestinatario')){
            factura['T:TicketBai'].Sujetos.EmitidaPorTercerosODestinatario = {
                "_text" : data.Sujetos.EmitidaPorTercerosODestinatario
            };
        }

        if(data.Factura.Cabecera.hasOwnProperty('SerieFactura')){
            factura['T:TicketBai'].Factura.CabeceraFactura.SerieFactura = {
                "_text" : data.Factura.Cabecera.SerieFactura
            };
        }

        if(data.Factura.Cabecera.hasOwnProperty('FacturaSimplificada')){
            factura['T:TicketBai'].Factura.CabeceraFactura.FacturaSimplificada = {
                "_text" : data.Factura.Cabecera.FacturaSimplificada
            };
        }

        if(data.Factura.Cabecera.hasOwnProperty('FacturaEmitidaSustitucionSimplificada')){
            factura['T:TicketBai'].Factura.CabeceraFactura.FacturaEmitidaSustitucionSimplificada = {
                "_text" : data.Factura.Cabecera.FacturaEmitidaSustitucionSimplificada
            };
        }

        if(data.Factura.Cabecera.hasOwnProperty('FacturaRectificativa')){
            factura['T:TicketBai'].Factura.CabeceraFactura.FacturaRectificativa = {
                "Codigo" : {
                    "_text" : data.Factura.Cabecera.FacturaRectificativa.Codigo
                },
                "Tipo" : {
                    "_text" : data.Factura.Cabecera.FacturaRectificativa.Tipo
                }
            };
            if(data.Factura.Cabecera.FacturaRectificativa.hasOwnProperty('ImporteRectificacionSustitutiva')){
                factura['T:TicketBai'].Factura.CabeceraFactura.FacturaRectificativa.ImporteRectificacionSustitutiva = {
                    "BaseRectificada" : {
                        "_text" : data.Factura.Cabecera.FacturaRectificativa.ImporteRectificacionSustitutiva.BaseRectificada
                    },
                    "CuotaRectificada" : {
                        "_text" : data.Factura.Cabecera.FacturaRectificativa.ImporteRectificacionSustitutiva.CuotaRectificada
                    }
                };

                if(data.Factura.Cabecera.FacturaRectificativa.ImporteRectificacionSustitutiva.hasOwnProperty('CuotaRecargoRectificada')){
                    factura['T:TicketBai'].Factura.CabeceraFactura.FacturaRectificativa.ImporteRectificacionSustitutiva.CuotaRecargoRectificada = {
                        "_text" : data.Factura.Cabecera.FacturaRectificativa.ImporteRectificacionSustitutiva.CuotaRecargoRectificada
                    };
                }
            }
        }//Fin factura Rectificativa

        if (data.Factura.Cabecera.hasOwnProperty('FacturasRectificadasSustituidas')){
            factura['T:TicketBai'].Factura.CabeceraFactura.FacturasRectificadasSustituidas = {};
            factura['T:TicketBai'].Factura.CabeceraFactura.FacturasRectificadasSustituidas.IDFacturaRectificadaSustituida = [];

            var size = Object.keys(data.Factura.Cabecera.FacturasRectificadasSustituidas).length;
            var factRectSust = {};
            for(var i = 0; i < size; i++){
                if(data.Factura.Cabecera.FacturasRectificadasSustituidas[i].hasOwnProperty('SerieFactura')){
                    factRectSust.SerieFactura = {
                        "_text" : data.Factura.Cabecera.FacturasRectificadasSustituidas[i].SerieFactura
                    };
                }

                factRectSust.NumFactura = {
                    "_text" : data.Factura.Cabecera.FacturasRectificadasSustituidas[i].NumFactura
                };

                factRectSust.FechaExpedicionFactura = {
                    "_text" : data.Factura.Cabecera.FacturasRectificadasSustituidas[i].FechaExpedicionFactura
                };

                
                factura['T:TicketBai'].Factura.CabeceraFactura.FacturasRectificadasSustituidas.IDFacturaRectificadaSustituida.push(factRectSust);
            }//Fin for

        }// Fin FacturasRectificadasSustituidas


        if(data.Factura.DatosFactura.hasOwnProperty('FechaOperacion')){
            factura['T:TicketBai'].Factura.DatosFactura.FechaOperacion = {
                "_text" : data.Factura.DatosFactura.FechaOperacion
            };
        }

        /* Detalles de Factura*/
        var size = Object.keys(data.Factura.DatosFactura.DetallesFactura).length;
        factura['T:TicketBai'].Factura.DatosFactura.DetallesFactura.IDDetalleFactura = [];
        var detalle = {};
        for(var i = 0; i < size; i++){
            detalle = {
                "DescripcionDetalle" : {
                    "_text" : data.Factura.DatosFactura.DetallesFactura[i].DescripcionDetalle
                },
                "Cantidad" : {
                    "_text" : data.Factura.DatosFactura.DetallesFactura[i].Cantidad
                },
                "ImporteUnitario" : {
                    "_text" : data.Factura.DatosFactura.DetallesFactura[i].ImporteUnitario
                },
                "ImporteTotal" : {
                    "_text" : data.Factura.DatosFactura.DetallesFactura[i].ImporteTotal
                }
            };

            if(data.Factura.DatosFactura.DetallesFactura[i].hasOwnProperty('Descuento')){
                detalle.Descuento = {
                    "_text" : data.Factura.DatosFactura.DetallesFactura[i].Descuento
                };
            }

            factura['T:TicketBai'].Factura.DatosFactura.DetallesFactura.IDDetalleFactura.push(detalle);
        }//Fin for

        if(data.Factura.DatosFactura.hasOwnProperty('RetencionSoportada')){
            factura['T:TicketBai'].Factura.DatosFactura.RetencionSoportada = {
                "_text" : data.Factura.DatosFactura.RetencionSoportada
            };
        }

        if(data.Factura.DatosFactura.hasOwnProperty('BaseImponibleACoste')){
            factura['T:TicketBai'].Factura.DatosFactura.BaseImponibleACoste = {
                "_text" : data.Factura.DatosFactura.BaseImponibleACoste
            };
        }

        factura['T:TicketBai'].Factura.DatosFactura.Claves = {};
        size = Object.keys(data.Factura.DatosFactura.Claves).length;
        factura['T:TicketBai'].Factura.DatosFactura.Claves.IDClave = [];
        var clave = {};
        for(var i = 0; i < size; i++){
            clave = {
                "ClaveRegimenIvaOpTrascendencia" : {
                    "_text" : data.Factura.DatosFactura.Claves[i].ClaveRegimenIvaOpTrascendencia
                }
            };

            factura['T:TicketBai'].Factura.DatosFactura.Claves.IDClave.push(clave);
        }

        

        /* TIPO DESGLOSE */

        if(data.Factura.TipoDesglose.hasOwnProperty('DesgloseFactura')){
            factura['T:TicketBai'].Factura.TipoDesglose.DesgloseFactura = {};
            var param_data = data.Factura.TipoDesglose.DesgloseFactura;
            var param_factura = factura['T:TicketBai'].Factura.TipoDesglose.DesgloseFactura;
            factura['T:TicketBai'].Factura.TipoDesglose.DesgloseFactura = desgloseFacturaSujeta_NoSujeta(param_factura, param_data);
        }else{//DesgloseTipoOperacion
            factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion = {};
            if(data.Factura.TipoDesglose.DesgloseTipoOperacion.hasOwnProperty('PrestacionServicios')){
                factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.PrestacionServicios = {};
                var param_data = data.Factura.TipoDesglose.DesgloseTipoOperacion.PrestacionServicios;
                var param_factura = factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.PrestacionServicios;
                
                factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.PrestacionServicios = desgloseFacturaSujeta_NoSujeta(param_factura, param_data);
            }

            if(data.Factura.TipoDesglose.DesgloseTipoOperacion.hasOwnProperty('Entrega')){
                factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.Entrega = {};
                var param_data = data.Factura.TipoDesglose.DesgloseTipoOperacion.Entrega;
                var param_factura = factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.Entrega;
                factura['T:TicketBai'].Factura.TipoDesglose.DesgloseTipoOperacion.Entrega = desgloseFacturaSujeta_NoSujeta(param_factura, param_data);
            }
        }//Fin IF


        /* HUELLA TBAI*/

        if(data.HuellaTBAI.hasOwnProperty('NumSerieDispositivo')){
            factura['T:TicketBai'].HuellaTBAI.NumSerieDispositivo = {
                "_text" : data.HuellaTBAI.NumSerieDispositivo
            };
        }

        if(data.HuellaTBAI.hasOwnProperty('EncadenamientoFacturaAnterior')){
            factura['T:TicketBai'].HuellaTBAI.EncadenamientoFacturaAnterior = {
                "NumFacturaAnterior" : {
                    "_text" : data.HuellaTBAI.EncadenamientoFacturaAnterior.NumFacturaAnterior
                },
                "FechaExpedicionFacturaAnterior" : {
                    "_text" : data.HuellaTBAI.EncadenamientoFacturaAnterior.FechaExpedicionFacturaAnterior
                },
                "SignatureValueFirmaFacturaAnterior" : {
                    "_text" : data.HuellaTBAI.EncadenamientoFacturaAnterior.SignatureValueFirmaFacturaAnterior
                }
            };

            if(data.HuellaTBAI.EncadenamientoFacturaAnterior.hasOwnProperty('SerieFacturaAnterior')){
                factura['T:TicketBai'].HuellaTBAI.EncadenamientoFacturaAnterior.SerieFacturaAnterior = {
                    "_text" : data.HuellaTBAI.EncadenamientoFacturaAnterior.SerieFacturaAnterior
                };
            }
        }

        

        if(data.HuellaTBAI.Software.EntidadDesarrolladora.hasOwnProperty('NIF')){
            factura['T:TicketBai'].HuellaTBAI.Software.EntidadDesarrolladora.NIF = {
                "_text" : data.HuellaTBAI.Software.EntidadDesarrolladora.NIF
            };
        }else{
            factura['T:TicketBai'].HuellaTBAI.Software.EntidadDesarrolladora.IDOtro = {
                "IDType" : {
                    "_text" : data.HuellaTBAI.Software.EntidadDesarrolladora.IDOtro.IDType
                },
                "ID" : {
                    "_text" : data.HuellaTBAI.Software.EntidadDesarrolladora.IDOtro.ID
                }
            };

            if(data.HuellaTBAI.Software.EntidadDesarrolladora.IDOtro.hasOwnProperty('CodigoPais')){
                factura['T:TicketBai'].HuellaTBAI.Software.EntidadDesarrolladora.IDOtro.CodigoPais = {
                    "_text" : data.HuellaTBAI.Software.EntidadDesarrolladora.IDOtro.CodigoPais
                }
            }
        }


        var options = {compact: true, ignoreComment: true, spaces: 4};
        var result = convert.json2xml(factura, options);
        return result;
    }
}
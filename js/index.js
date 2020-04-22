const $ = require('jquery');
const colors = require('colors');
const macaddress = require('macaddress');
const ipc = require('electron').ipcRenderer;
const Cry = require('cryptr');
const log = require('electron-log');
const request = require('request');
const os = require('os');
const fs = require('fs');
const base64 = require('base-64');
const hash = require('sha256');
const exec = require('child_process').exec;
const mkdirp = require('mkdirp');
const dateTime = require('node-datetime');
const { ipcRenderer } = require('electron');
const rde = base64.decode('MGJsaXZpYXQzIw==');
// const {autoUpdater} = require('electron-updater');
const cry = new Cry(rde);

//---------- VARIABLES MAIN ----------------//
const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const ConfigFilejs = ConfigPATH + '/conect.conf';

let empresaID = 'null';
let sucursalID = 'null';
let configStatus = 'FAIL';

// Fingerprint scanner
var fpd = null;
var device = null;
var enrollment = false;
var registro = null;
var reg_user;

const dt = dateTime.create();
let hrReg = dt.format('H:M');

var horaREG = null;

var deviceDisconected = true;

var urlL='';
const readline = require('readline');

try {
    const readInterface = readline.createInterface({
        input: fs.createReadStream(ConfigFilejs),
        output: process.stdout,
        console: false
    });    
    try{				
        readInterface.on('line', function (line) {
            let [confP, confS] = line.split(';');
            let [x, IPP] = confP.split('=');
            let [z, IPS] = confS.split('=');
            urlP = IPP; 
            urlL = IPS;
        });
    }catch{
        urlL = null;
        urlP = null;
    }

} catch (e) {
    log.error(String(e).red);
    log.info('[-] ERROR al obtener la configuracio,, la aplicaicon se reiniciará');
    log.silly('');
    urlL = null;
    urlP = null;
}
// -------------------------- ON READY ------------------------------------
$(document).ready(async function () {
    deviceconectesRegistro = false;
    // ------ Desarrollo -------   
    setLOG()
    hideElements();
    getConfig()
    configStatus = await asyncConfig();
    log.debug(configStatus);
    log.debug('');
    log.debug('Empresa: '.blue + empresaID.yellow + ' Sucursal: '.blue + sucursalID.yellow)
    log.debug('');
    log.debug('------------------------------------------------: Main Window '.magenta + '--> '.yellow + hrReg);

    try {
        fpd = new FingerprintSdkDevice();
        log.info('Fingerprint script loaded');
        setTimeout('fdpInfo()', 1000);
    } catch (e) {
        log.error(String(e).red)
    }

    //---- PRUEBAS -----

});

function fdpInfo() {
    var allReaders = fpd.getInfo();
    allReaders.then(function (sucessObj) {
        log.info(String(sucessObj).blue);
        device = sucessObj
        onDeviceInfo(device)
        log.info();
    }, function (error) {
        log.info(String(error).red);
    });
}

function onDeviceInfo(id) {
    var myDeviceVal = fpd.getDeviceInfoWithID(id);
    log.info('id: --' + id)
    myDeviceVal.then(function (sucessObj) {
        log.info('oooooooooooooooo')
        log.info(sucessObj)
        var deviceId = sucessObj.DeviceID;
        var uidTyp = deviceUidType[sucessObj.eUidType];
        var modality = deviceModality[sucessObj.eDeviceModality];
        var deviceTech = deviceTechn[sucessObj.eDeviceTech];
        log.info('DEVICE INFO')
        "Id : " + deviceId
            +
            "<br> Uid Type : " + uidTyp +
            "<br> Device Tech : " + deviceTech +
            "<br> Device Modality : " + modality;

        log.info(retutnVal);

    }, function (error) {
        log.info(error.message);
    });
}

function fpdStart() {
    fpd.startCapture();
    status_captura = true;
    log.debug('Proceso de captura --> INICIADO');
}

function onStop() {
    fpd.stopCapture();
    status_captura = false;
    log.debug('Proceso de captura --> DETENIDO'.red);
    deviceconectesRegistro = false;
}

function setLOG() {
    try {
        const logFile = ConfigPATH + '/app.log'
        const dt = dateTime.create()
        const hrReg = dt.format('m/d/y H:M')
        const specs = '############# LOG #############\n' +
            '\nFecha de creación --> ' + hrReg.magenta + '\n' + '\n***** Espesificaciones del Ususario *****'.green +
            '\nHostname: '.yellow + String(os.hostname) +
            '\nUsername: '.yellow + String(os.userInfo().username) +
            '\nHomeDir: '.yellow + String(os.userInfo().homedir) +
            '\nPlatform: '.yellow + String(os.platform) +
            '\nRelease: '.yellow + String(os.release) +
            '\nArch: '.yellow + String(os.arch) +
            '\n******************************************'.green + '\n'

        if (!fs.existsSync(logFile)) {
            fs.writeFile(logFile, specs, function (err) {
                if (err) log.error(String(err).red)
                log.debug('Archivo de log creado: ' + logFile.yellow)
            })
            log.transports.file.file = logFile
        } else {
            log.debug('Redirigiendo log' + ' ---> '.magenta + logFile.yellow)
            log.transports.file.file = logFile
        }
    } catch (e) {
        log.error(String(e).red)
    }
}

//------------------------ Config ------------------------------------------
function getConfig() {
    try {
        fs.readFile(ConfigFile, 'utf8', (err, data) => {
            const decryptedString = cry.decrypt(data)
            let [idE, idS] = decryptedString.split(',')
            let [a, idEmpresa] = idE.split(':')
            let [b, idSucursal] = idS.split(':')
            empresaID = idEmpresa
            sucursalID = idSucursal
            configStatus = 'OK'
        })

    } catch (e) {
        log.error('Error en la configuracion')
    }
}

function asyncConfig() {
    spinnersAction("spinner-info")
    setTimeout('spinnersAction("spinner-success")', 500)
    return new Promise(respuesta => {
        setTimeout(() => {
            if (configStatus == 'OK') {
                respuesta('Status Config: ' + configStatus.green);
                spinnersAction("null")
            } else {
                respuesta('Status Config: ' + configStatus.red);
                spinnersAction("spinner-danger")
                messageStatus('fail', '¡Error!', 'No se encontró configuracion de la aplicación.')
            }
        }, 600);
    });
}


// -------------------------- Fingerprint Stuff ------------------------------------


// -------------------------- Metodos POST ------------------------------------
function requestPOST(metodo, parametros, timeout, timeout_r = 2000) {
    const xmlBody_I = '\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
					 \n\t<s:Body>\
					 \n\t\t<' + metodo + ' xmlns="http://tempuri.org/">'
    const xmlBody_F = '\n\t\t</' + metodo + '>\
					 \n\t</s:Body>\
					 \n</s:Envelope>'
    let xmlAdded = ''
    let retun_ = ''

    for (i in parametros) {
        xmlAdded += ('\n\t\t\t<' +
            parametros[i].param +
            '>' + parametros[i].value +
            '</' +
            parametros[i].param +
            '>')
    }

    const xml = xmlBody_I + xmlAdded + xmlBody_F
    log.debug('xml'.cyan, xml.yellow)
    log.debug('metodo'.cyan, metodo)
    log.debug('url'.cyan, urlL)


    log.debug('Usando Ajax');
    
    $.ajax({
        url: urlL,
        type: 'POST',
        headers: {
            "content-type": "text/xml",
            "SOAPAction": ("http://tempuri.org/ISolicitud/" + metodo),
        },
        timeout: timeout,
        data: xml,
        dataType: 'text',
        success: function(data, status, xhr){
            log.debug('--------------------------------------------------------------------');
            log.debug(status);
            log.debug(data);         
            const etiquetaResult_I = '<' + metodo + 'Result' + '>'
            const etiquetaResult_F = '</' + metodo + 'Result' + '>'
            let [x, tmp] = data.split(etiquetaResult_I)
            let [resp, y] = tmp.split(etiquetaResult_F)
            retun_ = resp
            log.debug(retun_);
            log.debug('--------------------------------------------------------------------');
        },
        error: function(jqXhr, textSat, errorMes){
            log.debug('--------------------------------------------------------------------');
            log.debug(status);
            log.debug(errorMes);
        },
        complete: function(data){
            log.debug('Fin de la peticion')
            log.devug('Fin AJAX')
        }
    });
    
        
    return new Promise(respuesta => {
        setTimeout(() => {
            log.debug('Respuesta: ' + retun_)
            respuesta(retun_)
        }, timeout_r);
    });
    // request({
    //     url: urlL,
    //     method: "POST",
    //     headers: {
    //         "content-type": "text/xml",
    //         "SOAPAction": ("http://tempuri.org/ISolicitud/" + metodo),
    //     },
    //     body: xml,
    //     timeout: 2000
    // }, function (error, response, body) {
    //     if (error) log.debug(String(error).red);
    //     log.debug(body.yellow);
    //     log.debug('STATUS CODE DEL SERVIDOR:'.yellow, String(response.statusCode).yellow);
    //     if (response.statusCode == 200) {
    //         const etiquetaResult_I = '<' + metodo + 'Result' + '>'
    //         const etiquetaResult_F = '</' + metodo + 'Result' + '>'
    //         let [x, tmp] = body.split(etiquetaResult_I)
    //         let [resp, y] = tmp.split(etiquetaResult_F)
    //         retun_ = resp
    //     }else{
    //         retun_ = null
    //     }
    // })
}

async function validarHuella(taco) {
    if (String(taco) != 'undefined') {
        const timeout = 900
        const metodo = 'ValidaHuellaWsq'
        const parametros = [{
                param: 'empresa',
                value: empresaID
            },
            {
                param: 'IdSucursal',
                value: sucursalID
            },
            {
                param: 'huella',
                value: taco
            }
        ]
        messageStatus('info', 'Procesando registro ', ' espere un momento...');
        spinnersAction("spinner-warning")

        const respuesta = await requestPOST(metodo, parametros, timeout, 1500)
        log.debug('Respuesta obtenida', respuesta);
        try {
            if (respuesta == null) {
                messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                spinnersAction("spinner-danger")
                log.debug('\nError al procesar y validar la huella'.red)
                setTimeout('location.reload()', 1600); // Relaod Page
            } else {
                let [usuario, validacion] = respuesta.split(',')
                let [a, usr] = usuario.split(':')
                let [b, val] = validacion.split(':')
                reg_user = usr;
                log.debug('Respuesta del servidor: '.green + ' User -> ' + usr + ' Validacion --> ' + val)
                log.debug('Tipo de registro: ' + registro);
                if (String(val) == "True") {
                    spinnersAction("spinner-success")
                    switch (parseInt(registro)) {
                        case 1:
                            registraAccion();
                            break;
                        case 2:
                            registraAccion();
                            break;
                        case 3:
                            registraAccion();
                            break;
                        case 4:
                            registraAccion();
                            break;
                    }
                } else {
                    messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                    spinnersAction("spinner-danger")
                    log.debug('\nError al procesar y validar la huella'.red)
                    setTimeout('location.reload()', 1600); // Relaod Page
                }
            }
            
            if (respuesta == 'Error en los datos ') {
                log.debug("\n\nError al convertir Base64 a WSQ en el servidor\n\n".red);
            }
        } catch (e) {
            log.error("Error al leer respuesta del servidor" + String(e).red)
            messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
            spinnersAction("spinner-danger")
            log.debug('\nError al procesar y validar la huella'.red)
            setTimeout('location.reload()', 1600); // Relaod Page
        }
    }
}

async function registraAccion() {
    log.debug("****************** REGISTRO ******************".yellow);
    const timeout = 500
    var hora = "00:00";
    var metodo = 'ConsultaEstadosHTML'
    var parametros = [{
            param: 'tipoBusq',
            value: '1'
        },
        {
            param: 'idsucursal',
            value: sucursalID
        }
    ]

    var respuestaE = await requestPOST(metodo, parametros, timeout, 1000)
    var bool_hora_internet = false;

    try {
        if (respuesta == 'Error del proceso') {
            messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
            spinnersAction("spinner-danger")
            log.debug('\nError al procesar y validar la huella'.red)
            setTimeout('location.reload()', 1600); // Relaod Page
        } else {
            log.debug('OBTENIENDO HORA'.magenta)
            try {
                hora = await getHora(respuestaE);
                if(hora != null) bool_hora_internet= true;
                log.debug(hora.magenta);
            } catch (e) {
                log.debug('Error al Obtener la hora desde la web'.red)
                log.debug(String(e).red)
                // messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                // spinnersAction("spinner-danger")
                // setTimeout('location.reload()', 1600); // Relaod Page
            }
        
            var metodo = 'Registro'
            if (bool_hora_internet == true) {
                var parametros = [{
                        param: 'idusuario',
                        value: reg_user
                    },
                    {
                        param: 'tipoReg',
                        value: registro
                    },
                    {
                        param: 'hrReg',
                        value: hora
                    }
                ]
                var respuesta = await requestPOST(metodo, parametros, timeout, 500)
                try {
                    if (respuesta == 'true') {
                        messageStatus('success', 'Registro exitoso 😄', 'Hora: ' + hora);
                        spinnersAction("spinner-success")
                        log.debug('Registro exitoso 😄, Hora: ' + hora.green)
                        setTimeout('location.reload()', 2500); // Relaod Page
                    } else {
                        messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                        spinnersAction("spinner-danger")
                        log.debug('Error al procesar y validar la huella'.red)
                        setTimeout('location.reload()', 2500); // Relaod Page
                    }

                } catch (e) {
                    log.error("Error al leer respuesta del servidor" + String(e).red)
                    messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                    spinnersAction("spinner-danger")
                    setTimeout('location.reload()', 1600); // Relaod Page
                }
            } else {
                try{
                hora = await getHora(respuesta);
                }catch{log.debug('Ultimo intento de obtener hora por internet AGOTADO');}
                if (bool_hora_internet == false) {
                    if(hora != null){
                        const dt = dateTime.create();
                        hora = dt.format('H:M');
                        var parametros = [{
                                param: 'idusuario',
                                value: reg_user
                            },
                            {
                                param: 'tipoReg',
                                value: registro
                            },
                            {
                                param: 'hrReg',
                                value: hora
                            }
                        ]
                        var respuesta = await requestPOST(metodo, parametros, timeout, 500)
                        try {
                            if (respuesta == 'Error del proceso') {
                                messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                                spinnersAction("spinner-danger")
                                log.debug('\nError al procesar y validar la huella'.red)
                                setTimeout('location.reload()', 1600); // Relaod Page
                            } else {
                                if (respuesta == 'true') {
                                    messageStatus('success', 'Registro exitoso 😄', 'Hora: ' + hora);
                                    spinnersAction("spinner-success")
                                    log.debug('\nRegistro exitoso 😄, Hora: ' + hora.green)
                                    setTimeout('location.reload()', 1600); // Relaod Page
                                } else {
                                    messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                                    spinnersAction("spinner-danger")
                                    log.debug('\nError al procesar y validar la huella'.red)
                                    setTimeout('location.reload()', 1600); // Relaod Page
                                }
                            }
                        } catch (e) {
                            log.error("Error al leer respuesta del servidor" + String(e).red)
                        }
                    }
                } else {
                    messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
                    spinnersAction("spinner-danger")
                    log.debug('\nError al procesar y validar la huella'.red)
                    setTimeout('location.reload()', 1600); // Relaod Page
                    log.error('Error al registrar'.red);
                }
            }

        }
    } catch (e) {
        log.error("Error al leer respuesta del servidor" + String(e).red)
    }
}


// -------------------------- Get Hora ------------------------------------
function getHora(respuesta) {
    const dt = dateTime.create();
    hrReg = dt.format('H:M');

    const re = /([0-2]{1}[0-9]{1}\:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1})/
    var hrR = null;
    const urlHora = 'https://www.worldtimeserver.com' + respuesta;
    // const command = 'curl --insecure -v --max-time 3000 https://www.worldtimeserver.com' + respuesta;
    log.debug(urlHora.magenta);

    try{
        log.debug('Buscando hora desde la web');
        $.get(urlHora, function( data ) {
            text = data;
            log.debug('Proceso 1 OK');
            var horaObtenida = re.exec(text);
            log.debug('Proceso 2 OK');
            var horaRT = horaObtenida[0];
            log.debug('Proceso 3 OK');
            let [hr, min, seg] = horaRT.split(':');
            hrR = hr + ":" + min;
            log.debug('Proceso 4 OK');
            log.debug('Hora obtenida desde la web ----> ' + horaRT + ' Hora Local: ' + hrReg);
        });
    }catch(e){
        log.error(String(e).red)
    }

    return new Promise(respuesta => {
        setTimeout(() => {
            respuesta(hrR)
        }, 2200);
    });
}

// ------------------------------Animated stuff---------------------------------------
var deviceconectesRegistro;
function buttonClick(tipo) {
    if (deviceDisconected == false){
        deviceconectesRegistro = true;
        log.debug('\n--------------------------------------------------------------------------------------------------------------------');

        const dt = dateTime.create();
        hrReg = dt.format('H:M');

        log.debug('Boton Registro: ' + tipo);
        registro = tipo;
        log.debug('Tipo de registro: ' + String(registro).yellow + ' HORA LOCAL ->' + hrReg.blue);
        
        fpdStart() // Detenccion de huellas activado

        messageStatus('info', 'Obteniendo Huella ', ' Coloque su dedo sobre el escaner 👆');
        spinnersAction("spinner-info")
    }else{
        messageStatus('warning', '- Escaner no detectado -', ' Intente conectandolo y dando clic en "Reiniciar la pagina"');
        log.debug('Device not conected, no se procede al registro');
    }
    // //ControlAccesoHuella(tipo)

    // $('#' + tipo).prop("disabled", true);
    // $('#' + tipo).html(
    //     `<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>Registrando...`
    // );

    // setTimeout('spinnersAction("spinner-info")', 1000);
    // setTimeout('spinnersAction("spinner-warning")', 2000);
    // setTimeout('spinnersAction("spinner-success")', 3000);
    // setTimeout('spinnersAction("spinner-danger")', 4000);
    // setTimeout('spinnersAction(null)', 5000);

    // const message = "'success', '¡Registrado!'"
    // setTimeout("messageStatus('success','¡Registrado!', '" + hrReg + "')", 6000); // Estatus para progreso
    // setTimeout("messageStatus('fail', '¡No se registró!', 'Intente de nuevo.')", 7000); // Estatus para progreso
    // setTimeout('location.reload()', 8000); // Relaod Page
}

function hideElements() {
    log.debug('Ocultando Elementos');
    $('#message-info').hide()
    $('#message-fail').hide()
    $('#message-success').hide()
    $('#message-warning').hide()
    spinnersAction(null)
}

function spinnersAction(id) {
    try {
        if (id == null) {
            $('#spinner-info').hide()
            $('#spinner-success').hide()
            $('#spinner-warning').hide()
            $('#spinner-danger').hide()
        } else {
            $('#spinner-info').hide()
            $('#spinner-success').hide()
            $('#spinner-warning').hide()
            $('#spinner-danger').hide()
            $('#' + id).show()
        }
    } catch (e) {
        log.error(e)
    }
}


// ----------------------------- ALERTS --------------------------------------
function messageStatus(type, strong, normal) {
    if (String(type) == 'success') {
        $('#message-warning').hide()
        $('#message-fail').hide()
        $('#message-info').hide()
        $('#message-danger').hide()
        $('#message-success').html("<strong>" + strong + "</strong> " + normal)
        $('#message-success').show()
        hrReg = '00:00'
    }
    if (String(type) == 'fail') {
        $('#message-warning').hide()
        $('#message-success').hide()
        $('#message-info').hide()
        $('#message-danger').hide()
        $('#message-fail').html('<i class="fas fa-ban"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-fail').show()
        hrReg = '00:00'
    }
    if (String(type) == 'info') {
        $('#message-warning').hide()
        $('#message-success').hide()
        $('#message-fail').hide()
        $('#message-danger').hide()
        $('#message-info').html('<i class="fas fa-fingerprint"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-info').show()
        hrReg = '00:00'
    }
    if (String(type) == 'danger') {
        $('#message-warning').hide()
        $('#message-success').hide()
        $('#message-fail').hide()
        $('#message-info').hide()
        $('#message-fail').html('<i class="fas fa-fingerprint"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-fail').show()
        hrReg = '00:00'
    }
    if (String(type) == 'warning') {
        $('#message-warning').hide()
        $('#message-success').hide()
        $('#message-fail').hide()
        $('#message-info').hide()
        $('#message-warning').html('<i class="fas fa-fingerprint"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-warning').show()
        hrReg = '00:00'
    }
    if (String(type) == 'null') {
        $('#message-success').hide()
        $('#message-fail').hide()
        $('#message-info').hide()
        $('#message-warning').hide()
        hrReg = '00:00'
    }
}


// status del sensor
sensorstatcount = 0
function statusSensor(stat){
    log.debug('Estatus del Sensor:'.magenta, stat);

    // CODIGOS DE ESTATUS
    // 1 - Proceso iniciado
    // 2 - Sensor Conectado
    // 3 - Sensor Desconectado
    // 4 - Error en la comunicacion
    
    switch(stat){
        case 1:
            log.debug('FingerPrint Device Iniciado...');
            break;
        case 2:
            deviceDisconected = false;
            if(deviceconectesRegistro == false){
                log.debug("Scan your finger");
                messageStatus('info', 'Escaner Conectado ', ' puede registrarse ahora ☝ ');
                setTimeout("spinnersAction('null')", 1000)
            }else{
                log.debug("Scan your finger");
            }
            break;
        case 3:
            log.debug("Device disconnected");
            messageStatus('danger', 'Escaner no detectado ', ' verifique que el escaner de huellas esté conectado 🚨  ');
            spinnersAction("spinner-danger")
            deviceDisconected = true;
            break;
        case 4:
            log.debug("Communinication Failed");
            // if(sensorstatcount >= 4){
            //     sensorstatcount=0;
            //     ipc.send('statusSensor', 'No se detecta ningun sensor conectado, favor de conectar uno.');
            // }
            // sensorstatcount += 1;
            break;
        default:
            bresk;

    }
}

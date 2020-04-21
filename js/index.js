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
   
    // ------ Desarrollo -------   
    setLOG()
    hideElements();
    getConfig()
    configStatus = await asyncConfig();
    log.debug(configStatus);
    log.debug('');
    log.debug('Empresa: '.blue + empresaID.yellow + ' Sucursal: '.blue + sucursalID.yellow)
    log.debug('');
    log.debug('Main Window '.magenta + '--> '.yellow + hrReg);

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
    log.debug('Proceso de captura --> DETENIDO'.red)
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
function requestPOST(metodo, parametros, timeout, timeout_r = 1000) {
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
    // log.debug(xml.yellow)
    log.debug('metodo'.cyan, metodo)
    log.debug('url'.cyan, urlL)

    request({
        url: urlL,
        method: "POST",
        headers: {
            "content-type": "text/xml",
            "SOAPAction": ("http://tempuri.org/ISolicitud/" + metodo),
        },
        body: xml,
        timeout: 3000
    }, function (error, response, body) {
        // log.debug(error)
        log.debug(body.yellow)
        // log.debug(response)
        if (response.statusCode == 200) {
            const etiquetaResult_I = '<' + metodo + 'Result' + '>'
            const etiquetaResult_F = '</' + metodo + 'Result' + '>'
            let [x, tmp] = body.split(etiquetaResult_I)
            let [resp, y] = tmp.split(etiquetaResult_F)
            retun_ = resp
        }
    })

    return new Promise(respuesta => {
        setTimeout(() => {
            log.debug('Respuesta: ' + retun_)
            respuesta(retun_)
        }, 1500);
    });
}

async function validarHuella(taco) {
    if (String(taco) != 'undefined') {
        const timeout = 2000
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
        const respuesta = await requestPOST(metodo, parametros, timeout, 2000)

        try {
            if (respuesta == 'Error del proceso') {
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
        } catch (e) {
            log.error("Error al leer respuesta del servidor" + String(e).red)
        }
    }
}

async function registraAccion() {
    log.debug("****************** REGISTRO ******************".yellow);
    const timeout = 2000
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

    var respuesta = await requestPOST(metodo, parametros, timeout, 1000)
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
                hora = await getHora(respuesta);
                if(hora != null) bool_hora_internet= true;
                log.debug(hora.magenta);
            } catch (e) {
                log.debug('Error al Obtener la hora desde la web'.red)
                log.debug(String(e).red)
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
                var respuesta = await requestPOST(metodo, parametros, 800, 1000)
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
                hora = await getHora(respuesta);
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
                        var respuesta = await requestPOST(metodo, parametros, timeout, 1000)
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
        $.get(urlHora, function( data ) {
            text = data;
            var horaObtenida = re.exec(text);
            var horaRT = horaObtenida[0];
            let [hr, min, seg] = horaRT.split(':');
            hrR = hr + ":" + min;
            log.debug('Hora obtenida desde la web ----> ' + horaRT + ' Hora Local: ' + hrReg);
        });
    }catch(e){
        log.error(String(e).red)
    }

    return new Promise(respuesta => {
        setTimeout(() => {
            if(hrR == null){
                $.get(urlHora, function( data ) {
                    text = data;
                    var horaObtenida = re.exec(text)
                    var horaRT = horaObtenida[0]
                    // log.debug(horaRT.yellow);
                    let [hr, min, seg] = horaRT.split(':')
                    hrR = hr + ":" + min
                    log.debug('Hora obtenida desde la web ----> ' + hora + ' Hora Local: ' + hrReg)
                });
            }
            respuesta(hrR)
        }, 2000);
    });
}

// ------------------------------Animated stuff---------------------------------------
function buttonClick(tipo) {
    log.debug('\n--------------------------------------------------------------------------------------------------------------------');

    const dt = dateTime.create();
    hrReg = dt.format('H:M');

    log.debug('Boton Registro: ' + tipo);
    registro = tipo;
    log.debug('Tipo de registro: ' + String(registro).yellow + ' HORA LOCAL ->' + hrReg.blue);
    
    fpdStart() // Detenccion de huellas activado

    messageStatus('info', 'Obteniendo Huella ', ' Coloque su dedo sobre el escaner 👆');
    spinnersAction("spinner-info")
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
    $('#message-info').hide()
    $('#message-fail').hide()
    $('#message-success').hide()
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
        $('#message-fail').hide()
        $('#message-info').hide()
        $('#message-success').html("<strong>" + strong + "</strong> " + normal)
        $('#message-success').show()
        hrReg = '00:00'
    }
    if (String(type) == 'fail') {
        $('#message-success').hide()
        $('#message-info').hide()
        $('#message-fail').html('<i class="fas fa-ban"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-fail').show()
        hrReg = '00:00'
    }
    if (String(type) == 'info') {
        $('#message-success').hide()
        $('#message-fail').hide()
        $('#message-info').html('<i class="fas fa-fingerprint"></i> <strong>  ' + strong + '</strong> ' + normal)
        $('#message-info').show()
        hrReg = '00:00'
    }
}


// status del sensor
sensorstatcount = 0
firstdisconnected = false
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
            log.debug("Scan your finger");
            break;
        case 3:
            log.debug("Device disconnected");
            messageStatus('danger', 'Escaner no detectado ', ' Valide que su escaner de huellas está conectado 🚨');
            spinnersAction("spinner-info")
        
            if (firstdisconnected == false){
                log.debug("Device disconnected - 1");
                firstdisconnected = true;
            }else{
                // ipc.send('statusSensor', "El Sensor se ha desconectado");
            }
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

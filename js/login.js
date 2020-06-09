const $ = require('jquery');
const os = require('os');
const log = require('electron-log');
const colors = require('colors');
const hash = require('sha256');
const fs = require('fs');
const Cry = require('cryptr');
const base64 = require('base-64');
const ipc = require('electron').ipcRenderer;
const readline = require('readline');

const rde = base64.decode('MGJsaXZpYXQzIw==');
const cry = new Cry(rde);
var ifaces = os.networkInterfaces();
var iplocal;
var mac;


let empresaID;
let sucursalID;
let usuarioID = null;
let rolID = null;

const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const UserPATH = ConfigPATH + '/user'
const ConfigFilejs = ConfigPATH + '/conect.conf';
const logFile = ConfigPATH + '/app.log'

var ipServ = ''

log.info('')
log.info('LogFile:'.magenta, logFile)
log.transports.file.file = logFile


var fpdH = null;
var device = null;
var enrollment = false;
var registro = null;


try {
    fs.readFile(ConfigFile, 'utf8', (err, data) => {
        const decryptedString = cry.decrypt(data)
        let [idE, idS] = decryptedString.split(',')
        let [a, idEmpresa] = idE.split(':')
        let [b, idSucursal] = idS.split(':')
        empresaID = idEmpresa
        sucursalID = idSucursal
        log.debug('************ LOGIN ***************'.red);
        log.debug('Empresa:'.cyan, String(empresaID).yellow, 'Sucursal:'.cyan, String(sucursalID).yellow);
    });

} catch (e) {
    log.error('Error en la configuracion')
}


try {
    const readInterface = readline.createInterface({
        input: fs.createReadStream(ConfigFilejs),
        output: process.stdout,
        console: false
    });
    try {
        readInterface.on('line', function (line) {
            let [confP, confS] = line.split(';');
            let [x, IPP] = confP.split('=');
            let [z, IPS] = confS.split('=');
            urlP = IPP;
            ipServ = IPS;
        });
    } catch {
        ipServ = null;
        urlP = null;
    }

} catch (e) {
    log.error(String(e).red);
    log.info('[-] ERROR al obtener la configuracio,, la aplicaicon se reiniciará');
    log.silly('');
    ipServ = null;
    urlP = null;
}

function requestPOST(metodo, parametros, timeout, timeout_r = 2000) {
    return new Promise((resolve, reject) => {
        try {
            log.debug('');
            log.debug('-------------------------------------------------------------------------------------'.magenta);
            const xmlBody_I = '\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
                                \n\t<s:Body>\
                                \n\t\t<' + metodo + ' xmlns="http://tempuri.org/">';
            const xmlBody_F = '\n\t\t</' + metodo + '>\
                                \n\t</s:Body>\
                                \n</s:Envelope>';
            let xmlAdded = '';
            let retun_ = '';

            for (i in parametros) {
                xmlAdded += ('\n\t\t\t<' +
                    parametros[i].param +
                    '>' + parametros[i].value +
                    '</' +
                    parametros[i].param +
                    '>');
            }

            const xml = xmlBody_I + xmlAdded + xmlBody_F;

            log.debug('Datos del post'.blue);
            log.debug('xml'.cyan, xml);
            log.debug('metodo'.cyan, metodo);
            log.debug('url'.cyan, ipServ);

            $.ajax({
                url: ipServ,
                type: 'POST',
                headers: {
                    "content-type": "text/xml",
                    "SOAPAction": ("http://tempuri.org/ISolicitud/" + metodo),
                },
                timeout: timeout,
                data: xml,
                dataType: 'text',
                success: function (data, status, xhr) {
                    log.debug(' ');
                    log.debug('------------------ Leyendo respuesta del servidor ----------------');
                    log.debug('Estatus de la respuesta'.cyan, status.green);
                    log.debug('Data - xml'.cyan, data);
                    // log.debug(xhr);
                    const etiquetaResult_I = '<' + metodo + 'Result' + '>'
                    const etiquetaResult_F = '</' + metodo + 'Result' + '>'
                    let [x, tmp] = data.split(etiquetaResult_I)
                    let [resp, y] = tmp.split(etiquetaResult_F)
                    retun_ = resp
                    log.debug("Respuesta del metodo:".cyan, retun_.yellow);
                },
                error: function (jqXhr, textSat, errorMes) {
                    log.debug('Estatus de la peticion', errorMes.red);
                    reject(errorMes);
                },
                complete: function (data) {
                    log.debug('-------------------------------------------------------------------------------------'.magenta);
                    log.debug('');
                    resolve(retun_);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function login(type) {
    switch (type) {
        case 'huella':
            
            log.debug('Login con huella');

            $('#divuser').hide();
            $('#divpassd').hide();
            $('#loginbtn').hide();

            $('#loginhuellabtn').html('<i class="fas fa-fingerprint fa-1x fa-spin"></i> <strong> Escanee</strong> su huella');

            fpdStart() // Detenccion de huellas activado
            
            break;

        default:
            Object.keys(ifaces).forEach(function (ifname) {
                var alias = 0;

                ifaces[ifname].forEach(function (iface) {
                    if ('IPv4' !== iface.family || iface.internal !== false) {
                        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                        return;
                    }

                    log.debug('-------------------------------------------------------------'.red)
                    if (alias >= 1) {
                        // this single interface has multiple ipv4 addresses
                        iplocal = iface.address;
                        mac = iface.mac;
                        log.debug(ifname + ':' + alias, iface.address);
                        log.debug(ifname + ':' + alias, iface.mac);
                    } else {
                        // this interface has only one ipv4 adress
                        iplocal = iface.address;
                        mac = iface.mac;
                        log.debug(ifname, iface.address);
                        log.debug(ifname, iface.mac);
                    }
                    ++alias;
                });
            });

            const user = $('#inputUser').val();
            const pwd = hash($('#inputPassword').val());

            log.debug('Btn Click');

            if (String(user) != '') {
                if (String(pwd) != 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
                    $("#inputUser").css("border-color", "");
                    $("#inputPassword").css("border-color", "");
                    log.debug('\n**************** Validando Credenciales ****************\n'.magenta);
                    const timeout = 3000
                    const metodo = 'Credenciales'
                    const parametros = [{
                            param: 'usuario',
                            value: user
                        },
                        {
                            param: 'password',
                            value: pwd
                        },
                        {
                            param: 'IP',
                            value: iplocal
                        }
                    ]
                    const respuesta = await requestPOST(metodo, parametros, timeout)

                    try {
                        let [usuario, rol] = respuesta.split(' ')
                        let [x, u] = usuario.split(':')
                        let [y, r] = rol.split(':')
                        usuarioID = u;
                        rolID = r;
                    } catch {
                        $("#inputUser").css("border-color", "red");
                        $("#inputPassword").css("border-color", "red");
                        $('#labelMessage').text('Usuario y/o contraseñas no validas')
                        $('#labelMessage').css('color', 'red')
                        log.error('Usuario y/o contraseñas no validas'.red);
                        setTimeout("$('#labelMessage').text('')", 4000);
                    }

                    log.debug('Datos Obtenidos en la respuesta: ' + empresaID + ', ' + sucursalID);

                    if (usuarioID != null && rolID != null) {
                        log.debug('Respuesta del servidor: -----> CREDENCIALS --->  [VALIDA]' + '\n');
                        try {
                            const timeout = 3000
                            const metodo = 'ObtenerPermisos'
                            const parametros = [{
                                param: 'idusr',
                                value: usuarioID
                            }]
                            const respuesta = await requestPOST(metodo, parametros, timeout)

                            let [registroUsr, reportes, consultaUsr, admin] = respuesta.split(',')
                            let [a, respuestaRegUsr] = registroUsr.split(':')
                            let [b, respuestaRep] = reportes.split(':')
                            let [c, respuestaConUsr] = consultaUsr.split(':')
                            let [d, respuestaAdmin] = admin.split(':')

                            log.debug('Respuesta del servidor: ' + '[OK]'.green + ' :::'.yellow + ' Usuario: ' + usuarioID + ':::'.yellow)

                            fs.readFile(ConfigFile, 'utf8', (err, data) => {
                                if (err) log.error('No existe archivo de configuración')
                                const decry = cry.decrypt(data)
                                let [idE, idS] = decry.split(',')
                                let [a, empresaID] = idE.split(':')
                                let [b, sucursalID] = idS.split(':')
                                log.debug('Creando configuracion para el usuario' + ' :::'.yellow + ' Usuario: ' + usuarioID + ':::'.yellow)
                                var configToRegist = 'idE:' + empresaID + ',idS:' + sucursalID + ',RegUsr:' + respuestaRegUsr + ',Rep:' + respuestaRep + ',ConUsr:' + respuestaConUsr + ',Admin:' + respuestaAdmin + ','
                                const encrytmp = cry.encrypt(configToRegist)
                                try {
                                    log.debug('Creando configuración para el usuario del Login' + ':-:-:'.red + ' PATH: ' + String(UserPATH).yellow)
                                    fs.writeFile(UserPATH, encrytmp, function (err) {
                                        if (err) log.error(String(err).red)
                                        log.info('--- STATUS --- [OK]'.green)
                                    })
                                    setTimeout("ipc.sendSync('entry-accepted', 'ping')", 500)
                                } catch (err) {
                                    log.error(err)
                                }
                            })

                            log.debug('FIN');

                        } catch (err) {
                            $('#labelMessage').text('Error en obtener permisos')
                            $('#labelMessage').css('color', 'red')
                            log.error(err)
                        }
                    }
                } else {
                    $("#inputUser").css("border-color", "");
                    $("#inputPassword").css("border-color", "red");
                }
            } else {
                $("#inputUser").css("border-color", "red");
                $("#inputPassword").css("border-color", "red");
            }

            break;
    }
}

var deviceconectesRegistro = false;
$(document).ready(async function () {
    try {
        fpdH = new FingerprintSdkDevice();
        log.info('--- Fingerprint script loaded ---');
        setTimeout(fdpInfo, 500);
    } catch (e) {
        log.error(String(e).red)
    }
});


async function loginConHuella(huella){    
    const timeout = 3000;
    const metodo = 'ValidaHuellaPriv';
    const parametros = [{
            param: 'idEmpresa',
            value: empresaID
        },
        {
            param: 'idSucursal',
            value: sucursalID
        },
        {
            param: 'huella',
            value: huella
        }
    ];

    const respuesta = await requestPOST(metodo, parametros, timeout);

    try {
        let [usuario, rol, id, operacion] = respuesta.split(',');
        let [w, u] = usuario.split(':');
        let [x, r] = rol.split(':');
        let [y, i] = id.split(':');
        let [z, o] = operacion.split(':');

        let usuarioPriv = u;
        let rolPriv = r;
        let idUsuarioPriv = i;
        let operacionPriv = o;

        log.debug(respuesta.cyan);

        $('#lblnombre').show();
        $('#lblnombre').text(usuarioPriv + " - " + rolPriv);
        
        const timeoutOP = 3000
        const metodoOP = 'ObtenerPermisos'
        const parametrosOP = [{
            param: 'idusr',
            value: idUsuarioPriv
        }]
        const respuestaOP = await requestPOST(metodoOP, parametrosOP, timeoutOP)

        let [registroUsr, reportes, consultaUsr, admin] = respuestaOP.split(',')
        let [a, respuestaRegUsr] = registroUsr.split(':')
        let [b, respuestaRep] = reportes.split(':')
        let [c, respuestaConUsr] = consultaUsr.split(':')
        let [d, respuestaAdmin] = admin.split(':')

        log.debug('Respuesta del servidor: ' + '[OK]' + ' :::'.yellow + ' Usuario: ' + idUsuarioPriv + ':::'.yellow)

        fs.readFile(ConfigFile, 'utf8', (err, data) => {
            if (err) log.error('No existe archivo de configuración')
            const decry = cry.decrypt(data)
            let [idE, idS] = decry.split(',')
            let [a, empresaID] = idE.split(':')
            let [b, sucursalID] = idS.split(':')
            log.debug('Creando configuracion para el usuario' + ' :::'.yellow + ' Usuario: ' + idUsuarioPriv + ':::'.yellow)
            var configToRegist = 'idE:' + empresaID + ',idS:' + sucursalID + ',RegUsr:' + respuestaRegUsr + ',Rep:' + respuestaRep + ',ConUsr:' + respuestaConUsr + ',Admin:' + respuestaAdmin + ','
            const encrytmp = cry.encrypt(configToRegist)
            try {
                log.debug('Creando configuración para el usuario del Login' + ':-:-:'.red + ' PATH: ' + String(UserPATH).yellow)
                fs.writeFile(UserPATH, encrytmp, function (err) {
                    if (err) log.error(String(err).red)
                    log.info('--- STATUS --- [OK]'.green)
                })
                setTimeout("ipc.sendSync('entry-accepted', 'ping')", 500)
            } catch (err) {
                log.error(err)
            }
        })

        log.debug('FIN');

        // setTimeout(() => {
        //     ipc.sendSync('login', 'acept', usuarioPriv, respuesta);
        // }, 2500);

    } catch (err) {
        log.error(err.red);
    }
}


function fdpInfo() {
    var allReaders = fpdH.getInfo();
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
    var myDeviceVal = fpdH.getDeviceInfoWithID(id);
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
    fpdH.startCapture();
    status_captura = true;
    loginHuella = true;
    log.debug('Proceso de captura --> INICIADO');
}

function onStop() {
    fpdH.stopCapture();
    status_captura = false;
    log.debug('Proceso de captura --> DETENIDO'.red);
    deviceconectesRegistro = false;
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
                //messageStatus('info', 'Escaner Conectado ', ' puede registrarse ahora ☝ ');
                // setTimeout("spinnersAction('null')", 1000)
            }else{
                log.debug("Scan your finger");
            }
            break;
        case 3:
            log.debug("Device disconnected");
            //messageStatus('danger', 'Escaner no detectado ', ' verifique que el escaner de huellas esté conectado 🚨  ');
            // spinnersAction("spinner-danger")
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
            break;

    }
}

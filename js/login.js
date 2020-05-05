const $ = require('jquery');
const os = require('os');
const log = require('electron-log');
const request = require('request');
const colors = require('colors');
const hash = require('sha256');
const fs = require('fs');
const Cry = require('cryptr');
const base64 = require('base-64');
const ipc = require('electron').ipcRenderer;

const rde = base64.decode('MGJsaXZpYXQzIw==');
const cry = new Cry(rde);
var ifaces = os.networkInterfaces();
var iplocal;
var mac;

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
        log.debug(ifname, iface.address);
        log.debug(ifname, iface.mac);
        }
        ++alias;
    });
});



let empresaID;
let sucursalID;
let usuarioID = null;
let rolID = null;

const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const UserPATH = ConfigPATH + '/user'
const ConfigFilejs = ConfigPATH + '/conect.conf';
var urlL=''
const logFile = ConfigPATH + '/app.log'
log.info('')
log.info('LogFile:'.magenta,logFile)
log.transports.file.file = logFile
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

log.debug('************ LOGIN ***************'.red);

function requestPOST(metodo, parametros, timeout) {
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
    log.debug(xml.yellow)

    request({
        url: urlL,
        method: "POST",
        headers: {
            "content-type": "text/xml",
            "SOAPAction": ("http://tempuri.org/ISolicitud/" + metodo),
        },
        body: xml,
        timeout: timeout
    }, function (error, response, body) {
        log.debug(body)
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
        }, 1000);
    });
}

async function login() {
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

            try{
                let [usuario, rol] = respuesta.split(' ')
                let [x, u] = usuario.split(':')
                let [y, r] = rol.split(':')
                usuarioID = u;
                rolID = r;
            }catch{
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

                    log.debug('Respuesta del servidor: ' + '[OK]' + ' :::'.yellow + ' Usuario: ' + usuarioID + ':::'.yellow)

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
        }else{
            $("#inputUser").css("border-color", "");
            $("#inputPassword").css("border-color", "red");
       }
    }else{
        $("#inputUser").css("border-color", "red");
        $("#inputPassword").css("border-color", "red");
    }
}

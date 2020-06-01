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

const nombrepattern = "[0-9]{1,9}$"
const jw = 'MGJsaXZpYXQzIw=='

const readline = require('readline');


const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const logFile = ConfigPATH + '/app.log'
const ConfigFilejs = ConfigPATH + '/conect.conf';


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

$(document).ready(function () {
    log.debug('Redirigiendo log'.cyan + ' ---> '.magenta + logFile.yellow)
    log.transports.file.file = logFile
})

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
}


async function registrar() {
    
    var id_empresa = '3'
    var id_sucursal = $("#idSucursal").val();

    var configToRegist = 'idE:3,idS:' + id_sucursal

    log.debug('Configuracion a registrar: ' + configToRegist);

    registrarConfig(configToRegist, id_empresa, id_sucursal, 1);


    const timeout = 1500
    const metodo = 'RegistraMAC'
    const parametros = [{
            param: 'idempresa',
            value: id_empresa
        },
        {
            param: 'sucursal',
            value: id_sucursal
        },
        {
            param: 'mac',
            value: macaddress
        }
    ]

    const respuesta = await requestPOST(metodo, parametros, timeout, 2000);


}
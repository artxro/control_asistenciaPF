const colors = require('colors')
const $ = require('jquery')
const macaddress = require('macaddress')
const ipc = require('electron').ipcRenderer
const Cry = require('cryptr')
const log = require('electron-log')
const request = require('request')
const os = require('os')
const fs = require('fs')
const base64 = require('base-64')
const hash = require('sha256')
const exec = require('child_process').exec

const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const userPATH = ConfigPATH + '/user';
const ConfigFilejs = ConfigPATH + '/conect.conf'

const rde = base64.decode('MGJsaXZpYXQzIw==');
const cry = new Cry(rde);
const mkdirp = require('mkdirp');


//   Variables 
var passwdValid = false;

// saber que tipo de usuario se registrará
var userRol = null;
var usertype = false;

// Fingerprint scanner
var fpd = null;
var device = null;
var huellas_wsq = {"1":{"Huella":"null"},"2":{"Huella":"null"},"3":{"Huella":"null"},"4":{"Huella":"null"}}
var status_huella = false;
var	enrollment = false;

var empresaID;
var sucursalID;

var huella;
var macAddress;

var usernamevalido = false;

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
$(document).ready(async function () {
	log.info('******************* Empleados **********************'.magenta);
	ObtenerPermisos();
	get_macAddress();
	hideElements();

	$("#backbtn").click(function(){
		alert("The botton was clicked.");
	});
	$("#registrarbtn").click(function(){
		RegistrarUsuario();
	});
	$("#btnHuella").click(function(){
		fpdStart();
	});

	$("select.rol-empleado").change(function () {
		userRol = $(this).children("option:selected").val();
		if (userRol == 1 || userRol == 6 || userRol == 5) {
			usertype = true;
			$('#div-usuario').show();
			$('#div-password').show();
		} else {
			usertype = false;
			$('#inputUsuario').val("");
			$('#passwd').val("");
			$('#passwd2').val("");
			
			$('#div-usuario').hide();
			$('#div-password').hide();
		}
	});

	$(".toggle-password").click(function() {
		$(this).toggleClass("fa-eye fa-eye-slash");
		var input = $($(this).attr("toggle"));
		if (input.attr("type") == "password") {
		  input.attr("type", "text");
		} else {
		  input.attr("type", "password");
		}
	});

    try{
		fpd = new FingerprintSdkDevice();
		if(enrollment == false) enrollment = true;
        log.info('Fingerprint script loaded');  
        setTimeout('fdpInfo()', 2000);
    }catch(e){
        log.error(String(e).red)
    }

})

// fingerprint funtions
function fdpInfo(){
    var allReaders = fpd.getInfo();    
    allReaders.then(function (sucessObj) {
        log.info(String(sucessObj).blue);
        device = sucessObj
        onDeviceInfo(device)
        log.info();
    }, function (error){
        log.info(String(error).red);
    });
}
function onDeviceInfo(id){
    var myDeviceVal = fpd.getDeviceInfoWithID(id);
    log.info('id: --' + id )
    myDeviceVal.then(function (sucessObj) {
        log.info('oooooooooooooooo')
        log.info(sucessObj)
            var deviceId = sucessObj.DeviceID;
            var uidTyp = deviceUidType[sucessObj.eUidType];
            var modality = deviceModality[sucessObj.eDeviceModality];
            var deviceTech = deviceTechn[sucessObj.eDeviceTech];
            log.info('DEVICE INFO')
                 "Id : " +  deviceId
                +"<br> Uid Type : "+ uidTyp
                +"<br> Device Tech : " +  deviceTech
                +"<br> Device Modality : " +  modality;

            log.info(retutnVal);

        }, function (error){
            log.info(error.message);
        });
}
function fpdStart(){
    fpd.startCapture();
	enrollment = true; //Para ek registro de usuarios
	log.debug('FPD Started... Esperando al usuario');
	$("#btnHuella").html('<i class="fas fa-fingerprint fa-2x fa-spin"></i>');
	$('#message-info').html("Coloque<strong> 4 veces </strong>el dedo sobre el sensor de huellas 👆")
	$('#message-info').show();
}
function onStop(){
    fpd.stopCapture();
    status_captura = false;
    log.debug('Proceso de captura --> DETENIDO'.red)
}


// Hide Elements 
function hideElements(){
	try{
		// messages 
        $('#message-fail').hide();
		$('#message-fail-huella').hide();
		$('#message-info').hide();

		// Elemento de usuario y contraseñas
		$('#div-usuario').hide();
		$('#div-password').hide();

		// Horario
		// $('#horario').hide();

		// Spinners
		$('#spinners').hide();
		$('#spinner-info').hide();
		$('#spinner-success').hide();
		$('#spinner-warning').hide();
		$('#spinner-danger').hide();
	}catch(e){
		log.error(e);
	}
}

// Request POST Template
function requestPOST(metodo, parametros, timeout, timeout_r=1000, debug=true) {
    const xmlBody_I = '\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
					 \n\t<s:Body>\
					 \n\t\t<' + metodo + ' xmlns="http://tempuri.org/">'
    const xmlBody_F = '\n\t\t</' + metodo + '>\
					 \n\t</s:Body>\
					 \n</s:Envelope>'
    let xmlAdded = ''
    let retun_ = null

    for (i in parametros) {
        xmlAdded += ('\n\t\t\t<' +
            parametros[i].param +
            '>' + parametros[i].value +
            '</' +
            parametros[i].param +
            '>')
    }

	const xml = xmlBody_I + xmlAdded + xmlBody_F
	if(debug == true) log.debug(xml.yellow)

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
        if(debug == true) log.debug(body)
        if(response.statusCode == 200){
            const etiquetaResult_I = '<' + metodo + 'Result' + '>'
            const etiquetaResult_F = '</' + metodo + 'Result' + '>'
            let [x, tmp] = body.split(etiquetaResult_I)
            let [resp, y] = tmp.split(etiquetaResult_F)
			retun_ = resp
        }
    })

    return new Promise(respuesta => {
        setTimeout(() => {
            // if(debug == true) log.debug('Respuesta: ' + retun_)
            respuesta(retun_)
        }, timeout_r);
    });
}


// Registro de usuarios
async function getElementstoReg(parametros_) {
	try{
		log.debug('Obteniedo elementos para el registro'.blue);
		let boolreturn = [false,false, false]  // booleano [datos, huella, username]
		const dic_params = {1 : "idempresa", 2 : "idSucursal", 3 : "mac", 4 : "idDedo", 5 : "huella", 6 : "aPAT", 
							7 : "aMAT", 8 : "nombre", 9 : "jsonString", 10 : "usuario", 11 : "password", 12 : "rol"} 
		
		userRol = $("option:selected").val();
		const reg_nombre 	= $('#inputNombre').val();
		const reg_apellidoP = $('#inputAPat').val();
		const reg_apellidoM = $('#inputAMat').val();
	
		const reg_userNickname = $('#inputUsuario').val();
		const reg_passwd = hash($('#passwd').val());
		const reg_passwd2 = hash($('#passwd2').val());
	
		const reg_iddedo = 1;
		const reg_horario_json = await getHorario();
		
		const patterrn_nombre = "[a-zA-Z ]{3,30}";
		const patterrn_apellido = "[a-zA-Z ]{3,30}";
		const patterrn_user = "[a-zA-Z ]{3,30}";
		const patterrn_password = "[a-zA-Z0-9]{8,30}";
	
		const bool_valnombre =  reg_nombre.match(patterrn_nombre) ? true : false;
		const bool_valapellidoPat =  reg_apellidoP.match(patterrn_apellido) ? true : false;
		const bool_valapellidoMat =  reg_apellidoM.match(patterrn_apellido) ? true : false;
	
		const bool_user =  reg_userNickname.match(patterrn_user) ? true : false;
		const bool_password = $('#passwd').val().match(patterrn_password) ? true : false;
		const bool_password2 =  $('#passwd2').val().match(patterrn_password) ? true : false;
	
		parametros_[0].value = empresaID;
		parametros_[1].value = sucursalID;
		parametros_[2].value = macAddress;
		parametros_[3].value = reg_iddedo;
		parametros_[8].value = reg_horario_json;
		parametros_[11].value = userRol;
	
		var camposEmpty = '';
		if(usertype == false){
			log.debug('Usuario Normal');
			if(bool_valnombre == false && bool_valapellidoPat == false  && bool_valapellidoMat == true){
				log.debug('Todos los campos incompletos')
				$('#message-fail').html('<i class="fas fa-ban"></i> <strong> * </strong> Debe llenar todos los campos del formulario');
				$('#message-fail').show();
				$("#inputNombre").css("border-color", "red");
				$("#inputAPat").css("border-color", "red");
				$("#inputAMat").css("border-color", "red");
				parametros_ = null;
			}else{
				log.debug('Campos incompletos detenctando');
				if (bool_valnombre == false) { 
					camposEmpty += ', Nombre';
					$("#inputNombre").css("border-color", "red");
				}else{
					$("#inputNombre").css("border-color", "");
					parametros_[7].value = reg_nombre;
				}
	
				if(bool_valapellidoPat == false){
					camposEmpty += ', Apellido Paterno';
					$("#inputAPat").css("border-color", "red");
				}else{
					$("#inputAPat").css("border-color", "");
					parametros_[5].value = reg_apellidoP;
				}
	
				if(bool_valapellidoMat == false){
					camposEmpty += ', Apellido Materno';
					$("#inputAMat").css("border-color", "red");
				}else{
					$("#inputAMat").css("border-color", "");
					parametros_[6].value = reg_apellidoM;
				}
	
				if(camposEmpty != ''){
					$('#message-fail').html('<i class="fas fa-ban"></i> <strong> * </strong> Debe llenar los siguientes campos <strong>' + camposEmpty + ' </strong>');			
					$('#message-fail').show();
					parametros_ = null;
					$("#passwd").val("");
					$("#passwd2").val("");
				}else{
					$('#message-fail').hide();
					boolreturn[0] = true;
				}

				// if(bool_user == false){
				// 	camposEmpty += ', Usuario';
				// 	$("#inputUsuario").css("border-color", "red");
				// }else{
				// 	$("#inputUsuario").css("border-color", "");
				// 	parametros_[9].value = reg_apellidoP;
				// }
			}
	
		}else{
			log.debug('Usuario Priv');
			if(bool_valnombre == false && bool_valapellidoPat == false  && bool_valapellidoMat == false && bool_user == false && bool_password == false){
				
				log.debug('Todos los campos incompletos')
				
				$('#message-fail').html('<i class="fas fa-ban"></i> <strong> * </strong> Debe llenar todos los campos del formulario');
				$('#message-fail').show();
	
				$("#inputNombre").css("border-color", "red");
				$("#inputAPat").css("border-color", "red");
				$("#inputAMat").css("border-color", "red");
	
				$("#inputUsuario").css("border-color", "red");
				$("#passwd").css("border-color", "red");
				$("#passwd2").css("border-color", "red");

				parametros_ = null;
	
			}else{
				log.debug('Usuario Priv ---:'.yellow);

				if (bool_valnombre == false) {
					camposEmpty += ', Nombre';
					$("#inputNombre").css("border-color", "red");
				}else{
					$("#inputNombre").css("border-color", "");
					parametros_[7].value = reg_nombre;
				}
	
				if(bool_valapellidoPat == false){
					camposEmpty += ', Apellido Paterno';
					$("#inputAPat").css("border-color", "red");
				}else{
					$("#inputAPat").css("border-color", "");
					parametros_[5].value = reg_apellidoP;
				}
	
				if(bool_valapellidoMat == false){
					camposEmpty += ', Apellido Materno';
					$("#inputAMat").css("border-color", "red");
				}else{
					$("#inputAMat").css("border-color", "");
					parametros_[6].value = reg_apellidoM;
				}
	
				if(bool_user == false){
					camposEmpty += ', Usuario';
					$("#inputUsuario").css("border-color", "red");
				}else{
					$("#inputUsuario").css("border-color", "");
					parametros_[9].value = reg_userNickname;
				}

				if(usernamevalido == false){
					$("#inputUsuario").css("border-color", "red");
					$('#inputUsuariolbl').text('Debe escoger un usuario diferente.');
					$('#inputUsuariolbl').css("color", "red");
					log.debug('Usuario no valido...');
					parametros_ = null;
					boolreturn[2] = false;
				}else{
					boolreturn[2] = true;
				}
	
				if(String(reg_passwd) == 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' ){
					camposEmpty += ', Contraseña';
					$("#passwd").css("border-color", "red");
					$("#passwd2").css("border-color", "red");
					log.debug('contraseñas vacias');
				}else{
					if (passwdValid == false) {
						camposEmpty += ', Contraseña';
						$("#passwd").css("border-color", "red");
						$("#passwd2").css("border-color", "red");
						   $('#lbpasswd').text('La contraseña debe tener 8 caracteres, una letra Mayúscula y un Número ( A-Z, 0-9 )')
						$('#lbpasswd').css('color', 'red');
						log.debug('password NO valid');
					}else{
						log.debug('password Valid');
						if(bool_password2 == 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'){
							camposEmpty += ', Confirmacion de contraseña';
							$('#lbpasswd').text('')
							$("#passwd").css("border-color", "");
							$("#passwd2").css("border-color", "red");
							log.debug('Confirmacion de password Vacia');
						}else{
							log.debug('confirmacion de password Ok');
							$('#lbpasswd').text('');
							if(reg_passwd == reg_passwd2) {
								$("#passwd").css("border-color", "");
								$("#passwd2").css("border-color", "");
	
								if(passwdValid== true){
									parametros_[10].value = reg_passwd;
									passwdValid = false;
								}
							}else{
								$('#passwd').val("");
								$('#passwd2').val("");
		
								$('#lbpasswd').text('Las contraseñas no coinciden')
								$('#lbpasswd').css('color', 'red')
								$('#lbpasswd').show()
		
								$("#passwd").css("border-color", "red");
								$("#passwd2").css("border-color", "red");
								
							}
						}
					}
				}
	
				if(camposEmpty != ''){
					$('#message-fail').html('<i class="fas fa-ban"></i> <strong> * </strong> Debe llenar los siguientes campos <strong>' + camposEmpty + ' </strong>');			
					$('#message-fail').show();
					camposEmpty = '';
					parametros_ = null;
					$("#passwd").val("");
					$("#passwd2").val("");
				}else{
					$('#message-fail').hide();			
					camposEmpty = '';
					boolreturn[0] = true;
				}
			}
		}
	
		if(status_huella == false){
			$('#message-fail-huella').html("Debe agregar la huella antes de hacer el registro")
			$('#message-fail-huella').show();
			log.debug('No se registró la huella previamente...');
			parametros_ = null;
		}else{
			$('#message-fail-huella').html("")
			$('#message-fail-huella').hide();
			parametros_[4].value = JSON.stringify(huellas_wsq);
			boolreturn[1] = true;
		}
		
		if(boolreturn[0] == true && boolreturn[1] == true && boolreturn[2] == true){
			return new Promise(respuesta => {
				setTimeout(() => {
					log.debug('Respuesta: '.red + JSON.stringify(parametros_))
					respuesta(parametros_)
				}, 1000);
			});
		}else{
			return new Promise(respuesta => {
				setTimeout(() => {
					log.debug('Respuesta: null')
					respuesta(null)
				}, 1000);
			});
		}

	}catch(e){
		log.error(String(e).red);
		$("#passwd").val("");
		$("#passwd2").val("");
	}
}
function getHorario() {
	log.debug('Generando Json del horario');
	const LunesEntrada = document.getElementById("LunesEntrada").value;
	const MartesEntrada = document.getElementById("MartesEntrada").value;
	const MiercolesEntrada = document.getElementById("MiercolesEntrada").value;
	const JuevesEntrada = document.getElementById("JuevesEntrada").value;
	const ViernesEntrada = document.getElementById("ViernesEntrada").value;
	const SabadoEntrada = document.getElementById("SabadoEntrada").value;

	const LunesSalida = document.getElementById("LunesSalida").value;
	const MartesSalida = document.getElementById("MartesSalida").value;
	const MiercolesSalida = document.getElementById("MiercolesSalida").value;
	const JuevesSalida = document.getElementById("JuevesSalida").value;
	const ViernesSalida = document.getElementById("ViernesSalida").value;
	const SabadoSalida = document.getElementById("SabadoSalida").value;

	const LunesComidaSalida = document.getElementById("LunesComidaSalida").value;
	const MartesComidaSalida = document.getElementById("MartesComidaSalida").value;
	const MiercolesComidaSalida = document.getElementById("MiercolesComidaSalida").value;
	const JuevesComidaSalida = document.getElementById("JuevesComidaSalida").value;
	const ViernesComidaSalida = document.getElementById("ViernesComidaSalida").value;
	const SabadoComidaSalida = document.getElementById("SabadoComidaSalida").value;

	const LunesComidaRegreso = document.getElementById("LunesComidaRegreso").value;
	const MartesComidaRegreso = document.getElementById("MartesComidaRegreso").value;
	const MiercolesComidaRegreso = document.getElementById("MiercolesComidaRegreso").value;
	const JuevesComidaRegreso = document.getElementById("JuevesComidaRegreso").value;
	const ViernesComidaRegreso = document.getElementById("ViernesComidaRegreso").value;
	const SabadoComidaRegreso = document.getElementById("SabadoComidaRegreso").value;

	const json ={
		"Lunes": {
		"Entrada": LunesEntrada,
		"Salida": LunesSalida,
		"ComidaSalida": LunesComidaSalida,
		"ComidaRegreso": LunesComidaRegreso
		},
		"Martes": {
		"Entrada": MartesEntrada,
		"Salida": MartesSalida,
		"ComidaSalida": MartesComidaSalida,
		"ComidaRegreso": MartesComidaRegreso
		},
		"Miercoles":  {
		"Entrada": MiercolesEntrada,
		"Salida": MiercolesSalida,
		"ComidaSalida": MiercolesComidaSalida,
		"ComidaRegreso": MiercolesComidaRegreso
		},
		"Jueves": {
		"Entrada": JuevesEntrada,
		"Salida": JuevesSalida,
		"ComidaSalida": JuevesComidaSalida,
		"ComidaRegreso": JuevesComidaRegreso
		},
		"Viernes": {
		"Entrada": ViernesEntrada,
		"Salida": ViernesSalida,
		"ComidaSalida": ViernesComidaSalida,
		"ComidaRegreso": ViernesComidaRegreso
		},
		"Sabado": {
		"Entrada": SabadoEntrada ,
		"Salida": SabadoSalida ,
		"ComidaSalida": SabadoComidaSalida ,
		"ComidaRegreso": SabadoComidaRegreso 
		}
	};

	return new Promise(respuesta => {
		setTimeout(() => {
			respuesta(JSON.stringify(json))
			log.debug('Json generado --- OK'.yellow);
		}, 500);
	});
}
async function RegistrarUsuario(){
	const parametros_ = [
		{
			param: 'idempresa',
			value: null
		},
		{
			param: 'idSucursal',
			value: null
		},
		{
			param: 'mac',
			value: null
		},
		{
			param: 'idDedo',
			value: null
		},
		{
			param: 'huella',
			value: null
		},
		{
			param: 'aPAT',
			value: null
		},
		{
			param: 'aMAT',
			value: null
		},
		{
			param: 'nombre',
			value: null
		},
		{
			param: 'jsonString',
			value: null
		},
		{
			param: 'usuario',
			value: ''
		},
		{
			param: 'password',
			value: ''
		},
		{
			param: 'rol',
			value: ''
		}
	]
	const parametros_1 = [
		{
			param: 'idempresa',
			value: null
		},
		{
			param: 'idSucursal',
			value: null
		},
		{
			param: 'mac',
			value: null
		},
		{
			param: 'idDedo',
			value: null
		},
		{
			param: 'huella',
			value: null
		},
		{
			param: 'aPAT',
			value: null
		},
		{
			param: 'aMAT',
			value: null
		},
		{
			param: 'nombre',
			value: null
		},
		{
			param: 'jsonString',
			value: null
		}
	]
	const parametros = await getElementstoReg(parametros_);
	const timeout = 3000
	const metodo = 'RegistrarUsuariosNew'

	if(parametros != null){
		try {
			const respuesta = await requestPOST(metodo, parametros, timeout, 2000)
	
			if(respuesta == 'Error del proceso'){
				messageStatus('fail', '¡No se registró!', 'Intente de nuevo.');
				spinnersAction("spinner-danger")
				log.debug('\nError al procesar y validar la huella'.red)
				setTimeout('location.reload()', 1600); // Relaod Page
			}else{
				setTimeout(() => {
					location.reload();
					alert("Error al conectar al servidor. Code:", respuesta);
				}, 5000);
				let [Rusr, Rhuella, Rhorario, Rupriv] = respuesta.split(',');

				let [name1, respuestaUsr] = Rusr.split(':');
				let [name2, respuestaHuella] = Rhuella.split(':');
				let [name3, respuestaHorario] = Rhorario.split(':');
				let [name4, respuestaUsrPriv] = Rupriv.split(':');
				log.debug(respuestaUsr, respuestaHuella, respuestaHorario, respuestaUsrPriv );
				if (respuestaUsr == 0 && respuestaHuella == 0 && respuestaHorario == 0 && respuestaUsrPriv == 0) {
					location.reload();
					alert('Usuario Registrado');
				} else if  (respuestaUsr == 0 && respuestaHuella == 0 && respuestaHorario == 0 && respuestaUsrPriv == 1){
					location.reload();
					alert('Usuario Registrado');
				}else{
					alert('Usuario NO Registrado, revise los campos e intente de nuevo');
				}
			}
		} catch (e) {
			log.error("Error al leer respuesta del servidor\n" + String(e).red);
			alert("Error al registrar, intente de nuevo y revise los campos.");
		}
	}else{
		log.error('Campos vacios, no se procede al registro'.red);
		$("#passwd").val("");
		$("#passwd2").val("");
	}
}


// Obtener MacAddress
function get_macAddress() {
	macaddress.one(function (err, m) {
		if (err) throw err
		macAddress = String(m)
		log.debug('Macaddress ----> '.cyan + String(macAddress).gray)
	})
}


// Funciones Iniciales
function ObtenerPermisos() {
	try{
		fs.readFile(userPATH, 'utf8', (err, data) => {
			if (err){
				log.error(String(err).red);
				// alert('No se encontró configuracion para esta página');
				// ipc.sendSync('BackBtn');
			}
			const decryptedString = cry.decrypt(data);
			let [idE, idS, registroUsr, reportes, consultaUsr, admin] = decryptedString.split(',');
			let [name1, ID_Empresa] = idE.split(':');
			let [name2, ID_Sucursal] = idS.split(':');
			let [name3, respuestaRegUsr] = registroUsr.split(':');
			let [name4, respuestaRep] = reportes.split(':');
			let [name5, respuestaConUsr] = consultaUsr.split(':');
			let [name6, respuestaAdmin] = admin.split(':');
			empresaID = ID_Empresa;
			sucursalID = ID_Sucursal;
			log.info('Empresa: '.yellow + ID_Empresa + ' Sucursal: '.yellow + ID_Sucursal + ' RegUsr: '.yellow + respuestaRegUsr + ' Reprte: '.yellow + respuestaRep + ' Consulta: '.yellow + respuestaConUsr + ' Admin: '.yellow + respuestaAdmin);
		})
	}catch(e){
		log.error(String(e).red);
		ipc.sendSync('BackBtn');
	}
}


// Cerrar ventana - Reinicia la aplicación
function backbtn() {
	ipc.sendSync('BackBtn')
}


// Busqueda de empleados
function buscarEmpleadoHere() {
	var nomBusq = document.getElementById("nom").value;
	var aPATBusq = document.getElementById("aPAT").value;
	var aMATBusq = document.getElementById("aMAT").value;

	if (checkInputNombre(nom, 'nombre') == true && checkInputNombre(aPAT, 'nombre') == true && checkInputNombre(aMAT, 'nombre') == true) {
		$('#listaEmpleados').hide()
		buscarEmpleadoFromList(nomBusq, aPATBusq, aMATBusq)
		clearlb1()
		$('#horario').show()
		$('#registrarbtn').show()
	} else {
		$('#lb1').text('Revise los campos de nombre y apellidos')
	}
}
function buscarEmpleadoHereCON() {
	if (checkInputNombre(nom, 'nombre') == true && checkInputNombre(aPAT, 'nombre') == true && checkInputNombre(aMAT, 'nombre') == true) {
		clearlb1()
	} else {
		$('#lb1').text('Revise los campos de nombre y apellidos')
	}
}
function clearlb1() {
	$('#message-fail').hide();
	
	$("#inputNombre").css("border-color", "");
	$("#inputAPat").css("border-color", "");
	$("#inputAMat").css("border-color", "");

	$("#inputUsuario").css("border-color", "");
	$("#passwd").css("border-color", "");
	$("#passwd2").css("border-color", "");
}


// Acceso a pagina admin
function accesADM() {
	const ipc = require('electron').ipcRenderer;
	var type = '4vanc3#'
	ipc.sendSync('Admin-css', type)
}


// Baja de empleados
var idUsuarioBaja
function buscarEmpleado(nomBusq, aPATBusq, aMATBusq) {

	var request = require('request');
	var regUsr = '\
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
	<s:Body>\
		<BuscarUsuario xmlns="http://tempuri.org/">\
			<idempresa>' + empresaID + '</idempresa>\
			<idsucursal>' + sucursalID + '</idsucursal>\
			<nombre>' + nomBusq + '</nombre>\
			<aPAT>' + aPATBusq + '</aPAT>\
			<aMAT>' + aMATBusq + '</aMAT>\
		</BuscarUsuario>\
	</s:Body>\
</s:Envelope>'
	//alert(regUsr)
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/BuscarUsuario",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<BuscarUsuarioResult>')
			let [respuesta, name22] = resp1.split('</BuscarUsuarioResult>')
			log.debug(respuesta)
			let [idU, rol] = respuesta.split(',')
			let [name1, idUsuario] = idU.split(':')
			log.debug(idUsuario)
			let [name2, idRol] = rol.split(':')
			log.debug(idRol)

			if (idRol != 0 && idUsuario != 0) {
				if (idRol == 1 || idRol == 5 || idRol == 6) {
					$('#horario').show()
					$('#priv').hide()
					$('#priv2').hide()
					$('#nombreEmpleado').html(nomBusq);
					$('#apellidosEmpleado').html(aPATBusq + " " + aMATBusq);
					idUsuarioBaja = idUsuario
				} else {
					$('#horario').hide()
					$('#priv').hide()
					$('#priv2').hide()
				}

				$('#registrarbtn').show()
				$('#bajaEmpleado').show()
			} else {
				alert('El usuario no se encontró, intente buscar de nuevo.')
				$('#bajaEmpleado').hide()
				$('#listaEmpleados').hide()
				$('#horario').hide()
				$('#registrarbtn').hide()
			}
		} catch {
			alert('El usuario no se encontró, intente buscar de nuevo.')
			$('#bajaEmpleado').hide()
			$('#listaEmpleados').hide()
			$('#horario').hide()
			$('#registrarbtn').hide()
		}
	});
}
var idusuarioABorrar
var nombretmp
var apattmp
var amattmp
function buscarEmpleadoFromList(nombre, apellidoPB, apellidoMB) {
	var regUsr = '\
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
	<s:Body>\
		<BuscarUsuario xmlns="http://tempuri.org/">\
			<idempresa>' + empresaID + '</idempresa>\
			<idsucursal>' + sucursalID + '</idsucursal>\
			<nombre>' + nombre + '</nombre>\
			<aPAT>' + apellidoPB + '</aPAT>\
			<aMAT>' + apellidoMB + '</aMAT>\
		</BuscarUsuario>\
	</s:Body>\
</s:Envelope>'
	//alert(regUsr)
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/BuscarUsuario",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<BuscarUsuarioResult>')
			let [respuesta, name22] = resp1.split('</BuscarUsuarioResult>')
			let [idU, rol] = respuesta.split(',')
			let [name1, idUsuario] = idU.split(':')
			let [name2, idRol] = rol.split(':')
			idusuarioABorrar=idUsuario
			$('#bajaEmpleado').show()

			$('#nombreEmpleado').html(nombre);
			$('#apellidosEmpleado').html(apellidoPB + " " + apellidoMB);
			$('#horario').show()
			$('#registrarbtn').show()
		} catch {
			alert('El usuario no se encontró, intente buscar de nuevo.')
			$('#bajaEmpleado').hide()
			$('#listaEmpleados').hide()
			$('#horario').hide()
			$('#registrarbtn').hide()
		}
	})
}
function checkboxlistaclick(valorid) {
	$('#nom').text(' ')
	$('#aPAT').text(' ')
	$('#aMAT').text(' ')
	const aPaterno = String(document.getElementById("listaEmpleados").rows[valorid].cells[1].innerHTML)
	const aMaterno = String(document.getElementById("listaEmpleados").rows[valorid].cells[2].innerHTML)
	const nombre = String(document.getElementById("listaEmpleados").rows[valorid].cells[3].innerHTML)
	$('#titulohorario').text('Crear nuevo horario del empleado: ' + nombre + ' ' + aMaterno + ' ' + aPaterno)
	$('#listaEmpleados').hide()
	nombretmp = nombre
	apattmp = aPaterno
	amattmp = aMaterno
	log.debug("Nombre del empleado: " + nombretmp.trim() + " " + apattmp.trim() + "  " + amattmp.trim())
	buscarEmpleadoFromList(nombre, aPaterno.trim(), aMaterno.trim())
}
function darBajaEmpleado() {
	log.debug('------Proceso de BAJA de usuario-------'.cyan)
	const message = '¿Desea confirmar Dar de Baja al usuario?'
	const details = ''
	ipc.send('ConfirmDialog', message, details)
}
var listaEmpleados
function MostrarListaEmpleados() {

	$("#listaEmpleados tr").detach()
	$("#horario").hide()
	$("#bajaEmpleado").hide()
	$("#registrarbtn").hide()

	var base64 = require('base-64')
	var utf8 = require('utf8')
	var request = require('request');
	var regUsr = '\
			<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
		<s:Body>\
			<ObtenerUsuarios xmlns="http://tempuri.org/">\
			<idempresa>' + empresaID + '</idempresa>\
			<idSucursal>' + sucursalID + '</idSucursal>\
			</ObtenerUsuarios>\
		</s:Body>\
		</s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ObtenerUsuarios",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<ObtenerUsuariosResult>')
			let [respuesta, name22] = resp1.split('</ObtenerUsuariosResult>')
			var bytes = base64.decode(respuesta)
			listaEmpleados = utf8.decode(bytes)
			$('#listaEmpleados').show()
			$('#listaEmpleados tbody').append(listaEmpleados)
		} catch {
			alert('No se pudo obtener la lista de los empleados')
		}
	})
}

// modificacion de horario
function actualizarHorario(json){
	// alert(idusuarioABorrar)

		const regUsr = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
		<s:Body>\
			<ModificaHorarios xmlns="http://tempuri.org/">\
			<idusuario>' + idusuarioABorrar + '</idusuario>\
			<jsonString>' + json + '</jsonString>\
			</ModificaHorarios>\
		</s:Body>\
		</s:Envelope>'
		log.info(regUsr)
		request({
			url: urlL,
			method: "POST",
			headers: {
				"content-type": "text/xml",
				"SOAPAction": "http://tempuri.org/ISolicitud/ModificaHorarios",
			},
			body: regUsr
		}, function (error, response, body) {
			log.info(body)
			let[a, respuestatmp] = body.split('<ModificaHorarios>')
			let[respuesta, b] = respuestatmp.split('</ModificaHorarios>')
			let[x, status] = respuesta.split(':')

			if(status == 'OK'){
				log.debug('El horario de ha modificado exitosamente para el usuario '.yellow + idUsuarioBaja.cyan)
				alert('El horario de ha modificado exitosamente'.yellow)
				
				idusuarioABorrar =  ''
				nombretmp =  ''
				apattmp =  ''
				amattmp =  ''
			}else{
				log.debug('El horario NO  de ha modificado exitosamente  para el usuario '.yellow + idUsuarioBaja.cyan)
				alert('El horario NO de ha modificado exitosamente'.yellow)
			}
		})
}


// Pagina de sucursales --- ACTUAL Hidden
var listaSucursales
function obeterSucursales() {

	$("#listaSucursales tr").detach()
	$('#listaSucursales').show()
	$('#nombresSuc').hide()
	$('#estadoid').hide()
	var base64 = require('base-64')
	var utf8 = require('utf8')
	var request = require('request')
	var regUsr = '\
			<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
			<s:Body>\
				<ObtenerSucursales xmlns="http://tempuri.org/">\
					<idempresa>' + empresaID + '</idempresa>\
				</ObtenerSucursales>\
			</s:Body>\
		</s:Envelope>'
		log.debug(regUsr)
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ObtenerSucursales",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<ObtenerSucursalesResult>')
			let [respuesta, name22] = resp1.split('</ObtenerSucursalesResult>')
			log.debug(respuesta)
			var bytes = base64.decode(respuesta)
			listaSucursales = utf8.decode(bytes)
			//listaSucursales = String(bytes)
			$("#listaSucursales tbody").append(listaSucursales)
		} catch {
			alert('No se pudo obtener la lista de sucursales\n Intente de nuevo')
		}
	});
}
function updateSucursales(valorid) {
	var idsucursal = document.getElementById("listaSucursales").rows[valorid].cells[0].innerHTML
	var sucursal = document.getElementById("listaSucursales").rows[valorid].cells[1].innerHTML
	var request = require('request')
	var regUsr = '\
	<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
  <s:Body>\
    <ModificarSucursales xmlns="http://tempuri.org/">\
      <idempresa>' + empresaID + '</idempresa>\
      <idsucursal>' + idsucursal + '</idsucursal>\
      <sucursal>' + sucursal + '</sucursal>\
    </ModificarSucursales>\
  </s:Body>\
</s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ModificarSucursales",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<ModificarSucursalesResult>')
			let [respuesta, name22] = resp1.split('</ModificarSucursalesResult>')
			if (respuesta == 'true') {
				obeterSucursales()
				alert('La sucursal "' + sucursal + '"  se ha dado de baja.')
			}
		} catch {
			alert('No se pudo dar de baja la sucursal ' + sucursal + '\n Intente de nuevo')
		}
	})
}
function registrarSucursales() {

	var idEstado = $("select.idest").children("option:selected").val()
	var nombresucural = document.getElementById("nombreSucursal").value
	var request = require('request')
	var regUsr = '\
	<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
  <s:Body>\
    <RegistraSucursales xmlns="http://tempuri.org/">\
      <idempresa>' + empresaID + '</idempresa>\
      <sucursal>' + nombresucural + '</sucursal>\
      <estado>' + idEstado + '</estado>\
    </RegistraSucursales>\
  </s:Body>\
</s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/RegistraSucursales",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<RegistraSucursalesResult>')
			let [respuesta, name22] = resp1.split('</RegistraSucursalesResult>')
			if (respuesta == 'true') {
				alert('La sucursal "' + nombresucural + '" se ha dado de alta.')
				obeterSucursales()
				$("#listaSucursales tr").detach()
				$('#listaSucursales').show()
				$("#nombresSuc").text("")
				$("#estadoid").text("")
				$('#nombresSuc').hide()
				$('#estadoid').hide()
			}
			if (respuesta == 'false') {
				alert('No se pudo dar de alta la sucursal: ' + nombresucural)
			}
		} catch {
			alert('No se pudo dar de alta la sucursal')
		}
	})
}
function getEstados() {
	var listaEstados
	var base64 = require('base-64')
	var utf8 = require('utf8')
	var request = require('request')
	var regUsr = '\
	<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
	<s:Body>\
	  <ConsultaEstadosHTML xmlns="http://tempuri.org/">\
		<tipoBusq>2</tipoBusq>\
		<idsucursal>0</idsucursal>\
	  </ConsultaEstadosHTML>\
	</s:Body>\
  </s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ConsultaEstadosHTML",
		},
		body: regUsr
	}, function (error, response, body) {
		try {
			let [name, resp1] = body.split('<ConsultaEstadosHTMLResult>')
			let [respuesta, name22] = resp1.split('</ConsultaEstadosHTMLResult>')
			var bytes = base64.decode(respuesta)
			listaEstados = utf8.decode(bytes)
			$("#estadoid select").append(listaEstados)
		} catch {}
	})
}
function configpagesuc() {
	getEstados()
	$('#nombresSuc').show()
	$('#estadoid').show()
	$('#listaSucursales').hide()
	$("#listaSucursales tr").detach()
}


// IPC comunication to main-js
ipc.on('confirm-dialog-response', (event, response) => {

	if(response == 'acept'){
		log.debug('Se ha confirmado la baja del usuario ID: '.red  + '['.cyan + idusuarioABorrar.yellow + ']'.cyan)
		const regUsrB = '\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
						\n\t<s:Body>\
						\n\t\t<BorrarUsuario xmlns="http://tempuri.org/">\
						\n\t\t\t<idempleado>' + idusuarioABorrar + '</idempleado>\
						\n\t\t</BorrarUsuario>\
						\n\t</s:Body>\
						\n</s:Envelope>'
		request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/BorrarUsuario",
		},
		body: regUsrB
		}, function (error, response, body) {
			let [name, resp1] = body.split('<BorrarUsuarioResult>')
			let [respuesta, name22] = resp1.split('</BorrarUsuarioResult>')
			log.debug('Respuesta del servidor: ' + respuesta.yellow)
			if (respuesta == 'true') {
				log.debug('Accion exitosa para la baja del usuario: '.red  + '['.cyan + idusuarioABorrar.yellow + ']'.cyan)
				idusuarioABorrar = null
				MostrarListaEmpleados()
				alert('El usuario se ha dado de baja exitosamente')
			} else {
				log.debug('El usuario no se dio de baja correctamente ID: '.red  + '['.cyan + idusuarioABorrar.yellow + ']'.cyan)
				alert('El usuario no se dio de baja correctamente, por favor consulte con el admnistrador')
			}
		})
	}else{
		log.debug('Se ha cancelado la baja del usuario ID: '.yellow  + '['.cyan + idusuarioABorrar.green + ']'.cyan)
	}
})
ipc.on('respuesta-dialog-horario', (event, response) => {
	if(response=='acept'){
				const regUsr = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
				<s:Body>\
					<ModificaHorarios xmlns="http://tempuri.org/">\
					<idusuario>' + idusuarioABorrar + '</idusuario>\
					<jsonString>' + json + '</jsonString>\
					</ModificaHorarios>\
				</s:Body>\
				</s:Envelope>'
				log.info(regUsr)
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/ModificaHorarios",
					},
					body: regUsr
				}, function (error, response, body) {
					log.info(body)
					let[a, respuestatmp] = body.split('<ModificaHorarios>')
					let[respuesta, b] = respuestatmp.split('</ModificaHorarios>')

					if(respuesta == 'OK'){
						log.debug('El horario de ha modificado exitosamente para el usuario '.yellow + idUsuarioBaja.cyan)
						alert('El horario de ha modificado exitosamente'.yellow)
						
						idusuarioABorrar =  ''
						nombretmp =  ''
						apattmp =  ''
						amattmp =  ''
					}else{
						log.debug('El horario NO  de ha modificado exitosamente  para el usuario '.yellow + idUsuarioBaja.cyan)
						alert('El horario NO de ha modificado exitosamente'.yellow)
					}
				})
			}else{
				log.debug('Se ha modificado el horario para el usuario ID: '.yellow  + '['.cyan + idusuarioABorrar.green + ']'.cyan)
			}

}) 








//--------------------------------------REGISTRO DE HORAS CHECK--------------------------------------------------------------//
function ControlAccesoHuella(tipoReg) {
	log.silly('################# PROCESO DE REGISTRO #################')
	var huella64
	var validateHuella
	switch (tipoReg) {
		case 1:
			document.getElementById("tipoRegistro1").style.backgroundColor = "#2196F3";
			document.getElementById("tipoRegistro1").style.color = "white";
			break
		case 2:
			document.getElementById("tipoRegistro2").style.backgroundColor = "#2196F3";
			document.getElementById("tipoRegistro2").style.color = "white";
			break
		case 3:
			document.getElementById("tipoRegistro3").style.backgroundColor = "#2196F3";
			document.getElementById("tipoRegistro3").style.color = "white";
			break
		case 4:
			document.getElementById("tipoRegistro4").style.backgroundColor = "#2196F3";
			document.getElementById("tipoRegistro4").style.color = "white";
			break
	}	

	log.debug('Timeout KILL JAVA --> 7 Sec. [SET]'.red)
	setTimeout(killjava, 7000)
	log.debug('Ejecutando JAVA MAIN PROCESS - Para el Activar el sensor de huellas'.green)
	
	exec('cd java/ && LD_LIBRARY_PATH=lib/x64 java -cp ".:lib/dpuareu.jar" Sensor 1',
		function (error, stdout, stderr) {
			huella64 = stdout
		
			

			if(String(huella64) != ''){
				log.debug('Huella Obtenida  ---STATUS---'.cyan + ' [VALIDA] '.green)
				validateHuella = true
			}else{
				log.debug('Huella Obtenida  ---STATUS---'.cyan + ' [INVALIDA] '.red)
			}

			if(validateHuella == true){
				const XMLTexto = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
								<s:Body>\
									<ValidaHuella xmlns="http://tempuri.org/">\
										<empresa>' + empresaID + '</empresa>\
										<IdSucursal>' + sucursalID + '</IdSucursal>\
										<huella>' + huella64 + '</huella>\
									</ValidaHuella>\
								</s:Body>\
							</s:Envelope>'
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/ValidaHuella",
					},
					body: XMLTexto,
					timeout: 10000
				}, function (error, response, body) {
					try {
						let [x, respuestatmp] = body.split('<ValidaHuellaResult>')
						let [respuesta, y] = respuestatmp.split('</ValidaHuellaResult>')
						let [usuario, validacion] = respuesta.split(',')
						let [a, usr] = usuario.split(':')
						let [b, val] = validacion.split(':')

						log.debug('Respuesta del servidor: '.green + respuesta.cyan)

						if (val == "True") {
							switch (tipoReg) {
								case 1:
									$('#lb').text('Registrando...')
									$('#lb').css("color", "green")
									document.getElementById("tipoRegistro1").style.backgroundColor = "#76FF03";
									document.getElementById("tipoRegistro1").style.color = "black";
									ControlAccesoHora(usr, tipoReg)
									break
								case 2:
									$('#lb').text('Registrando...')
									$('#lb').css("color", "green")
									document.getElementById("tipoRegistro2").style.backgroundColor = "#76FF03";
									document.getElementById("tipoRegistro2").style.color = "black";
									ControlAccesoHora(usr, tipoReg)
									break
								case 3:
									$('#lb').text('Registrando...')
									$('#lb').css("color", "green")
									document.getElementById("tipoRegistro3").style.backgroundColor = "#76FF03";
									document.getElementById("tipoRegistro3").style.color = "black";
									ControlAccesoHora(usr, tipoReg)
									break
								case 4:
									$('#lb').text('Registrando...')
									$('#lb').css("color", "green")
									document.getElementById("tipoRegistro4").style.backgroundColor = "#76FF03";
									document.getElementById("tipoRegistro4").style.color = "black";
									ControlAccesoHora(usr, tipoReg)
									break
							}
						} 
						if (val == "False") {
							$('#lb').text('No se validó, vuelva a intentar')
							$('#lb').css("color", "red")
							
							setTimeout(clearWtime, 3000)
							document.getElementById("tipoRegistro1").style.backgroundColor = "#F44336"
							document.getElementById("tipoRegistro1").style.color = "black"
							document.getElementById("tipoRegistro2").style.backgroundColor = "#F44336"
							document.getElementById("tipoRegistro2").style.color = "black"
							document.getElementById("tipoRegistro3").style.backgroundColor = "#F44336"
							document.getElementById("tipoRegistro3").style.color = "black"
							document.getElementById("tipoRegistro4").style.backgroundColor = "#F44336"
							document.getElementById("tipoRegistro4").style.color = "black"
						}
						indexcolordefault()
					} catch (e){
						log.error("Error en la peticion" + String(e).red)
						indexcolordefault()
					}
				})
			}else{
				log.debug('No se obtuvo ninguna huella para validar'.gray)
				indexcolordefault()
			}
			
		})
	

}
function ControlAccesoHora(idUsr, tipoReg) {
	var horaREG
	const req = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
					<s:Body>\
						<ConsultaEstadosHTML xmlns="http://tempuri.org/">\
							<tipoBusq>1</tipoBusq>\
							<idsucursal>' + sucursalID + '</idsucursal>\
						</ConsultaEstadosHTML>\
					</s:Body>\
				</s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ConsultaEstadosHTML",
		},
		body: req,
		timeout: 2000
	}, function (error, response, body) {
		log.debug(body.gray)		
		if (body == 'undefined' || body == null || body == ''){
			var dateTime = require('node-datetime')
			var dt = dateTime.create()
			horaREG = dt.format('H:M')
			
			const XMLTexto = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
								<s:Body>\
									<Registro xmlns="http://tempuri.org/">\
										<idusuario>' + idUsr + '</idusuario>\
										<tipoReg>' + tipoReg + '</tipoReg>\
										<hrReg>' + horaREG + '</hrReg>\
									</Registro>\
								</s:Body>\
							</s:Envelope>'
			log.debug(XMLTexto)
			request({
				url: urlL,
				method: "POST",
				headers: {
					"content-type": "text/xml",
					"SOAPAction": "http://tempuri.org/ISolicitud/Registro",
				},
				body: XMLTexto,
				timeout: 2000
			}, function (error, response, bodyr) {
				log.debug(bodyr)
				$('#lb').append()

				switch (tipoReg) {
					case 1:
						$('#lb').text('Hora de Entrada Registrada' + '  ' + horaREG)
						$('#lb').css("color", "green")
						setTimeout(clearWtime, 3000)
						break;
					case 2:
						$('#lb').text('Hora de Salida Registrada' + '  ' + horaREG)
						$('#lb').css("color", "green")
						setTimeout(clearWtime, 3000)
						break;
					case 3:
						$('#lb').text('Hora de Comida Salida Registrada' + '  ' + horaREG)
						$('#lb').css("color", "green")
						setTimeout(clearWtime, 3000)
						break;
					case 4:
						$('#lb').text('Hora de Comida Regreso Registrada' + '  ' + horaREG)
						$('#lb').css("color", "green")
						setTimeout(clearWtime, 3000)
						break;
				}

			})
		}else{
			log.debug(body)
			let [name, resp1] = body.split('<ConsultaEstadosHTMLResult>')
			let [estado, name22] = resp1.split('</ConsultaEstadosHTMLResult>')
			log.debug(estado)
			var command = 'curl https://www.worldtimeserver.com' + estado
			log.debug(command)
			exec(command, function (error, stdout, stderr) {
				//log.debug(stdout)
				repuestaHORA = String(stdout)
				
			try{
					var re = /([0-2]{1}[0-9]{1}\:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1})/
					var horaObtenida = re.exec(repuestaHORA)
					var horaRT = horaObtenida[0]
					let [hr,min, seg] = horaRT.split(':')
					horaREG = hr + ":" + min

					log.debug('Hora obtenida: ' + horaREG)
			}catch{
				log.debug('Error al registrar la hora del registro.')
			}
			
			if (horaREG == '' || horaREG == null || horaREG == 'undefined'){
				var dateTime = require('node-datetime')
				var dt = dateTime.create()
				horaREG = dt.format('H:M')
			}
				var request = require('request')
				//alert(horaREG)
				var XMLTexto = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
											<s:Body>\
												<Registro xmlns="http://tempuri.org/">\
													<idusuario>' + idUsr + '</idusuario>\
													<tipoReg>' + tipoReg + '</tipoReg>\
													<hrReg>' + horaREG + '</hrReg>\
												</Registro>\
											</s:Body>\
										</s:Envelope>'
				log.debug(XMLTexto)
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/Registro",
					},
					body: XMLTexto
				}, function (error, response, body) {
					//alert(body)
					$('#lb').append()

					switch (tipoReg) {
						case 1:
							$('#lb').text('Hora de Entrada Registrada' + '  ' + horaREG)
							$('#lb').css("color", "green")
							setTimeout(clearWtime, 3000)
							break;
						case 2:
							$('#lb').text('Hora de Salida Registrada' + '  ' + horaREG)
							$('#lb').css("color", "green")
							setTimeout(clearWtime, 3000)
							break;
						case 3:
							$('#lb').text('Hora de Comida Salida Registrada' + '  ' + horaREG)
							$('#lb').css("color", "green")
							setTimeout(clearWtime, 3000)
							break;
						case 4:
							$('#lb').text('Hora de Comida Regreso Registrada' + '  ' + horaREG)
							$('#lb').css("color", "green")
							setTimeout(clearWtime, 3000)
							break;
					}

				})
			})
		}
	})
	
}
function clearWtime(){
	$('#lb').text('')
}

// ------------------------------------- BUSCAR USERNAME ----------------------------------------------------
async function buscarUsername(username){

	const parametros_ = [
		{
			param: 'username',
			value: username
		}
	]
	const timeout = 1000
	const metodo = 'BuscaUsername'

	if(parametros_ != null){
		try {
			const respuesta = await requestPOST(metodo, parametros_, timeout, 1000, debug=false);
	
			if(respuesta == 1){
				log.debug('Usuario:', username, "Ya existe, debe escojer otro...");
				$("#inputUsuario").css("border-color", "red");
				$('#inputUsuariolbl').text('Este usuario ya existe');
				$('#inputUsuariolbl').css("color", "red");
				usernamevalido = false;
			}else{
				$("#inputUsuario").css("border-color", "green");
				$('#inputUsuariolbl').text('');
				$('#inputUsuariolbl').css("color", "green");
				usernamevalido = true;
			}
			
		} catch (e) {
			log.error("Error al leer respuesta del servidor\n" + String(e).red)
		}
	}else{
		log.error('Campos vacios, no se procede al registro'.red);
	}
}




// OLD functions ------------------------------------------------------------------------------------
function RegistrarUsuarios(tipoRegUrs, idded, aPAT, aMAT, nom, json, usuario, password, rol) {
	// alert(tipoRegUrs)
	rol = $("option:selected").val()
	switch (tipoRegUrs) {
		case 1:
			if (huella == null) {
				$('#lbHuella').text('Debe agregar la huella antes de enviar los datos.')
				alert('Debe agregar la huella antes de enviar los datos.')
			} else {
				var huella64 = huella
				const regUsr = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
			<s:Body>\
			<RegistrarUsuarios xmlns="http://tempuri.org/">\
				<idempresa>' + empresaID + '</idempresa>\
				<idSucursal>' + sucursalID + '</idSucursal>\
				<mac>' + macAdd + '</mac>\
				<idDedo>' + idded + '</idDedo>\
				<huella>' + huella64 + '</huella>\
				<aPAT>' + aPAT + '</aPAT>\
				<aMAT>' + aMAT + '</aMAT>\
				<nombre>' + nom + '</nombre>\
				<jsonString>' + json + '</jsonString>\
				<usuario>' + usuario + '</usuario>\
				<password>' + password + '</password>\
				<rol>' + rol + '</rol>\
			</RegistrarUsuarios>\
		</s:Body>\
	</s:Envelope>'
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/RegistrarUsuarios",
					},
					body: regUsr
				}, function (error, response, body) {
					var indice_respuesta = body.indexOf("<RegistrarUsuariosResult>");
					var indice_fin = body.indexOf("</RegistrarUsuariosResult>");
					var respuesta = body.substring(indice_respuesta + 25, indice_fin);

					var respuestaToSplit = String(respuesta)
					var RespUsr
					var RespHuella
					var RespHorario
					var RespUsrPriv

					let [Rusr, Rhuella, Rhorario, Rupriv] = respuestaToSplit.split(',')

					let [name1, respuestaUsr] = Rusr.split(':')
					let [name2, respuestaHuella] = Rhuella.split(':')
					let [name3, respuestaHorario] = Rhorario.split(':')
					let [name4, respuestaUsrPriv] = Rupriv.split(':')

					if (respuestaUsr == 0 && respuestaHuella == 0 && respuestaHorario == 0 && respuestaUsrPriv == 1) {
						location.reload()
						alert('Usuario Registrado')
					} else {
						alert('Usuario NO Registrado, revise los campos e intente de nuevo')
					}
				});

			}
			break;
		case 2:
			if (huella == null) {
				$('#lbHuella').text('Debe agregar la huella antes de enviar los datos.')
				alert('Debe agregar la huella antes de enviar los datos.')
			} else {
				var huella64 = huella
				const regUsr = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
			<s:Body>\
			<RegistrarUsuarios xmlns="http://tempuri.org/">\
				<idempresa>' + empresaID + '</idempresa>\
				<idSucursal>' + sucursalID + '</idSucursal>\
				<mac>' + macAdd + '</mac>\
				<idDedo>' + idded + '</idDedo>\
				<huella>' + huella64 + '</huella>\
				<aPAT>' + aPAT + '</aPAT>\
				<aMAT>' + aMAT + '</aMAT>\
				<nombre>' + nom + '</nombre>\
				<jsonString>' + json + '</jsonString>\
				<usuario>' + usuario + '</usuario>\
				<password>' + password + '</password>\
				<rol>' + rol + '</rol>\
			</RegistrarUsuarios>\
		</s:Body>\
	</s:Envelope>'
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/RegistrarUsuarios",
					},
					body: regUsr
				}, function (error, response, body) {
					log.debug(body)
					var indice_respuesta = body.indexOf("<RegistrarUsuariosResult>");
					var indice_fin = body.indexOf("</RegistrarUsuariosResult>");
					var respuesta = body.substring(indice_respuesta + 25, indice_fin);

					var respuestaToSplit = String(respuesta)
					var RespUsr
					var RespHuella
					var RespHorario
					var RespUsrPriv

					let [Rusr, Rhuella, Rhorario, Rupriv] = respuestaToSplit.split(',')

					let [name1, respuestaUsr] = Rusr.split(':')
					let [name2, respuestaHuella] = Rhuella.split(':')
					let [name3, respuestaHorario] = Rhorario.split(':')
					let [name4, respuestaUsrPriv] = Rupriv.split(':')
					log.debug(respuestaUsr, respuestaHuella, respuestaHorario, respuestaUsrPriv )
					if (respuestaUsr == 0 && respuestaHuella == 0 && respuestaHorario == 0 && respuestaUsrPriv == 0) {
						location.reload()
						alert('Usuario Registrado')
					} else if  (respuestaUsr == 0 && respuestaHuella == 0 && respuestaHorario == 0 && respuestaUsrPriv == 1){
						location.reload()
						alert('Usuario y contraseña, no registrados.\nComuniquese con mesa de ayuda.')
					}else{
						alert('Usuario NO Registrado, revise los campos e intente de nuevo')
					}
				});

			}
			break;
		}	
}
//-------------------------------------------PERMISOS PRIV---------------------------------------------------------//
function ObtenerPermisoss(tipoconfig) {
	var name
	if(tipoconfig==1) name='Consulta Empleados'
	if(tipoconfig==2) name='Alta Empleados'
	log.info('-----------' + name + '------------')
	try{
		fs.readFile(userPATH, 'utf8', (err, data) => {
			if (err) log.error(err)
			var encrypt = data
			configinit = data
			const decryptedString = cry.decrypt(encrypt)
			let [idE, idS, registroUsr, reportes, consultaUsr, admin] = decryptedString.split(',')
			let [name1, ID_Empresa] = idE.split(':')
			let [name2, ID_Sucursal] = idS.split(':')
			let [name3, respuestaRegUsr] = registroUsr.split(':')
			let [name4, respuestaRep] = reportes.split(':')
			let [name5, respuestaConUsr] = consultaUsr.split(':')
			let [name6, respuestaAdmin] = admin.split(':')

			log.info('Empresa: '.yellow + ID_Empresa + ' Sucursal: '.yellow + ID_Sucursal + ' RegUsr: '.yellow + respuestaRegUsr + ' Reprte: '.yellow + respuestaRep + ' Consulta: '.yellow + respuestaConUsr + ' Admin: '.yellow + respuestaAdmin)
			
			$('#page').hide()
			$('#titleConsulta').hide()
			$('#rolpass').hide()
			$('#huellabtn').hide()
			$('#horario').hide()
			$('#registrarbtn').hide()
			$('#priv2').hide()
			$('#priv3').hide()
			$('#bajaEmpleado').hide()
			$('#spinerHuella').hide()

			if (String(tipoconfig) == '1') {
				$('#nombres').show()
				$('#titleConsulta').hide()
				$('#titleAlta').hide()
				$('#rolpass').hide()
				$('#huellabtn').hide()
				$('#horario').hide()
				$('#registrarbtn').hide()
				if (respuestaRegUsr == 1) {
					$('#titleConsulta').hide()
					$('#rolpass').hide()
					$('#huellabtn').hide()
					$('#horario').hide()
					$('#registrarbtn').hide()
				}
				if (respuestaRep == 1) {}

				if (respuestaConUsr == 1) {
					$('#nombres').show()
					$('#titleConsulta').hide()
					$('#rolpass').hide()
					$('#huellabtn').hide()
					$('#horario').hide()
					$('#registrarbtn').hide()
				}

				if (respuestaAdmin == 1) {
					$('#titleConsulta').hide()
					$('#rolpass').hide()
					$('#huellabtn').hide()
					$('#horario').hide()
					$('#registrarbtn').hide()
					$('#bajaEmpleado').hide()

				}
			} else {
				// alert('NO hay configuracion')
			}
						
			if (String(tipoconfig) == '2') {
					$('#page').hide()
					$('#nombres').hide()
					$('#titleConsulta').hide()
					$('#huellabtn').hide()
					$('#horario').hide()
					$('#registrarbtn').hide()

					if (respuestaRegUsr == 1) {
						$('#page').hide()
						$('#nombres').show()
						$('#titleConsulta').hide()
						$('#rolpass').show()
						$('#huellabtn').show()
						$('#horario').show()
						$('#registrarbtn').show()
					}
					if (respuestaRep == 1) {}
					if (respuestaConUsr == 1) {}
					if (respuestaAdmin == 1) {
						$('#page').show()
						$('#nombres').show()
						$('#titleConsulta').hide()
						$('#rolpass').show()
						$('#huellabtn').show()
						$('#horario').show()
						$('#registrarbtn').show()
					}
			} else {
				// alert('NO hay configuracion')
			}			
		})
	}catch(e){
		log.error(e)
	}
}
function RegistrarUsuariosPriv(idUsrPiv, usuario, password, rol) {
	if (huella == null) {
		$('#lbHuella').text('Debe agregar la huella antes de enviar los datos.')
	} else {
		var request = require('request');
		var regUsr = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
    <s:Body>\
		<RegistrarUsuariosP xmlns="http://tempuri.org/">\
			<idusuario>' + idUsrPiv + '</idusuario>\
			<usuario>' + usuario + '</usuario>\
			<password>' + password + '</password>\
			<rol>' + rol + '</rol>\
		</RegistrarUsuariosP>\
    </s:Body>\
  </s:Envelope>'
		request({
			url: urlL,
			method: "POST",
			headers: {
				"content-type": "text/xml",
				"SOAPAction": "http://tempuri.org/ISolicitud/RegistrarUsuariosP",
			},
			body: regUsr
		}, function (error, response, body) {
			try {
				var indice_respuesta = body.indexOf("<RegistrarUsuariosPResult>");
				var indice_fin = body.indexOf("</RegistrarUsuariosPResult>");
				var repuesta = body.substring(indice_respuesta + 33, indice_fin);
				if (repuesta == "true") {
					$('#lbl').text('Usuario Creado')
					$('#lb2').text('Huella Registrada')
					$('#lb3').text('Horario Registrado')
				} else {

					$('#lb1').text('Usuario NO Creado')
					$('#lb2').text('Huella NO Registrada')
					$('#lb3').text('Horario NO Registrado')
				}
			} catch {

			}
		});
	}
}
function loading(status) {
	const {
		ipcRenderer
	} = require('electron');
	ipcRenderer.send('request-mainprocess-action', status);
}
//-------------------------------------------LOGIN---------------------------------------------------------//
var id_usuario
var id_rol
function credencials(usuario, password) {
	log.debug('\n**************** CREDENCIALS ****************\n'.magenta)
	const req ='\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
					\n\t<s:Body>\
						\n\t\t<Credenciales xmlns="http://tempuri.org/">\
							\n\t\t\t<usuario>' + usuario + '</usuario>\
							\n\t\t\t<password>' + password + '</password>\
						\n\t\t</Credenciales>\
					\n\t</s:Body>\
				\n</s:Envelope>'
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/Credenciales",
		},
		body: req,
		timeout: 10000
	}, function (error, response, body) {
		try {
			let [a, respuestatmp] = body.split('<CredencialesResult>')
			let [respuesta, b] = respuestatmp.split('</CredencialesResult>')
			let [usuario, rol] = respuesta.split(' ')
			let [x, idU] = usuario.split(':')
			let [y, idR] = rol.split(':')
			
			if(String(idU) != 'undefined' && String(idR) != 'undefined'){
				id_usuario = idU
				id_rol = idR			
				log.debug('Respuesta del servidor: -----> CREDENCIALS --->  [VALIDA]'.cyan + '\n')

				log.debug('\n**************** Get Roles by USER ****************\n'.magenta)
				const reqrol = '\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
									\n\t<s:Body>\
										\n\t\t<ObtenerPermisos xmlns="http://tempuri.org/">\
											\n\t\t\t<idusr>' + id_usuario + '</idusr>\
										\n\t\t</ObtenerPermisos>\
									\n\t</s:Body>\
								\n</s:Envelope>'
				request({
					url: urlL,
					method: "POST",
					headers: {
						"content-type": "text/xml",
						"SOAPAction": "http://tempuri.org/ISolicitud/ObtenerPermisos",
					},
					body: reqrol,
					timeout: 7000
				}, function (error, response, body) {
					try {
						let [x, respuestatmp] = body.split('<ObtenerPermisosResult>')
						let [respuesta, y] = respuestatmp.split('</ObtenerPermisosResult>')
						let [registroUsr, reportes, consultaUsr, admin] = respuesta.split(',')
						let [a, respuestaRegUsr] = registroUsr.split(':')
						let [b, respuestaRep] = reportes.split(':')
						let [c, respuestaConUsr] = consultaUsr.split(':')
						let [d, respuestaAdmin] = admin.split(':')
						
						log.debug('Respuesta del servidor: '.cyan + '[OK]' + ' :::'.yellow + ' Usuario: ' + id_usuario + ':::'.yellow)
						
						fs.readFile(ConfigFile, 'utf8', (err, data) => {
							if (err) log.error('No existe archivo de configuración')
							configinit = data
							const decry = cry.decrypt(data)
							let [idE, idS] = decry.split(',')
							let [a, idEmpresa] = idE.split(':')
							let [b, idSucursal] = idS.split(':')
							idEmpresa
							idSucursal				
							log.debug('Creando configuracion para el usuario' + ' :::'.yellow + ' Usuario: ' + id_usuario + ':::'.yellow)
							var configToRegist = 'idE:' + idEmpresa + ',idS:' + idSucursal + ',RegUsr:' + respuestaRegUsr + ',Rep:' + respuestaRep + ',ConUsr:' + respuestaConUsr + ',Admin:' + respuestaAdmin + ','
							const encrytmp = cry.encrypt(configToRegist)
							try{
								createconfigtmp(encrytmp)
								setTimeout(onlogi, 1000)
							}catch(err){
								log.error(err)
							}
						})
					} catch(err){
						$('#lbl').text('Error en obtener permisos')
						$('#lbl').css('color','red')
						log.error(err)
					}
				})
			}else{
				$('#lbl').text('Error en la petición, intente mas tarde')
			}
		} catch (err){
			$('#lbl').text('Error en la petición, intente de nuevo')
			log.error(err)
		}
	})
}
function createconfigtmp(encrytmp){
	log.debug('Creando configuración para el usuario del Login'.cyan + ':-:-:'.red + ' PATH: '.cyan + String(userPATH).yellow)
	fs.writeFile(userPATH, encrytmp, function (err) {
		if (err) log.error(String(err).red)
		log.info('--- STATUS --- [OK]'.green)
	})
}
function onlogi(){
	ipc.sendSync('entry-accepted', 'ping')
}
function createConfiginit(data){
	try{
	
	if (!fs.existsSync(ConfigPATH)) mkdirp(ConfigPATH, function (err) {
		if (err) log.error(err + '\nNo existe y no se pudo crear la carpeta de configuración')
		log.debug('PATH de configuracion: '.gray + ConfigPATH.yellow)
		log.debug('Carpeta config creada')
	})

	if (!fs.existsSync(ConfigFile)) fs.writeFile(ConfigFile, data, function (err) {
		if (err) log.error(err)
		log.info('Archivo de configuracion creado: '.gray + ConfigFile.yellow)
		log.info(data)
  	})
  
  log.debug('Config Creada')
  }catch(e){
    log.error(e)
  }
}
function configPage(tipoconfig) {
	ObtenerPermisos()
	getDataConfig(tipoconfig)
}
function indexcolordefault() { 
	// sleep(1000)
	document.getElementById("tipoRegistro1").style.backgroundColor = "white";
	document.getElementById("tipoRegistro1").style.color = "black";
	document.getElementById("tipoRegistro2").style.backgroundColor = "white";
	document.getElementById("tipoRegistro2").style.color = "black";
	document.getElementById("tipoRegistro3").style.backgroundColor = "white";
	document.getElementById("tipoRegistro3").style.color = "black";
	document.getElementById("tipoRegistro4").style.backgroundColor = "white";
	document.getElementById("tipoRegistro4").style.color = "black";
}
function getDataConfig(){
	try{
		get_macAddress();
		fs.readFile(ConfigFile, 'utf8', (err, data) => {
			if (err) log.error(err)
			var encrypt = data
			configinit = data
			const decryptedString = cry.decrypt(encrypt)
			let [idE, idS] = decryptedString.split(',')
			let [name1, ID_Empresa] = idE.split(':')
			let [name2, ID_Sucursal] = idS.split(':')
			empresaID = ID_Empresa;
			sucursalID = ID_Sucursal;
			log.info('Empresa: '.yellow + ID_Empresa + ' Sucursal: '.yellow + ID_Sucursal);
		})
	}catch(e){
		log.error(e.red)
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

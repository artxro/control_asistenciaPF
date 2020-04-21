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
const FolderMAINPATH = os.homedir + '/.config/Control-Asistencia'
const ConfigFilePath = FolderMAINPATH + '/config'
const userPATH = os.homedir + '/.config/Control-Asistencia/user'
const rde = base64.decode('MGJsaXZpYXQzIw==')
const cry = new Cry(rde)

const ConfigPATH = os.homedir + '/.config/Control-Asistencia';
const ConfigFile = ConfigPATH + '/config';
const UserFile = ConfigPATH + '/user';

const ConfigFilejs = ConfigPATH + '/conect.conf';
var empresaID
var sucursalID
var huella
var macAdd


const urlL = 'http://wshuella.prestamofeliz.com.mx:9045/WSH.svc'



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

//------------------------------------------------OBTENER MAC ADDRESS---------------------------------------------------------//
function get_macAddress() {
	macaddress.one(function (err, m) {
		if (err) throw err
		macAdd = String(m)
		log.debug('Macaddress ----> '.cyan + String(macAdd).gray)
	})
}

//------------------------------------------------FUNCIONES EXTRAS---------------------------------------------------------//

function killjava(){
	exec('pkill -9 java')
	log.debug('Proceso de JAVA - Para el sensor de huella --- STATUS --- [TERMINADO]'.red)
}

function checkHora(hora) {	
	var re = /([0-2]{1}[0-9]{1}\:[0-6]{1}[0-9]{1})/;
	var result = re.exec(hora);

	log.info('Check Hora: ' + result)
	// var hora = "10:19"
	// var Regex = require("regex");
	// var regex = new Regex(/([0-2]{1}[0-9]{1}\:[0-6]{1}[0-9]{1})/);
	// log.debug(hora.trim())
	// var bool = regex.test(hora.trim())
	// log.debug(bool)
	//return bool
}

function configPage(tipoconfig) {
	get_macAddress()
	ObtenerPermisos(tipoconfig)
	getDataConfig(tipoconfig)
}

function getDataConfig(tipoconfig){
	if (tipoconfig==1){
		$('#listaEmpleados').hide()
		$('#bajaEmpleado').hide()
		$('#horario').hide()
		$('#priv').hide()
		$('#priv2').hide()
		$('#rolpass').hide()
		$('#huellabtn').hide()
		$('#registrarbtn').hide()
	}
	$('#nombresSuc').hide()

	try{
		fs.readFile(ConfigFilePath, 'utf8', (err, data) => {
			if (err) log.error(err)
			var encrypt = data
			configinit = data
			const decryptedString = cry.decrypt(encrypt)
			let [idE, idS] = decryptedString.split(',')
			let [name1, ID_Empresa] = idE.split(':')
			let [name2, ID_Sucursal] = idS.split(':')
			empresaID = ID_Empresa
			sucursalID = ID_Sucursal
			log.info('Empresa: '.yellow + ID_Empresa + ' Sucursal: '.yellow + ID_Sucursal)			
		})
	}catch(e){
		log.error(e.red)
	}
}

function registrarConfig(configToRegist, idEm, idSuc, inicial) {
	log.debug('RegistraMAC')
	macaddress.one(function (err, m) {
		var requestmac = require('request');
		var XMLTextomac = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
		<s:Body>\
		<RegistraMAC xmlns="http://tempuri.org/">\
			<idempresa>' + idEm + '</idempresa>\
			<sucursal>' + idSuc + '</sucursal>\
			<mac>'  + m + '</mac>\
		</RegistraMAC>\
		</s:Body>\
	</s:Envelope>'
		// alert(XMLTextomac)
		requestmac({
			url: urlL,
			method: "POST",
			headers: {
				"content-type": "text/xml",
				"SOAPAction": "http://tempuri.org/ISolicitud/RegistraMAC",
			},
			body: XMLTextomac
		}, function (error, response, body) {
			// alert(body);

			log.debug('Registra config')

			var request = require('request');
			var XMLTexto = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\
	<s:Body>\
		<RegistraConfig xmlns="http://tempuri.org/">\
			<mac>'  + m + '</mac>\
			<config>' + configToRegist + '</config>\
		</RegistraConfig>\
	</s:Body>\
	</s:Envelope>'

			// alert(body);
			request({
				url: urlL,
				method: "POST",
				headers: {
					"content-type": "text/xml",
					"SOAPAction": "http://tempuri.org/ISolicitud/RegistraConfig",
				},
				body: XMLTexto
			}, function (error, response, body) {
				// alert(body);
				if (inicial == 1) {
					
					alert('La aplicación se reiniciará para guardar la configuracion.\nPresione ACEPTAR para continuar.')
					const ipc = require('electron').ipcRenderer
					ipc.sendSync('config', 'Reiniciando aplicacion...')
					   
				} else {
					log.debug("")
				}
			})
		})
	})
}


function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
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


function checkInputNombre(stringval, pattern) {	
	const nombrepattern = "[a-zA-Z ]{3,30}"
	const bool =  stringval.match(nombrepattern) ? true : false
	return bool
}





function clearlb1() {
	$('#lb1').text('')
	$('#lb2').text('')
	$('#lb3').text('')
}


function backbtn() {
	ipc.sendSync('BackBtn')
}

function accesADM() {
	const ipc = require('electron').ipcRenderer;
	var type = '4vanc3#'
	ipc.sendSync('Admin-css', type)
}


function checkPasswd() {
	if (id_usuario == "null" && id_rol == "null") {
		$('#lbl').text('Usuario o contraseña fallida.')
	}
}


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
			alert(idUsuario)
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
		log.info(regUsr)
	request({
		url: urlL,
		method: "POST",
		headers: {
			"content-type": "text/xml",
			"SOAPAction": "http://tempuri.org/ISolicitud/ObtenerUsuarios",
		},
		body: regUsr
	}, function (error, response, body) {
		log.debug(body)
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

//------------------------------------------REGISTRO DE USUARIOS---------------------------------------------------------------//

function RegistroEmpleados(rolUsuario) {
	const aPAT = $('#aPAT').val()
	const aMAT = $('#aMAT').val()
	const nom = $('#nom').val()

	if(nom != '' && aPAT != '' && aMAT != ''){
		const valnombre = checkInputNombre(nom, 'nombre')
		const valapellidoMat = checkInputNombre(nom, 'nombre')
		const valapellidoPat = checkInputNombre(nom, 'nombre')

		const iddedo = 1
		const tiporol = rolUsuario
		const json = getjson()
		const usrCred = document.getElementById("usrCred").value
		const hashstringempty = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
		const pass1 = hash($('#passCred').val())
		const pass2 = hash($('#passCredVal').val())
		
		if (valnombre == true) {
			if(valapellidoPat == true){
				if(valapellidoMat == true){
					if (pass1 == pass2) {
						if (pass1 == hashstringempty) {
							RegistrarUsuarios(1, iddedo, aPAT, aMAT, nom, json, usrCred, pass1, tiporol)
						} else {
							RegistrarUsuarios(2, iddedo, aPAT, aMAT, nom, json, usrCred, pass1, tiporol)
						}
					} else {
						$('#passCred').val("");
						$('#passCredVal').val("");
						$('#lbpasswd').text('Las contraseñas no coinciden')
					}
				}else{
					$('#lb1').text('Revise los campos Apellidos apellidos')
				}
			}else{
				$('#lb1').text('Revise los campos Apellidos apellidos')
			}
		}else{
			$('#lb1').text('Revise el campo del nombre')
			setTimeout(clearlb1, 4000)
		}
	}else{
		$('#lb1').text('Debe escribir el nombre del empleado')
		$('#lb1').css('color', 'red')
		alert('Debe escribir el nombre del empleado')
	}
}

function getjson() {
	var LunesEntrada = document.getElementById("LunesEntrada").value;
	var MartesEntrada = document.getElementById("MartesEntrada").value;
	var MiercolesEntrada = document.getElementById("MiercolesEntrada").value;
	var JuevesEntrada = document.getElementById("JuevesEntrada").value;
	var ViernesEntrada = document.getElementById("ViernesEntrada").value;
	var SabadoEntrada = document.getElementById("SabadoEntrada").value;

	var LunesSalida = document.getElementById("LunesSalida").value;
	var MartesSalida = document.getElementById("MartesSalida").value;
	var MiercolesSalida = document.getElementById("MiercolesSalida").value;
	var JuevesSalida = document.getElementById("JuevesSalida").value;
	var ViernesSalida = document.getElementById("ViernesSalida").value;
	var SabadoSalida = document.getElementById("SabadoSalida").value;

	var LunesComidaSalida = document.getElementById("LunesComidaSalida").value;
	var MartesComidaSalida = document.getElementById("MartesComidaSalida").value;
	var MiercolesComidaSalida = document.getElementById("MiercolesComidaSalida").value;
	var JuevesComidaSalida = document.getElementById("JuevesComidaSalida").value;
	var ViernesComidaSalida = document.getElementById("ViernesComidaSalida").value;
	var SabadoComidaSalida = document.getElementById("SabadoComidaSalida").value;

	var LunesComidaRegreso = document.getElementById("LunesComidaRegreso").value;
	var MartesComidaRegreso = document.getElementById("MartesComidaRegreso").value;
	var MiercolesComidaRegreso = document.getElementById("MiercolesComidaRegreso").value;
	var JuevesComidaRegreso = document.getElementById("JuevesComidaRegreso").value;
	var ViernesComidaRegreso = document.getElementById("ViernesComidaRegreso").value;
	var SabadoComidaRegreso = document.getElementById("SabadoComidaRegreso").value;

	var json = '{\
"Lunes": {\
"Entrada": "' + LunesEntrada + '",\
"Salida": "' + LunesSalida + '",\
"ComidaSalida": "' + LunesComidaSalida + '",\
"ComidaRegreso": "' + LunesComidaRegreso + '"\
},\
"Martes": {\
"Entrada": "' + MartesEntrada + '",\
"Salida": "' + MartesSalida + '",\
"ComidaSalida": "' + MartesComidaSalida + '",\
"ComidaRegreso": "' + MartesComidaRegreso + '"\
},\
"Miercoles":  {\
"Entrada": "' + MiercolesEntrada + '",\
"Salida": "' + MiercolesSalida + '",\
"ComidaSalida": "' + MiercolesComidaSalida + '",\
"ComidaRegreso": "' + MiercolesComidaRegreso + '"\
},\
"Jueves": {\
"Entrada": "' + JuevesEntrada + '",\
"Salida": "' + JuevesSalida + '",\
"ComidaSalida": "' + JuevesComidaSalida + '",\
"ComidaRegreso": "' + JuevesComidaRegreso + '"\
},\
"Viernes": {\
"Entrada": "' + ViernesEntrada + '",\
"Salida": "' + ViernesSalida + '",\
"ComidaSalida": "' + ViernesComidaSalida + '",\
"ComidaRegreso": "' + ViernesComidaRegreso + '"\
},\
"Sabado": {\
"Entrada": "' + SabadoEntrada + '" ,\
"Salida": "' + SabadoSalida + '" ,\
"ComidaSalida": "' + SabadoComidaSalida + '" ,\
"ComidaRegreso": "' + SabadoComidaRegreso + '" \
}\
}';
	return json;
}


function actualizarHorario(json){
	alert(idusuarioABorrar)

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

function RegistrarUsuarios(tipoRegUrs, idded, aPAT, aMAT, nom, json, usuario, password, rol) {
	alert(tipoRegUrs)
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
						alert('Usuario y contraseña, no registrados.\nComuniquese con mesa de ayuda.')
					}else{
						alert('Usuario NO Registrado, revise los campos e intente de nuevo')
					}
				});

			}
			break;
		case 3:
			
		break
		}	
}

function ObtenerHuella() {
	log.info('Obetiendo Huella...')
	log.debug('TimeOut para JAVA Activado ----> [60 seg]'.red)
	setTimeout(killjava, 180000)
	$('#spinerHuella').show()
	$('#lbHuella').text('Coloque 4 veces el dedo sobre el lector hasta que se apague.')
	$('#lbHuella').css('color', 'blue')
	exec('cd java/ && LD_LIBRARY_PATH=lib/x64 java -cp ".:lib/dpuareu.jar" Sensor 2',
		function (error, stdout, stderr) {
			huella = stdout;
			$('#spinerHuella').hide()
			if (huella == null || huella == '') {
				$('#lbHuella').text('Error en el proceso de obtencion de huella dactilar\nProfavor intente d enuevo')
				document.getElementById("btnHuella").style.backgroundColor = "#d50000";
			} else {
				$('#lbHuella').text('Huella Agregada')
				document.getElementById("btnHuella").style.backgroundColor = "#2e7d32";
			}
	})
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
				alert('Error al registrar la hora del registro.')
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
						
						fs.readFile(ConfigFilePath, 'utf8', (err, data) => {
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
	
	if (!fs.existsSync(FolderMAINPATH)) mkdirp(FolderMAINPATH, function (err) {
		if (err) log.error(err + '\nNo existe y no se pudo crear la carpeta de configuración')
		log.debug('PATH de configuracion: '.gray + FolderMAINPATH.yellow)
		log.debug('Carpeta config creada')
	})

	if (!fs.existsSync(ConfigFilePath)) fs.writeFile(ConfigFilePath, data, function (err) {
		if (err) log.error(err)
		log.info('Archivo de configuracion creado: '.gray + ConfigFilePath.yellow)
		log.info(data)
  	})
  
  log.debug('Config Creada')
  }catch(e){
    log.error(e)
  }
}

//-------------------------------------------PERMISOS PRIV---------------------------------------------------------//
function ObtenerPermisos(tipoconfig) {
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
			empresaID = ID_Empresa
			sucursalID = ID_Sucursal

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
//-------------------------------------------- MODULES ---------------------------------------//
const { app, BrowserWindow, Menu, ipcMain , ipcRenderer, dialog} = require('electron');
const {	autoUpdater } = require('electron-updater');
const log = require('electron-log');
const colors = require('colors');
const macaddress = require('macaddress');
const fs = require('fs');
const filesize = require("filesize");
const base64 = require('base-64');
const ping = require('ping');
const Cyr = require('cryptr');
const dateTime = require('node-datetime');
const $ = require('jquery');

const os = require('os');
const mkdirp = require('mkdirp');
const path = require('path');
const url = require('url');

// const readline = require('readline');

require('electron-reload')(__dirname); // Desarrollo stuff Actualizacion de pantalla automatica en cambios 

// Fix gpu Error ...
// app.commandLine.appendSwitch('disable-gpu');

//---------- VARIABLES MAIN ----------------//
const ifaces = os.networkInterfaces();

const ConfigPATH = os.homedir + '/.config/Control-Asistencia'; // Carpeta principal de configuracion
const ConfigFile = ConfigPATH + '/config';
const UserFile = ConfigPATH + '/user';
const ConfigFilejs = ConfigPATH + '/conect.conf';
const logFile = ConfigPATH + '/app.log';

var mac = null;
var iplocal = null;
var empresaID;
var sucursalID;
var loginBool = [true, false]; // Estatus de ventana login para crear o no otra nueva  [Ventana nueva, Focus]
var empleadosBool = [true, false]; // Estatus de ventana empleados para crear o no otra nueva  [Ventana nueva, Focus]

//-------------------------------- CRIPTO ----------------------------------//
const taco = base64.decode('MGJsaXZpYXQzIw==');
const cry = new Cyr(taco);

//------------IP SERVICIO------------------//
const urlP = 'wshuella.prestamofeliz.com.mx';
const urlL = 'http://wshuella.prestamofeliz.com.mx:9045/WSH.svc';
// const urlP = 'google.com';
// const urlL = 'http://localhost:2762/WSH.svc';



//---------------------------------------------------- PROMTP ----------------------------------------------//
const MessagePrompt_P = 'd8888b. d8888b. d88888b .d8888. d888888b  .d8b.  .88b  d88.  .d88b.  \n88  `8D 88  `8D 88      88   YP `~~88~~  d8  `8b 88 YbdP`88 .8P  Y8.  \n88oodD  88oobY  88ooooo `8bo.      88    88ooo88 88  88  88 88    88  \n88~~~   88`8b   88~~~~~   `Y8b.    88    88~~~88 88  88  88 88    88  \n88      88 `88. 88.     db   8D    88    88   88 88  88  88 `8b  d8   \n88      88   YD Y88888P `8888Y     YP    YP   YP YP  YP  YP  `Y88P'
const MessagePrompt_F = 'd88888b d88888b db      d888888b d88888D \n88      88      88        `88    YP  d8   \n88ooo   88ooooo 88         88       d8    \n88~~~   88~~~~~ 88         88      d8     \n88      88.     88booo.   .88.    d8  db  \nYP      Y88888P Y88888P Y888888P d88888P'
//---------------------------------------------------- -----------------------------------------------------//

//---------------------------------------------- Funciones MAIN --------------------


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
                    log.debug('Data - xml'.cyan ,data);
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
        }catch(e){
            reject(e);
        }
    });
}

function getFilesizeInBytes(filename) {
	return new Promise((resolve, reject) => {
		const stats = fs.statSync(filename);
		const fileSizeInBytes = stats["size"];
		resolve(fileSizeInBytes);
	});
}
//---------------------------------------- Config ----------------------------------------------

function extractConfig() {
	try {
		if (fs.existsSync(UserFile)) {
			log.silly('\n');
			log.silly('########################################################');
			log.error('Iniciando la aplicación se encontró conifg de un usuario'.red);
			fs.unlinkSync(UserFile);
			log.error('Archivo Config de Usuario ---> [BORRADO]'.red);
			log.silly('########################################################\n');
			log.silly('');
		} else {
			log.debug('Configuracion por usuario --->'.cyan + ' [NO EXISTE] '.green + '---->'.cyan + ' [OK] \n'.green);
		}
		fs.readFile(ConfigFile, 'utf8', (err, data) => {
			log.debug('Desencriptando configuracion')
			const decryptedString = cry.decrypt(data)
			log.debug('Leyendo cofiguracion de la aplicacion')
			let [idE, idS] = decryptedString.split(',')
			let [a, empresaID] = idE.split(':')
			let [b, sucursalID] = idS.split(':')
			if (String(empresaID) != 'undefined') {
				if (String(sucursalID) != 'undefined') {
					log.info('Regirigiendo a la ventana principal :)\n'.magenta)
					createWindow()
				} else {
					log.debug('Error al leer la configuración\nPongase en contacto con Mesa de Ayuda en caso de ver este mensaje')
					errorConfig('Error al leer la configuración\nPongase en contacto con Mesa de Ayuda en caso de ver este mensaje')
				}
			} else {
				log.error('Error al leer la configuracion de la aplicación'.red)
			}
		})
	} catch (e) {
		return False
	}
}

//------------------------------------ Start App -----------------------------
function start() {
	log.debug('Revisando coneccion al servidor'.blue, urlP.yellow);
	log.debug('PING');
	ping.sys.probe(urlP, function(isAlive){
		if(isAlive == true){
			log.debug('PONG');
			log.debug('Iniciando aplicacion'.yellow);
			createWindow();
		}else{
			log.debug('Server death');
			errorConServer();
		}
    });
}

//--------------------------------- Otros

//---------------------------------------- Pantalla alterna de configuracion ----------------------------------------------

let configInicialWin;

function configWindow() {
	configInicialWin = new BrowserWindow({
		webPreferences: {
			nodeIntegrationInWorker: true,
			webviewTag: true,
			nodeIntegration: true,
			// preload: path.join(app.getAppPath(), 'js/index.js')
		},
		modal: true,
		show: false,
		width: 400,
		height: 500
	});

	configInicialWin.loadFile('html/config.html');
	
	// configInicialWin.webContents.openDevTools();

	let menuinit = Menu.buildFromTemplate([{
		label: 'Menú',
		click: () => {}
	}]);
	configInicialWin.setMenu(menuinit);

	configInicialWin.once('ready-to-show', () => {
		configInicialWin.show();
	});
}

//-------------------------------------------------- Main window ----------------------------------------------------------//
const isMac = process.platform === 'darwin'

let mainWindow;
function createWindow() {
	// Nuevo browser window.
	mainWindow = new BrowserWindow({
		webPreferences: {
			enableRemoteModule: true,
			webSecurity: false,
			nodeIntegrationInWorker: true,
			webviewTag: true,
			nodeIntegration: true //Habilita comunicacion entre index.js y main.js (ipc)
		},
		width: 1024,
		height: 610,
		icon: path.join(__dirname, '/assets/icons/png/LogoInstitucional.png')
	})

	// mainWindow.webContents.openDevTools() //Habilita herramientas de desarrollador
	
	// Leer index.html
	mainWindow.loadFile('index.html');
	
	// Activar la barra menú
	Menu.setApplicationMenu(Menu.buildFromTemplate([
		{
			label: 'Menú',
			submenu: [{
				label: 'Login',
				click: () => {
					if (loginBool[0] == true) login()
					if (loginBool[1] == true) winlogin.focus()
					setTimeout(closeLogin, 60000)
				}
			}]
		}
	// ,
	// {
	// 	label: 'Ayuda',
	// 	submenu: [{
	// 		label: 'Buscar Actualización',
	// 			click: () => {
	// 				log.debug('--- Btn Actualizar, Buscando Actualización ---')
	// 				buscarActualizacion()
	// 			}
	// 		}
	// 	]
	// }
]));

	mainWindow.on('closed', () => {
		if (empleados_open == false) {
			app.quit();
		}
		mainWindow = null
		log.info('Main Window Cerrada'.magenta)
	});
}

//-------------------------------------------------- Login ----------------------------------------------------------//
let winlogin;

function login() {
	winlogin = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true //Habilita comunicacion entre index.js y main.js (ipc)
		},
		// frame: false,
		modal: true,
		show: false,
		width: 390,
		height: 560,
		icon: path.join(__dirname, '/assets/icons/png/LogoInstitucional.png')
	});

	winlogin.loadFile('html/login.html');
	
	// winlogin.webContents.openDevTools();				//Habilita herramientas de desarrollador
	
	winlogin.setMenuBarVisibility(false);
	
	winlogin.once('ready-to-show', () => {
		loginBool = [false, true] // No permite crear otra ventana de Login
		winlogin.show()
	});
	
	winlogin.on('closed', () => {
		winlogin = null
		loginBool = [true, false] // Permite crear otra ventana de Login
		log.info('Ventana de login cerrada')
	});
}

function closeLogin() {
	try {
		winlogin.close();
	} catch {
		log.silly('Ventana de login cerrada anteriormente ----> Proceso Catch [OK]')
	}
}

//-------------------------------------------------- Empleados Window ----------------------------------------------------------//

let empleadoswin;
var empleados_open = false;

function empleados() {
	empleadoswin = new BrowserWindow({
		// frame: false,
		webPreferences: {
			nodeIntegration: true
		},
		modal: true,
		show: false,
		width: 1500,
		height: 800,
		icon: path.join(__dirname, '/assets/icons/png/LogoInstitucional.png')
	});

	empleadoswin.loadFile('html/empleados.html');

	// empleadoswin.webContents.openDevTools();

	empleadoswin.setMenuBarVisibility(false);
	
	empleadoswin.once('ready-to-show', () => {
		empleados_open = true;
		empleadosBool = [false, true]; // Permite crear otra ventana de empleados
		empleadoswin.show();
		mainWindow.close();
	});

	empleadoswin.on('closed', () => {
		log.info('Ventana de Empleados cerrada');
		empleadosBool = [true, false]; // Permite crear otra ventana de empleados
		empleadoswin = null;
		empleados_open = false;
		app.relaunch();
	});
}


//-------------------------------------------------- Consulta Empleados Window ----------------------------------------------------------//

let conEmpleadoswin;

function conEmpleados() {
	conEmpleadoswin = new BrowserWindow({
		frame: false,
		parent: mainWindow,
		modal: true,
		show: false,
		width: 1500,
		height: 800,
		icon: path.join(__dirname, '/assets/icon/png/LogoInstitucional.png')
	});

	conEmpleadoswin.loadFile('html/consulta_emp.html');

	const menu = Menu.buildFromTemplate([{
		label: 'Menú',
		click: () => {
			//empleados()
			//conEmpleadoswin.hide()
		}
	}]);
	conEmpleadoswin.setMenu(menu);

	// conEmpleadoswin.webContents.openDevTools();
	
	conEmpleadoswin.once('ready-to-show', () => {
		conEmpleadoswin.show();
	});

	conEmpleadoswin.on('closed', () => {
		conEmpleadoswin = null;
	});
}

//-------------------------------------------------- Sucursales ----------------------------------------------------------//

let sucursaleswin;

function sucursales() {
	sucursaleswin = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true
		},
		modal: true,
		show: false,
		width: 1500,
		height: 800,
		icon: path.join(__dirname, '/assets/icon/png/LogoInstitucional.png')
	});
	
	sucursaleswin.loadURL('html/sucursales.html');

	let menu = Menu.buildFromTemplate([{
		label: 'Menú',
		click: () => {
			//Sucursaleswin.hide() 
		}
	}]);

	sucursaleswin.setMenu(menu);
	sucursaleswin.setMenuBarVisibility(false);
	sucursaleswin.once('ready-to-show', () => {
		sucursaleswin.show();
	});
}


//-------------------------------------------------- Empleados Admin ----------------------------------------------------------//
 
let empleadoswinAdmin;

function empleadosAdmin() {
	empleadoswinAdmin = new BrowserWindow({
		frame: false,
		webPreferences: {
			nodeIntegration: true
		},
		modal: true,
		show: false,
		width: 1500,
		height: 800,
		icon: path.join(__dirname, '/assets/icon/png/LogoInstitucional.png')
	});

	empleadoswinAdmin.loadFile('html/empleados.html');

	let menu = Menu.buildFromTemplate([{
		label: 'Menu Admin',
		submenu: [{
			label: 'Agregar Sucursales',
			click: () => {
				sucursales()
				//empleadoswin.hide()
			}
		}]
	}]);
	empleadoswinAdmin.setMenu(menu);
	
	empleadoswinAdmin.once('ready-to-show', () => {
		empleadoswinAdmin.show();
	});
}


// Crear archivos para que la app esté correctamente configurada
function createLog(){
	return new Promise((resolve, reject) => {
		const dt = dateTime.create();
		const hrReg = dt.format('m/d/y H:M');
		var data =  '--------------------------------------------------- LOG ---------------------------------------------------\n'.blue +
		'\nFecha de creación --> ' + hrReg.magenta + '\n' + '\n***** Espesificaciones del Ususario *****'.green +
		'\nHostname: '.yellow + String(os.hostname) +
		'\nUsername: '.yellow + String(os.userInfo().username) +
		'\nHomeDir: '.yellow + String(os.userInfo().homedir) +
		'\nPlatform: '.yellow + String(os.platform) +
		'\nRelease: '.yellow + String(os.release) +
		'\nArch: '.yellow + String(os.arch) +
		'\n******************************************'.green + '\n' + MessagePrompt_P.yellow + '\n' + MessagePrompt_F.blue + '\n';
		fs.writeFile(logFile, data, function (err) {
			if (err) log.error(String(err).red);
			log.transports.file.file = logFile;
			log.debug('Log creado: '.cyan + logFile.yellow);
			resolve('OK');
		});
	});
}

function getMacAndIp(){

	return new Promise((resolve, reject) => {
		var macwifi = false;
		Object.keys(ifaces).forEach(function (ifname) {
			ifaces[ifname].forEach(function (iface) {
				if ('IPv4' !== iface.family || iface.internal !== false) {
					// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
					return;
				}
				log.debug('-------------------------------------------------------------'.blue);
				// this interface has only one ipv4 adress
				
				if(macwifi == false){
					var matchEth = ifname.match(/Ethernet/g);
					var matchLAN = ifname.match(/Wi-Fi/g);
					
					if (matchLAN == null ){
						if (matchEth != null ) {
							var matchvEth = ifname.match(/vEthernet/g);
							if(matchvEth == null){
								iplocal = iface.address;
								log.debug('Intefaz:'.magenta, ifname);
								log.debug('IP Local:'.yellow, iplocal);
		
								if(String(iface.mac) == '00:09:0f:fe:00:01'){
									log.debug('Macaddres - Virtual VPN'.yellow, iface.mac);
								}else{
									mac = iface.mac;
									log.debug('MacAddress:'.yellow, mac);
								}
							}
						}
					}else{
						iplocal = iface.address;
						log.debug('Intefaz:'.magenta, ifname);
						log.debug('IP Local:'.yellow, iplocal);
		
						if(String(iface.mac) == '00:09:0f:fe:00:01'){
							log.debug('Macaddres - Virtual VPN'.yellow, iface.mac);
						}else{
							mac = iface.mac;
							log.debug('MacAddress:'.yellow, mac);
							macwifi == true;
						}
					}
				}
			});
		});
		log.debug('-------------------------------------------------------------'.magenta);
		resolve('- MacAddress obtenidas -');
	});
}

async function validateConfig(){
	log.debug('======================================================================================================================='.blue);

	if (!fs.existsSync(ConfigPATH)) {	// check main path config
		mkdirp(ConfigPATH);
		log.debug('Carpeta de configuracion: '.cyan + ConfigPATH.yellow);
	}

	log.debug('Revisando directorio main de configuracion de la app', ConfigPATH.yellow);

	if (!fs.existsSync(logFile)){
		log.debug('Creando log'.green);
		let stat = await createLog();
		log.debug('... Log habilitado c: ! ...'.magenta, stat,logFile.yellow, '\n');
	}else{
		const filestat = fs.statSync(logFile);
		const fileSizeInMb = filesize(filestat.size, {round: 0});
		let [size, label] = fileSizeInMb.split(' ');
		log.debug('Tamaño actual del log:'.magenta, fileSizeInMb);

		if(label == 'MB'){
			log.debug('Archivo Log en MB!');
			if(size > 30) {
				log.debug('Archivo de log muy grande'.red);
				fs.unlinkSync(logFile);
				createLog();
			}else{
				log.debug('Archivo de log menor a 30 Mb'.green);
			}
		}else{
			log.debug('Archivo Log en kB!'.green);
		}
		
		log.transports.file.file = logFile;
		log.debug('... Log habilitado c: ! ...'.magenta, logFile.yellow);
		log.debug('.');
		
		const dt = dateTime.create();
		const time = dt.format('m/d/y H:M');
		log.debug('======================================================================================================================='.blue);
		log.debug('======================================='.blue, 'Inicializando aplicacion'.yellow, time.green, '======================================='.blue);
	}

	const versionApp = app.getVersion();		
	log.debug("\n-> ".green, "Version de la app:".green, versionApp.magenta);
	log.debug('------------------------------------------------------------------'.grey);
	log.debug('Url PING:'.green, urlP.blue);
	log.debug('Url Serv:'.green, urlL.blue);
	
	if (!fs.existsSync(ConfigFilejs)){
		const data = "ping=" + urlP + ";server=" + urlL ;
		fs.writeFile(ConfigFilejs, data, function (err) {
			if (err) log.error(String(err).red)
			log.debug('Archivo de configuracion serv: '.cyan + ConfigFilejs.yellow);
		});
	}else{
		log.debug('Archivo de configuracion de coneccion: '.cyan + ConfigFilejs.yellow);
	}

	let statmac = await getMacAndIp();
	log.debug(statmac);

	if (fs.existsSync(UserFile)) {
		fs.unlinkSync(UserFile);
		log.debug('El archivo de usuario encontrado y borrado'.cyan + UserFile.yellow);
	} else {
		log.debug('El archivo de usuario no existe [OK] '.cyan + UserFile.yellow);
	}


	if (!fs.existsSync(ConfigFile)) {
			// CAMBIO URGENTE DE ESTA FUNCION
		macaddress.one(async function (err, mac) {
			log.debug('Macaddress, ', mac);
			const parametro = [{
				param: 'mac',
				value: String(mac)
			}];
			const timeout = 1000;
			const metodo = 'ObtenerConfig';
			const respuesta = await requestPOST(metodo, parametro, timeout);
			
			var encryconf;
			if (respuesta != 'null') {
				try {
					log.debug('Leyendo configuración obtenida del servidor'.green);
					let [idE, idS] = respuesta.split(',');
					let [x, empresaID] = idE.split(':');
					let [y, sucursalID] = idS.split(':');
		
					log.debug('...Cifrando configuracion...'.gray);
					encryconf = cry.encrypt(String(respuesta));
					log.debug('Configuracion encriptada: '.cyan, String(encryconf).green);
		
					if (!fs.existsSync(ConfigFile)) fs.writeFile(ConfigFile, encryconf, function (err) {
						if (err) log.error(String(err).red)
						log.debug('Archivo de configuracion Sucursal creado: '.cyan + ConfigFile.yellow);

						start();

					});
		
				} catch (e) {
					log.error(String(e).red + '\nError al obtener config'.red);
					log.debug('Archivo de configuracion NO Sucursal creado: '.cyan + ConfigFile.red);
				}
			}else{
				configWindow();
			}
		});

	} else {
		start();
	}
}



//----------------------------------------- IPC MAIN ------------------------------------//
ipcMain.on('ConfirmDialog', (event, message, details) => {
	const options = {
		type: 'question',
		buttons: ['Aceptar', 'Cancelar'],
		defaultId: 1,
		title: 'Control de asistencia',
		message: message,
		detail: details,
	}

	dialog.showMessageBox(null, options, (response) => {
		if (response == 0) {
			event.reply('confirm-dialog-response', 'acept')
		} else {
			event.reply('confirm-dialog-response', 'decline')
		}
	})
});
ipcMain.on('ConfirmDialog-Horario', (event, message, details) => {
	const options = {
		type: 'question',
		buttons: ['Aceptar', 'Cancelar'],
		defaultId: 1,
		title: 'Control de asistencia',
		message: message,
		detail: details,
	}

	dialog.showMessageBox(null, options, (response) => {
		if (response == 0) {
			event.reply('respuesta-dialog-horario', 'acept')
		} else {
			event.reply('respuesta-dialog-horario', 'decline')
		}
	})
});
ipcMain.on('entry-accepted', (event, arg) => {
	if (arg = 'ping') {

		if (empleadosBool[0] == true) {
			empleados();
			winlogin.close();
		}
		if (empleadosBool[1] == true) empleadoswin.focus()
	}
});
ipcMain.on('BackBtn', (event, arg) => {
	log.debug('Borrando configuracion del usuario')
	try {
		if (fs.existsSync(ConfigFile)) {
			fs.unlinkSync(UserFile)
		}
	} catch (e) {
		log.error(e)
	}
	app.relaunch();
	app.quit();

});
ipcMain.on('request-mainprocess-action', (event, arg) => {
	switch (arg) {
		case 'loading':
			loadinwindow()
			break
		case 'done':
			aboutWindow.hide()
			break
	}
});
ipcMain.on('Admin-css', (event, arg) => {
	switch (arg) {
		case '4vanc3#':
			winlogin.close()
			empleadosAdmin()
			break
	}
});
ipcMain.on('config', (event, arg) => {
	app.relaunch()
	app.quit()
});
ipcMain.on('statusSensor', (event, arg) => {
	log.debug('MAIN - sensor status');

	errorSensor(arg);

	// try {
	// 	if (fs.existsSync(ConfigFile)) {
	// 		fs.unlinkSync(UserFile)
	// 	}
	// } catch (e) {
	// 	log.error(e)
	// }
	// app.relaunch();
	// app.quit();
});
ipcMain.on('app_version', (event) => {
	log.debug('Checking for updates-------');
	autoUpdater.checkForUpdatesAndNotify();
	event.sender.send('app_version', {
		version: app.getVersion()
	});
});
ipcMain.on('restart_app', () => {
	autoUpdater.quitAndInstall();
});
ipcMain.on('login', (event, arg, user, credenciales) => {
	try{
		switch (arg){
			case 'acept':
				var cookie = { 
					name: user, 
					value: credenciales,    
					url: "http://login.com"
				}

				log.debug(cookie);
				session.defaultSession.cookies.set(cookie)
				.then(() => {
					log.debug("Cookies agregadas para la sesion");
					session.defaultSession.cookies.get({ url: 'http://login.com' })
						.then((cookies) => {
							log.debug('leyendo cookies de session')
							log.debug(cookies);
							createMainWindow();
							loginWin.close();
						}).catch((error) => {
							log.error(error);
					});
				}, (error) => {
					log.error("Error al agregar la cookie");
					log.error(error);
				});
				break;
			case 'goBack':
				log.warn('Reiniciando la aplicacion.'.yellow.bold);
				app.relaunch();
				app.quit();
				break;
			default:
				app.quit();
				break;
		}	
	}catch(err){
		log.error("Error al generar la cookie");
		log.error(err);
	}
});
ipcMain.on('credenciales', (event, arg) =>{
	try{
		session.defaultSession.cookies.get({ url: 'http://login.com' })
		.then((cookies) => {
			event.returnValue = cookies;
		}).catch((error) => {
			log.error(error);
		});
	} catch (err) {
		log.error(err);
	}
});

//----------------------------------- AUTOUPDATER SECCION -----------------------------------
// autoUpdater.setFeedURL({ provider: 'github'
// , owner: 'artxro'
// , repo: 'control_asistenciaPF'
// , token: '7fc6252bb510f7a36ecdfd77df0e10a81a96ebb8'
// , private: true });
autoUpdater.allowDowngrade = false;
autoUpdater.on('update-available', () => {
	mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
	mainWindow.webContents.send('update_downloaded');
});
function buscarActualizacion() {
	log.debug('Version:', app.getVersion());
	autoUpdater.checkForUpdatesAndNotify();
}

//----------------------------------- ERROR SECCION -----------------------------------
function errorConServer() {
	const options = {
		type: 'question',
		buttons: ['Reiniciar aplicación', 'Cerrar'],
		defaultId: 1,
		title: 'Control de acceso',
		message: 'No se pudo conectar con el servidor',
		detail: 'Favor de revisar su conexion a internet.',
	}
	dialog.showMessageBox(null, options, (response) => {
		if (response == 0) {
			app.relaunch()
			app.quit()
		} else {
			app.quit()
		}
	})
}

function errorConfig(details) {
	const options = {
		type: 'question',
		buttons: ['Reiniciar aplicación', 'Cerrar'],
		defaultId: 1,
		title: 'Control de Asistencia',
		message: 'Hubo un problema con la configuración de la aplicación',
		detail: details,
	}
	dialog.showMessageBox(null, options, (response) => {
		if (response == 0) {
			app.relaunch()
			app.quit()
		} else {
			app.quit()
		}
	})
}

function errorSensor(details) {
	const options = {
		type: 'question',
		buttons: ['Cerrar'],
		defaultId: 0,
		title: 'Control de Asistencia PF',
		message: 'Sensor Status',
		detail: details,
	}
	dialog.showMessageBox(null, options, (response) => {
		log.debug('Opcion Elegida:'.magenta, response);
	});
}


//----------------------------------------- App funtions escencials ------------------------------------//
app.on('ready', () => {
	validateConfig();
});
app.on('window-all-closed', () => {
	try {
		if (fs.existsSync(UserFile)) {
			fs.unlinkSync(UserFile)
		}
		if (fs.existsSync(ConfigFilejs)) {
			fs.unlinkSync(ConfigFilejs)
		}
	} catch (e) {
		log.info('#####################################\nNo se borraron los archivos'.red)
	}
	app.quit()
});

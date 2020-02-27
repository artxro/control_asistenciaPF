var status_captura = false;

var myVal = ""; // Drop down selected value of reader 
var disabled = true;

var count = 0;
var faltantes = 4;

const currentFormat = Fingerprint.SampleFormat.Compressed;

var FingerprintSdkDevice = (function () {
    function FingerprintSdkDevice() {
        log.info('FingerPrint device iniciado');
        var _instance = this;
        this.operationToRestart = null;
        this.acquisitionStarted = false;
        this.sdk = new Fingerprint.WebApi;
        this.sdk.onDeviceConnected = function (e) {
            // Detects if the deveice is connected for which acquisition started
            log.info("Scan your finger");
        };
        this.sdk.onDeviceDisconnected = function (e) {
            // Detects if device gets disconnected - provides deviceUid of disconnected device
            log.verbose("Device disconnected");
        };
        this.sdk.onCommunicationFailed = function (e) {
            // Detects if there is a failure in communicating with U.R.U web SDK
            log.info("Communinication Failed")
        };
        this.sdk.onSamplesAcquired = function (s) {
            // Sample acquired event triggers this function
                sampleAcquired(s);
        };
        this.sdk.onQualityReported = function (e) {
            // Quality of sample aquired - Function triggered on every sample acquired
                log.info(Fingerprint.QualityCode[(e.quality)]);
        }

    }

    FingerprintSdkDevice.prototype.startCapture = function () {
        if (this.acquisitionStarted) // Monitoring if already started capturing
            return;
        var _instance = this;
        this.operationToRestart = this.startCapture;
        this.sdk.startAcquisition(currentFormat, myVal).then(function () {
            _instance.acquisitionStarted = true;

            //Disabling start once started

        }, function (error) {
            log.info(error.message);
        });
    };
    FingerprintSdkDevice.prototype.stopCapture = function () {
        if (!this.acquisitionStarted) //Monitor if already stopped capturing
            return;
        var _instance = this;
        this.sdk.stopAcquisition().then(function () {
            _instance.acquisitionStarted = false;

            //Disabling stop once stoped

        }, function (error) {
            log.info(error.message);
        });
    };

    FingerprintSdkDevice.prototype.getInfo = function () {
        var _instance = this;
        return this.sdk.enumerateDevices();
    };

    FingerprintSdkDevice.prototype.getDeviceInfoWithID = function (uid) {
        var _instance = this;
        log.info('uid: ' + uid)
        log.info('xcs: ' + this.sdk.getDeviceInfo(uid))
        return  this.sdk.getDeviceInfo(uid);
    };

    
    return FingerprintSdkDevice;
})();


//------------------ Obtencion de Sample to WSQ --------------------------------
function sampleAcquired(s){
    try{
        if(currentFormat == Fingerprint.SampleFormat.Compressed){  
            const samples = JSON.parse(s.samples);
            const sampleData = Fingerprint.b64UrlTo64(samples[0].Data);
            const decodedData = JSON.parse(Fingerprint.b64UrlToUtf8(sampleData));
            const huella = Fingerprint.b64UrlTo64(decodedData.Data);

            log.debug('Huella Obtenida');

            if(enrollment == true){
                faltantes -= 1;
                if(count == 3){
                    huellas_wsq["4"].Huella = huella;                    
                    log.debug(JSON.stringify(huellas_wsq).cyan + '\nHuellas obtenidas: ' + count );

                    onStop();
                    status_huella = true
                    // Huella obtenida
                    $("#btnHuella").html('Huella Agregada <i class="fas fa-fingerprint"></i>');
                    $('#btnHuella').css({color: '#DFF7F8', 'background-color': '#00AEB7'});
                    $('#message-info').hide();
                }else{ 
                    count += 1;
                    switch(count){
                        case 1:
                            huellas_wsq["1"].Huella = huella;
                            break;
                        case 2:
                                huellas_wsq["2"].Huella = huella;
                                break;
                        case 3:
                            huellas_wsq["3"].Huella = huella;
                            break;
                        }
                    log.debug(JSON.stringify(huellas_wsq).yellow + '\nHuellas obtenidas: ' + count );
                    $('#message-info').html("Coloque<strong> " + faltantes +" veces </strong>el dedo sobre el sensor de huellas 👆")
                }
                log.debug('Tipo de adquicision: ' + enrollment);
            }else{
                onStop();
                validarHuella(huella);
            }
        }
        else{
            alert("Format Error");
        }  
    }catch(e){
        log.error(String(e).red);
    }
}
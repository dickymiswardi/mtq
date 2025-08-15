//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;
var recorder;
var input;
var encodingType;
var encodeAfterRecord = true;
var audioContext;

// ===== Variabel dari overlay =====
var currentIdSiswa = window.currentIdSiswa || null; // harus diset dari overlay
var markData = window.markData || {}; 

var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    console.log("startRecording() called");

    var constraints = { audio: true, video:false }

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        __log("getUserMedia() success, stream created, initializing WebAudioRecorder...");
        audioContext = new AudioContext();
        document.getElementById("formats").innerHTML="Format: 2 channel "+encodingTypeSelect.value+" @ "+audioContext.sampleRate/1000+"kHz"

        gumStream = stream;
        input = audioContext.createMediaStreamSource(stream);
        encodingType = encodingTypeSelect.value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/",
            encoding: encodingType,
            numChannels:2,
            onEncoderLoading: function(rec, enc) { __log("Loading "+enc+" encoder..."); },
            onEncoderLoaded: function(rec, enc) { __log(enc+" encoder loaded"); }
        });

        recorder.onComplete = async function(rec, blob) { 
            __log("Encoding complete");
            createDownloadLink(blob, rec.encoding);

            // === Upload ke server ===
            if(currentIdSiswa) {
                const formData = new FormData();
                formData.append('file', blob, `${currentIdSiswa}_${Date.now()}.${rec.encoding}`);

                try {
                    const res = await fetch('/.netlify/functions/simpan-audio', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await res.json();
                    if(result.url) {
                        if(!markData.audio) markData.audio = {};
                        markData.audio.url = result.url;
                        markData.audio.tanggal = new Date().toISOString();
                        __log("Audio tersimpan di markData: " + result.url);
                    } else {
                        console.error("Server tidak mengembalikan URL audio");
                    }
                } catch(err) {
                    console.error("Gagal upload audio:", err);
                }
            }

            encodingTypeSelect.disabled = false;
        }

        recorder.setOptions({
            timeLimit:120,
            encodeAfterRecord:encodeAfterRecord,
            ogg: {quality: 0.5},
            mp3: {bitRate: 160}
        });

        recorder.startRecording();
        __log("Recording started");
    }).catch(function(err) {
        recordButton.disabled = false;
        stopButton.disabled = true;
        alert("Gagal mengakses mikrofon: " + err);
    });

    recordButton.disabled = true;
    stopButton.disabled = false;
}

function stopRecording() {
    console.log("stopRecording() called");
    gumStream.getAudioTracks()[0].stop();
    stopButton.disabled = true;
    recordButton.disabled = false;
    recorder.finishRecording();
    __log('Recording stopped');
}

function createDownloadLink(blob, encoding) {
    var url = URL.createObjectURL(blob);
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    au.controls = true;
    au.src = url;

    link.href = url;
    link.download = new Date().toISOString() + '.'+encoding;
    link.innerHTML = link.download;

    li.appendChild(au);
    li.appendChild(link);

    document.getElementById("recordingsList").appendChild(li);
}

function __log(e, data) {
    document.getElementById("log").innerHTML += "\n" + e + " " + (data || '');
}

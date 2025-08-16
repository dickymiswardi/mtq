//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                         // stream from getUserMedia()
var recorder;                          // WebAudioRecorder object
var input;                             // MediaStreamAudioSourceNode we'll be recording
var encodingType;                      // holds selected encoding for resulting audio (file)
var encodeAfterRecord = true;          // when to encode

// shim for AudioContext when it's not available
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext;                      // new audio context to help us record

var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

// add events to buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    console.log("startRecording() called");

    var constraints = { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        __log("getUserMedia() success, stream created, initializing WebAudioRecorder...");

        audioContext = new AudioContext();

        // update format info
        document.getElementById("formats").innerHTML =
            "Format: 2 channel " + encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value +
            " @ " + audioContext.sampleRate / 1000 + "kHz";

        gumStream = stream;
        input = audioContext.createMediaStreamSource(stream);
        // input.connect(audioContext.destination) // jangan di-uncomment, kalau mau monitoring

        encodingType = encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/", // must end with slash
            encoding: encodingType,
            numChannels: 2, // mp3 hanya support 2
            onEncoderLoading: function(recorder, encoding) {
                __log("Loading " + encoding + " encoder...");
            },
            onEncoderLoaded: function(recorder, encoding) {
                __log(encoding + " encoder loaded");
            }
        });

        recorder.onComplete = function(recorder, blob) {
            __log("Encoding complete");
            createDownloadLink(blob, recorder.encoding); // versi upload + preview
            encodingTypeSelect.disabled = false;
        };

        // =====================
        // PENTING! JANGAN DIHAPUS
        // =====================
        recorder.setOptions({
            timeLimit: 86400,
            encodeAfterRecord: encodeAfterRecord,
            ogg: { quality: 1.0 },
            mp3: { bitRate: 192 }
        });

        recorder.startRecording();
        __log("Recording started");

    }).catch(function(err) {
        recordButton.disabled = false;
        stopButton.disabled = true;
        console.error(err);
        alert("Gagal mengakses microphone: " + err.message);
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

// ===== Versi final createDownloadLink: preview lokal + upload =====
function createDownloadLink(blob, encoding) {
    // buat URL blob untuk preview lokal
    var url = URL.createObjectURL(blob);

    // simpan sementara di markData
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

    // buat elemen audio + link lokal
    var au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    var link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerHTML = tempFileName;

    var li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    recordingsList.appendChild(li);

    // ===== Upload ke GitHub /audio via Netlify Function =====
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Data = reader.result.split(',')[1]; // hapus prefix data:audio/xxx;base64
        try {
            const res = await fetch('/.netlify/functions/upload-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: tempFileName,
                    base64: base64Data
                })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Gagal upload audio');

            // update markData dengan nama file final di repo
            markData.audio[markData.audio.length - 1] = result.fileName || tempFileName;

            __log(`Recording selesai dan di-upload: ${result.fileName || tempFileName}`);
        } catch (err) {
            alert('⚠️ Gagal upload audio: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsDataURL(blob);

    // update nilai di tabel jika siswa aktif
    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal): ${tempFileName}`);
}

// ===== Helper log =====
function __log(e, data) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.innerHTML += "\n" + e + " " + (data || '');
}

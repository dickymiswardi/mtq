//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                         // stream from getUserMedia()
var recorder;                          // WebAudioRecorder object
var input;                             // MediaStreamAudioSourceNode
var encodingType;                      // holds selected encoding for resulting audio
var encodeAfterRecord = true;          // encode after record

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

        encodingType = encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/", // must end with slash
            encoding: encodingType,
            numChannels: 2,
            onEncoderLoading: function(recorder, encoding) {
                __log("Loading " + encoding + " encoder...");
            },
            onEncoderLoaded: function(recorder, encoding) {
                __log(encoding + " encoder loaded");
            }
        });

        recorder.onComplete = function(recorder, blob) {
            __log("Encoding complete");
            createDownloadLink(blob, recorder.encoding); // preview + tombol upload
            encodingTypeSelect.disabled = false;
        };

        recorder.setOptions({
            timeLimit: 86400,  // durasi 24 jam
            encodeAfterRecord: encodeAfterRecord,
            ogg: { quality: 1.0 },
            mp3: { bitRate: 128 }
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

function createDownloadLink(blob, encoding) {
    const url = URL.createObjectURL(blob);
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

    // preview audio
    const au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    // link download lokal
    const link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerText = tempFileName;

    // status upload
    const statusEl = document.createElement('span');
    statusEl.style.marginLeft = "10px";
    statusEl.style.fontStyle = "italic";
    statusEl.style.color = "#007bff";
    statusEl.innerText = "Uploading...";

    // tombol Upload Ulang (sembunyi awalnya)
    const retryBtn = document.createElement('button');
    retryBtn.innerText = "Upload Ulang";
    retryBtn.style.marginLeft = "10px";
    retryBtn.style.display = "none";
    retryBtn.className = "stop-btn";

    const li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    li.appendChild(statusEl);
    li.appendChild(retryBtn);
    recordingsList.appendChild(li);

    // fungsi upload
    async function uploadAudio() {
        statusEl.innerText = "Uploading...";
        statusEl.style.color = "#007bff";
        retryBtn.style.display = "none";

        try {
            const reader = new FileReader();
            reader.onloadend = async function() {
                const base64Data = reader.result.split(',')[1];
                const res = await fetch('/.netlify/functions/upload-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: tempFileName, base64: base64Data })
                });
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'Gagal upload audio');

                markData.audio[markData.audio.length-1] = result.path || tempFileName;
                statusEl.innerText = "Upload ✅";
                statusEl.style.color = "green";
                __log(`Recording selesai dan di-upload: ${result.path || tempFileName}`);
            };
            reader.readAsDataURL(blob);
        } catch(err) {
            console.error(err);
            statusEl.innerText = "Upload ❌";
            statusEl.style.color = "red";
            retryBtn.style.display = "inline-block";
            alert('⚠️ Gagal upload audio: ' + err.message);
        }
    }

    // upload otomatis pertama kali
    uploadAudio();

    // tombol Upload Ulang
    retryBtn.addEventListener('click', uploadAudio);

    // update nilai jika siswa aktif
    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal & upload otomatis): ${tempFileName}`);
}

// ===== Helper log =====
function __log(e, data) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.innerHTML += "\n" + e + " " + (data || '');
}

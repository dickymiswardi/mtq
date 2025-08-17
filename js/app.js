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

    const statusEl = document.createElement('span');
    statusEl.style.marginLeft = "10px";
    statusEl.style.fontStyle = "italic";
    statusEl.style.color = "#007bff";
    statusEl.innerText = "Uploading...";

    // progress bar
    const progress = document.createElement('progress');
    progress.max = 100;
    progress.value = 0;
    progress.style.marginLeft = "10px";

    // tombol Upload Ulang
    const retryBtn = document.createElement('button');
    retryBtn.innerText = "Upload Ulang";
    retryBtn.style.marginLeft = "10px";
    retryBtn.style.display = "none";
    retryBtn.className = "stop-btn";

    const li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(statusEl);
    li.appendChild(progress);
    li.appendChild(retryBtn);
    recordingsList.appendChild(li);

    // fungsi upload dengan chunk
    async function uploadAudio() {
        statusEl.innerText = "Uploading...";
        statusEl.style.color = "#007bff";
        retryBtn.style.display = "none";
        progress.value = 0;

        try {
            const chunkSize = 5 * 1024 * 1024; // 5MB
            const totalChunks = Math.ceil(blob.size / chunkSize);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = blob.slice(i * chunkSize, (i + 1) * chunkSize);
                const arrayBuffer = await chunk.arrayBuffer();
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

                const res = await fetch('/.netlify/functions/upload-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: tempFileName,
                        base64: base64Data,
                        chunkIndex: i,
                        totalChunks
                    })
                });

                if (!res.ok) throw new Error(`Chunk ${i + 1} gagal dikirim`);
                progress.value = ((i + 1) / totalChunks) * 100;
            }

            statusEl.innerText = "Upload ✅";
            statusEl.style.color = "green";
            __log(`Recording selesai dan di-upload: ${tempFileName}`);
        } catch (err) {
            console.error(err);
            statusEl.innerText = "Upload ❌";
            statusEl.style.color = "red";
            retryBtn.style.display = "inline-block";
            alert('⚠️ Gagal upload audio: ' + err.message);
        }
    }

    // upload otomatis pertama kali
    uploadAudio();

    // retry manual
    retryBtn.addEventListener('click', uploadAudio);

    __log(`Recording selesai (preview lokal & upload otomatis): ${tempFileName}`);
}

// ===== Helper log =====
function __log(e, data) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.innerHTML += "\n" + e + " " + (data || '');
}

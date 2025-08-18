URL = window.URL || window.webkitURL;

let gumStream, recorder, input, encodingType;
let encodeAfterRecord = true;
let audioContext;
let markData = { audio: [] };
let currentIdSiswa = null;

const encodingTypeSelect = document.getElementById("encodingTypeSelect");
const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const recordingsList = document.getElementById("recordingsList");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    recordButton.disabled = true;
    stopButton.disabled = false;

    const constraints = { audio: true, video: false };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            audioContext = new AudioContext();
            document.getElementById("formats").innerHTML =
                "Format: 2 channel " + encodingTypeSelect.value +
                " @ " + (audioContext.sampleRate / 1000) + "kHz";

            gumStream = stream;
            input = audioContext.createMediaStreamSource(stream);
            encodingType = encodingTypeSelect.value;
            encodingTypeSelect.disabled = true;

            recorder = new WebAudioRecorder(input, {
                workerDir: "js/",
                encoding: encodingType,
                numChannels: 2,
                onEncoderLoading: (rec, enc) => __log("Loading " + enc + " encoder..."),
                onEncoderLoaded: (rec, enc) => __log(enc + " encoder loaded")
            });

            recorder.onComplete = function(rec, blob) {
                __log("Encoding complete");
                createDownloadLink(blob, rec.encoding);
                encodingTypeSelect.disabled = false;
            };

            recorder.setOptions({
                timeLimit: 86400,
                encodeAfterRecord: encodeAfterRecord,
                ogg: { quality: 1.0 },
                mp3: { bitRate: 128 }
            });

            recorder.startRecording();
            __log("Recording started");
        })
        .catch(err => {
            recordButton.disabled = false;
            stopButton.disabled = true;
            alert("Gagal mengakses microphone: " + err.message);
        });
}

function stopRecording() {
    gumStream.getAudioTracks()[0].stop();
    stopButton.disabled = true;
    recordButton.disabled = false;
    recorder.finishRecording();
    __log('Recording stopped');
}

function createDownloadLink(blob, encoding) {
    const url = URL.createObjectURL(blob);
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

    const au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    const link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerHTML = tempFileName;

    const statusEl = document.createElement('span');
    statusEl.style.marginLeft = "10px";
    statusEl.style.fontStyle = "italic";
    statusEl.style.color = "#007bff";
    statusEl.innerText = "Uploading...";

    const li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    li.appendChild(statusEl);
    recordingsList.appendChild(li);

    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Data = reader.result.split(',')[1];
        try {
            const res = await fetch('/.netlify/functions/upload-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: tempFileName, base64: base64Data })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Gagal upload audio');

            markData.audio[markData.audio.length - 1] = result.path || tempFileName;
            statusEl.innerText = "Upload ✅";
            statusEl.style.color = "green";
            __log(`Recording selesai dan di-upload: ${result.path || tempFileName}`);
        } catch (err) {
            statusEl.innerText = "Upload ❌";
            statusEl.style.color = "red";
            alert('⚠️ Gagal upload audio: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsDataURL(blob);
}

function __log(msg, data) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.innerHTML += "\n" + msg + (data || '');
}

// ============ Variabel global ============
URL = window.URL || window.webkitURL;
var gumStream; 
var recorder; 
var input; 
var encodingType;  
var encodeAfterRecord = true;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext;
var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var recordingsList = document.getElementById("recordingsList");
var markData = {};
var currentIdSiswa = null;

// ============ Event Tombol ============
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

// ============ Fungsi Rekam ============
function startRecording() {
    console.log("startRecording() called");
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
        audioContext = new AudioContext();

        gumStream = stream;
        input = audioContext.createMediaStreamSource(stream);

        encodingType = encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/",
            encoding: encodingType,
            numChannels: 2,
            onEncoderLoading: function(recorder, encoding) { __log("Loading " + encoding + " encoder..."); },
            onEncoderLoaded: function(recorder, encoding) { __log(encoding + " encoder loaded"); }
        });

        recorder.onComplete = function(rec, blob) {
            __log("Encoding complete");
            createDownloadLink(blob, rec.encoding);
            encodingTypeSelect.disabled = false;
        };

        recorder.setOptions({
            timeLimit: 86400,  // 24 jam
            encodeAfterRecord: encodeAfterRecord,
            ogg: { quality: 1.0 },
            mp3: { bitRate: 128 }
        });

        recorder.startRecording();
        __log("Recording started");

    }).catch(function(err) {
        console.error(err);
        alert("Gagal akses mic: " + err.message);
        recordButton.disabled = false;
        stopButton.disabled = true;
    });

    recordButton.disabled = true;
    stopButton.disabled = false;
}

function stopRecording() {
    console.log("stopRecording() called");
    if (gumStream) gumStream.getAudioTracks()[0].stop();
    stopButton.disabled = true;
    recordButton.disabled = false;
    if (recorder) recorder.finishRecording();
    __log('Recording stopped');
}

// ============ Fungsi Upload ============
function createDownloadLink(blob, encoding) {
    var url = URL.createObjectURL(blob);
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

    // UI overlay list
    var au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    var link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerHTML = tempFileName;

    var statusEl = document.createElement('span');
    statusEl.style.marginLeft = "10px";
    statusEl.style.fontStyle = "italic";
    statusEl.style.color = "#007bff";
    statusEl.innerText = "Uploading...";

    var li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    li.appendChild(statusEl);
    recordingsList.appendChild(li);

    // ==== Upload langsung ke GitHub ====
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Data = reader.result.split(',')[1];
        try {
            const GITHUB_TOKEN = "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"; // ⚠️ rawan bocor
            const owner = "dickymiswardi";
            const repo = "usermtq";
            const branch = "main";
            const folder = "audio";
            const path = `${folder}/${tempFileName}`;
            const urlGitHub = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

            // cek file sudah ada belum
            let sha = null;
            try {
                const checkRes = await fetch(urlGitHub, {
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github.v3+json"
                    }
                });
                if (checkRes.ok) {
                    const json = await checkRes.json();
                    sha = json.sha;
                }
            } catch (e) { /* ignore */ }

            // upload
            const uploadRes = await fetch(urlGitHub, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json",
                    Accept: "application/vnd.github.v3+json",
                },
                body: JSON.stringify({
                    message: sha ? `Update audio file: ${tempFileName}` 
                                 : `Add new audio file: ${tempFileName}`,
                    content: base64Data,
                    sha: sha || undefined,
                    branch
                }),
            });

            const result = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(result.message || 'Gagal upload');

            markData.audio[markData.audio.length - 1] = path;
            statusEl.innerText = "Upload ✅";
            statusEl.style.color = "green";

            __log(`Recording selesai dan di-upload ke GitHub: ${path}`);
        } catch (err) {
            statusEl.innerText = "Upload ❌";
            statusEl.style.color = "red";
            console.error(err);
            alert("⚠️ Gagal upload audio: " + err.message);
        }
    };
    reader.readAsDataURL(blob);
}

// helper log
function __log(e, data) {
    const logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.innerHTML += "\n" + e + " " + (data || '');
}

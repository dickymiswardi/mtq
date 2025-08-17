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

// helper aman untuk konversi ke base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000; // proses per 32KB
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function createDownloadLink(blob, encoding) {
    var url = URL.createObjectURL(blob);
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

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

    // === langsung upload ke GitHub API ===
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Data = reader.result.split(',')[1];
        try {
            const GITHUB_TOKEN = "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"; // ⚠️ Bocor kalau taruh di frontend
            const owner = "dickymiswardi";
            const repo = "usermtq";
            const branch = "main";
            const folder = "audio";
            const path = `${folder}/${tempFileName}`;
            const urlGitHub = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

            // cek apakah file sudah ada
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
            } catch(e) {
                // kalau file belum ada, lanjut
            }

            // upload / update
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
            alert('⚠️ Gagal upload audio: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsDataURL(blob);

    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal & upload langsung GitHub): ${tempFileName}`);
}

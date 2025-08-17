URL = window.URL || window.webkitURL;

let gumStream;
let recorder;
let input;
let encodingType;
let encodeAfterRecord = true;
let audioContext;

const encodingTypeSelect = document.getElementById("encodingTypeSelect");
const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    console.log("startRecording() called");

    const constraints = { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            __log("getUserMedia() success, initializing recorder...");

            audioContext = new AudioContext();
            gumStream = stream;
            input = audioContext.createMediaStreamSource(stream);

            encodingType = encodingTypeSelect.value;
            encodingTypeSelect.disabled = true;

            recorder = new WebAudioRecorder(input, {
                workerDir: "js/",
                encoding: encodingType,
                numChannels: 2,
                onEncoderLoading: function(rec, enc) {
                    __log("Loading " + enc + " encoder...");
                },
                onEncoderLoaded: function(rec, enc) {
                    __log(enc + " encoder loaded");
                }
            });

            recorder.onComplete = function(rec, blob) {
                __log("Encoding complete");
                createDownloadLink(blob, rec.encoding); // PRODUCE audio
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

            recordButton.disabled = true;
            stopButton.disabled = false;
        })
        .catch(function(err) {
            recordButton.disabled = false;
            stopButton.disabled = true;
            console.error(err);
            alert("Gagal mengakses microphone: " + err.message);
        });
}

function stopRecording() {
    console.log("stopRecording() called");
    if (!gumStream) return;

    gumStream.getAudioTracks().forEach(track => track.stop());
    stopButton.disabled = true;
    recordButton.disabled = false;

    if (recorder) {
        recorder.finishRecording(); // akan memanggil onComplete secara async
        __log("Recording stopped, encoding in progress...");
    }
}

function createDownloadLink(blob, encoding) {
    var url = URL.createObjectURL(blob);
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.' + encoding;
    markData.audio.push(tempFileName);

    // preview audio
    var au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    // link download lokal
    var link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerHTML = tempFileName;

    // status upload
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

    // Upload via Netlify Function
    const reader = new FileReader();
    reader.onloadend = async function() {
        const base64Data = reader.result.split(',')[1];
        try {
            const res = await fetch('/.netlify/functions/upload-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: tempFileName, base64: base64Data })
            });

            let result;
            try { result = await res.json(); } 
            catch { 
                const text = await res.text();
                throw new Error(`Server tidak merespon JSON: ${text}`);
            }

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

    // update nilai jika siswa aktif
    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal & upload otomatis): ${tempFileName}`);
}


// helper log
function __log(e, data) {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    logEl.innerHTML += "\n" + e + " " + (data || "");
}

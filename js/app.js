URL = window.URL || window.webkitURL;

var gumStream, recorder, input, audioContext;
var encodingType, encodeAfterRecord = true;

var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var recordingsList = document.getElementById("recordingsList");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    recordButton.disabled = true;
    stopButton.disabled = false;
    recordButton.classList.add("blink"); // tombol kedip

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
        gumStream = stream;
        audioContext = new AudioContext();
        input = audioContext.createMediaStreamSource(stream);

        encodingType = encodingTypeSelect.value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/",
            encoding: encodingType,
            numChannels: 2,
            onEncoderLoading: function() {},
            onEncoderLoaded: function() {}
        });

        recorder.setOptions({
            timeLimit: 86400,
            encodeAfterRecord: encodeAfterRecord,
            ogg: { quality: 1.0 },
            mp3: { bitRate: 320 }
        });

        recorder.onComplete = function(rec, blob) {
            createDownloadLink(blob, rec.encoding);
            encodingTypeSelect.disabled = false;
        };

        recorder.startRecording();
    })
    .catch(err => {
        alert("Gagal mengakses microphone: " + err.message);
        recordButton.disabled = false;
        stopButton.disabled = true;
        recordButton.classList.remove("blink");
    });
}

function stopRecording() {
    if (!gumStream || !recorder) return;

    // hentikan tracks mic
    gumStream.getAudioTracks().forEach(track => track.stop());
    gumStream = null;

    stopButton.disabled = true;
    recordButton.disabled = false;
    recordButton.classList.remove("blink"); // hentikan kedip

    // finish recording (memicu onComplete)
    recorder.finishRecording();
    recorder = null;

    // jangan close audioContext dulu, biarkan WebAudioRecorder yang handle
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

    var li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
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
            markData.audio[markData.audio.length-1] = result.fileName || tempFileName;
        } catch(err) {
            alert('⚠️ Gagal upload audio: ' + err.message);
        }
    };
    reader.readAsDataURL(blob);

    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }
}

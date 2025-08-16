//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream, recorder, input, audioContext;
var encodingType, encodeAfterRecord = true;

var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var recordingIndicator = document.getElementById("recordingIndicator");
var recordingsList = document.getElementById("recordingsList");

// add events to buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    recordButton.disabled = true;
    stopButton.disabled = false;

    // tampilkan indikator kedap-kedip
    recordingIndicator.style.display = "inline-block";

    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        audioContext = new AudioContext();
        gumStream = stream;
        input = audioContext.createMediaStreamSource(stream);

        encodingType = encodingTypeSelect.value;
        encodingTypeSelect.disabled = true;

        recorder = new WebAudioRecorder(input, {
            workerDir: "js/",
            encoding: encodingType,
            numChannels: 2,
            onEncoderLoading: function(rec, enc){},
            onEncoderLoaded: function(rec, enc){}
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
    }).catch(err => {
        recordButton.disabled = false;
        stopButton.disabled = true;
        alert("Gagal mengakses microphone: " + err.message);
        recordingIndicator.style.display = "none";
    });
}

function stopRecording() {
    if (gumStream) {
        gumStream.getAudioTracks().forEach(track => track.stop());
        gumStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (recorder) {
        recorder.finishRecording();
        recorder = null;
    }

    recordButton.disabled = false;
    stopButton.disabled = true;

    // sembunyikan indikator
    recordingIndicator.style.display = "none";
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

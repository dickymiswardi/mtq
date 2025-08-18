//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;
var recorder;
var input;
var encodingType;
var encodeAfterRecord = true;
var audioContext;
var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

const THRESHOLD = 0.02;         // level suara minimal
const SILENCE_TIMEOUT = 1500;   // ms diam sebelum stop
const CHUNK_DURATION = 3*60*1000; // 3 menit
let recording = false;
let silenceTimer = null;
let chunkTimer = null;

function startRecording() {
    console.log("startRecording() called");
    var constraints = { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        __log("getUserMedia() success, stream created, initializing WebAudioRecorder...");

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        document.getElementById("formats").innerHTML =
            "Format: 2 channel " + encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value +
            " @ " + audioContext.sampleRate / 1000 + "kHz";

        gumStream = stream;
        input = audioContext.createMediaStreamSource(stream);

        encodingType = encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value;
        encodingTypeSelect.disabled = true;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        input.connect(analyser);
        const dataArray = new Float32Array(analyser.fftSize);

        function checkVolume() {
            analyser.getFloatTimeDomainData(dataArray);
            let sum=0;
            for(let i=0;i<dataArray.length;i++) sum+=dataArray[i]*dataArray[i];
            let rms = Math.sqrt(sum/dataArray.length);

            if(rms>THRESHOLD && !recording) startRecorder();
            else if(rms<=THRESHOLD && recording && !silenceTimer)
                silenceTimer = setTimeout(stopRecorder, SILENCE_TIMEOUT);
            else if(rms>THRESHOLD && silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer=null;
            }

            requestAnimationFrame(checkVolume);
        }

        checkVolume();

    }).catch(function(err) {
        recordButton.disabled = false;
        stopButton.disabled = true;
        console.error(err);
        alert("Gagal mengakses microphone: " + err.message);
    });

    recordButton.disabled = true;
    stopButton.disabled = false;
}

function startRecorder() {
    recording = true;
    silenceTimer = null;

    recorder = new WebAudioRecorder(input, {
        workerDir: "js/",
        encoding: encodingType,
        numChannels: 2,
        onEncoderLoading: function(rec, enc) { __log("Loading " + enc + " encoder..."); },
        onEncoderLoaded: function(rec, enc) { __log(enc + " encoder loaded"); }
    });

    recorder.setOptions({
        timeLimit: 86400,
        encodeAfterRecord: encodeAfterRecord,
        ogg: { quality: 1.0 },
        mp3: { bitRate: 128 }
    });

    recorder.onComplete = function(rec, blob) {
        __log("Encoding complete");
        createDownloadLink(blob, rec.encoding);
        if(recording) startRecorder(); // split baru kalau masih recording
    };

    recorder.startRecording();
    __log("Recording started");

    // chunk timer setiap 3 menit
    chunkTimer = setTimeout(()=> {
        if(recording) {
            __log("3 menit tercapai, membuat file baru...");
            recorder.finishRecording();
        }
    }, CHUNK_DURATION);
}

function stopRecorder() {
    if(!recording) return;
    recording = false;
    if(chunkTimer){ clearTimeout(chunkTimer); chunkTimer=null; }
    recorder.finishRecording();
    __log('Recording stopped');
    stopButton.disabled = true;
    recordButton.disabled = false;
}

function createDownloadLink(blob, encoding) {
    var url = URL.createObjectURL(blob);
    if(!markData.audio) markData.audio=[];
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
    statusEl.style.marginLeft="10px";
    statusEl.style.fontStyle="italic";
    statusEl.style.color="#007bff";
    statusEl.innerText="Uploading...";

    var li=document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    li.appendChild(statusEl);
    recordingsList.appendChild(li);

    const reader = new FileReader();
    reader.onloadend = async function(){
        const base64Data = reader.result.split(',')[1];
        try {
            const res = await fetch('/.netlify/functions/upload-audio', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({fileName: tempFileName, base64: base64Data})
            });
            const result = await res.json();
            if(!result.success) throw new Error(result.error||'Gagal upload audio');
            markData.audio[markData.audio.length-1]=result.path||tempFileName;
            statusEl.innerText="Upload ✅";
            statusEl.style.color="green";
            __log(`Recording selesai dan di-upload: ${result.path||tempFileName}`);
        } catch(err){
            statusEl.innerText="Upload ❌";
            statusEl.style.color="red";
            alert('⚠️ Gagal upload audio: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsDataURL(blob);

    if(currentIdSiswa){
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal & upload otomatis): ${tempFileName}`);
}

function __log(e, data){
    const logEl=document.getElementById('log');
    if(!logEl) return;
    logEl.innerHTML += "\n"+e+" "+(data||'');
}

function createDownloadLink(blob, encoding) {
    const url = URL.createObjectURL(blob);
    if (!markData.audio) markData.audio = [];
    const tempFileName = new Date().toISOString() + '.mp3'; // konversi ke mp3 otomatis
    markData.audio.push(tempFileName);

    // elemen preview
    const au = document.createElement('audio');
    au.controls = true;
    au.src = url;

    const link = document.createElement('a');
    link.href = url;
    link.download = tempFileName;
    link.innerText = tempFileName;

    const statusEl = document.createElement('span');
    statusEl.style.marginLeft = "10px";
    statusEl.style.fontStyle = "italic";
    statusEl.style.color = "#007bff";
    statusEl.innerText = "Uploading...";

    const retryBtn = document.createElement('button');
    retryBtn.innerText = "Upload Ulang";
    retryBtn.style.marginLeft = "10px";
    retryBtn.style.display = "none"; // awalnya disembunyikan

    const li = document.createElement('li');
    li.appendChild(au);
    li.appendChild(link);
    li.appendChild(statusEl);
    li.appendChild(retryBtn);
    recordingsList.appendChild(li);

    // Fungsi upload chunked
    const upload = async () => {
        statusEl.innerText = "Uploading...";
        statusEl.style.color = "#007bff";
        retryBtn.style.display = "none";

        try {
            // Convert blob → ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();
            const chunkSize = 5 * 1024 * 1024; // 5MB per chunk
            const chunks = [];
            for (let i = 0; i < arrayBuffer.byteLength; i += chunkSize) {
                chunks.push(arrayBuffer.slice(i, i + chunkSize));
            }

            let base64Chunks = [];
            for (let c of chunks) {
                const chunkBlob = new Blob([c]);
                const chunkBase64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(chunkBlob);
                });
                base64Chunks.push(chunkBase64);
            }

            // Kirim chunk satu per satu
            for (let i = 0; i < base64Chunks.length; i++) {
                const res = await fetch('/.netlify/functions/upload-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: tempFileName,
                        base64: base64Chunks[i],
                        chunkIndex: i,
                        totalChunks: base64Chunks.length
                    })
                });
                const text = await res.text();
                let result;
                try { result = JSON.parse(text); } 
                catch(e) { throw new Error("Respon server tidak valid: " + text); }
                if (!result.success) throw new Error(result.error || "Gagal upload chunk");
            }

            statusEl.innerText = "Upload ✅";
            statusEl.style.color = "green";
            markData.audio[markData.audio.length - 1] = tempFileName;

        } catch (err) {
            console.error(err);
            statusEl.innerText = "Upload ❌";
            statusEl.style.color = "red";
            retryBtn.style.display = "inline-block";
        }
    };

    retryBtn.addEventListener('click', upload);
    upload(); // langsung upload otomatis

    // update nilai jika siswa aktif
    if (currentIdSiswa) {
        const hasil = hitungNilai();
        updateNilaiDiTabel(hasil);
    }

    __log(`Recording selesai (preview lokal & upload otomatis): ${tempFileName}`);
}

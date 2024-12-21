// Memastikan elemen HTML ditemukan
const inputPesan = document.querySelector(".input-pesan");
const badanChat = document.querySelector(".badan-chat");
const kirimPesanButton = document.querySelector("#kirim-pesan");
const InputFile = document.querySelector("#input-file");
const BungkusUnggahFile = document.querySelector(".bungkus-unggah-file");
const BatalFileButton = document.querySelector("#batal-file");

//pengaturan API
const KUNCI_API = "AIzaSyDUK82wDXbpRjo7plJmnsNNqaaZZdymXKg";
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KUNCI_API}`;

const userData = {
    pesan: null,
    file: {
        data: null,
        mime_type: null
    }
}

const historiChat = [];

//membuat elemen pesan dengan kelas dinamik dan mengembalikannya
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("pesan", ...classes);
    div.innerHTML = content;
    return div;
}

//membuat respon bot dengan API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".pesan-text")
    historiChat.push({
        role:"user",
        parts: [{text: userData.pesan }, ...(userData.file.data ? [{inline_data: userData.file}] : [])]
    });

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: historiChat
        })
    }

    try {
        //mengambil respon dari API
        const response = await fetch(URL_API, requestOptions);
        const data = await response.json();
        if(!response.ok) throw new Error(data.error.pesan);

        //mengekstrak dan menampilkan respons teks
        const ResponseAPIteks = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
        messageElement.innerText = ResponseAPIteks;

        //bot merespon pada histori chat
        historiChat.push({
            role:"model",
            parts: [{text: ResponseAPIteks }]
        });
    }catch (error) {
        console.log(error);
        messageElement.innerText = error.pesan;
        messageElement.style.color = "#ff0000";
    } finally {
        userData.file = {};
        incomingMessageDiv.classList.remove("berpikir");
        badanChat.scrollTo({ top: badanChat.scrollHeight, behavior: "smooth"});
    }
}

//handle pesan pengguna yg keluar
const HandleOutgoingMessage = (e) => {
    e.preventDefault();

    userData.pesan = inputPesan.value.trim();
    inputPesan.value = "";
    BungkusUnggahFile.classList.remove("terunggah-file");

    //membuat dan menampilkan pesan pengguna
    const messageContent = `<div class="pesan-text"></div>
                            ${userData.file?.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="lampiran" />` : ""}`;

    const outgoingMessageDiv = createMessageElement(messageContent, "pesan-user");
    outgoingMessageDiv.querySelector(".pesan-text").textContent = userData.pesan;
    badanChat.appendChild(outgoingMessageDiv);
    badanChat.scrollTo({ top: badanChat.scrollHeight, behavior: "smooth"});


    //Simulasi respons bot dengan indikator berpikir setelah delay
    setTimeout(() => {
        const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                        <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                    </svg>
                        <div class="pesan-text">
                            <div class="indikator-berpikir">
                                <div class="dot"></div>
                                <div class="dot"></div>
                                <div class="dot"></div>
                            </div>
                        </div>`;

        const incomingMessageDiv = createMessageElement(messageContent, "pesan-bot", "berpikir");
        badanChat.appendChild(incomingMessageDiv);
        badanChat.scrollTo({ top: badanChat.scrollHeight, behavior: "smooth"});
        generateBotResponse(incomingMessageDiv);
    }, 600);
}

inputPesan.addEventListener("keydown", (e) => {
    const pesanPengguna = e.target.value.trim();    
    if(e.key === "Enter" && inputPesan) {
        HandleOutgoingMessage(e);
    }
});

//handle pergantian input file
InputFile.addEventListener("change", () => {
    const file = InputFile.files[0];
    if(!file) return;

    const pembaca = new FileReader();
    pembaca.onload = (e) => {
        BungkusUnggahFile.querySelector("img").src = e.target.result;
        BungkusUnggahFile.classList.add("terunggah-file");
        const base64String = e.target.result.split(",")[1];
        
        //menyimpan data di userData
        userData.file = {
            data: base64String,
            mime_type: file.type
        }

        InputFile.value = "";
    }

    pembaca.readAsDataURL(file);
});

//batal upload file
BatalFileButton.addEventListener("click", () => {
    userData.file = {};
    BungkusUnggahFil
    e.classList.remove("terunggah-file");
});

//Inisialisasi emoji
const pilih = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const {PilihanMulai: start, pilihanSelesai: end} = inputPesan;
        inputPesan.setRangeText(emoji.native, start, end, "end")
        inputPesan.focus();
    },
    onClickOutside: (e) => {
        if(e.target.id === "pilih-emoji") {
            document.body.classList.toggle("emoji-tampil");
        } else {
            document.body.classList.remove("emoji-tampil");
        }
    }
});

document.querySelector(".chat-form").appendChild(pilih);

kirimPesanButton.addEventListener("click", (e) => HandleOutgoingMessage(e))
document.querySelector("#unggah-file").addEventListener("click", () => InputFile.click());
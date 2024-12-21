const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const http = require("http");
const session = require("express-session"); // Middleware untuk session
const { Server } = require("socket.io");
const collection = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const nodemailer = require("nodemailer");


// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function sendEmailNotification(to, sender, message) {
    const mailOptions = {
        from: "putiraissa@infitech.or.id", 
        to: to,
        subject: "Pesan Baru dari Chat Aplikasi",
        text: `Anda menerima pesan baru dari ${sender}: ${message}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error saat mengirim email:", error);
        } else {
            console.log("Email berhasil dikirim:", info.response);
        }
    });
}


// Middleware session
app.use(
    session({
        secret: " ", 
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, 
    })
);

// Konversi data ke format JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Gunakan EJS sebagai view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// File static
app.use(express.static("public"));

// Rute untuk halaman login
app.get("/login", (req, res) => {
    res.render("login");
});

// Rute untuk halaman signup
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Rute untuk halaman menu
app.get("/menu", (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login"); // Redirect ke login jika belum login
    }
    res.render("menu", { username: req.session.username });
});

// Rute untuk halaman chatbot
app.get("/home", (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login");
    }
    res.render("home", { username: req.session.username });
});

// Rute untuk halaman chat antar pengguna
app.get("/chat-user", (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login"); // Redirect ke login jika belum login
    }
    res.render("chat-user", { username: req.session.username });
});

// Mendaftar pengguna (signup)
app.post("/signup", async (req, res) => {
    const data = {
        nama: req.body.NamaPengguna,
        email: req.body.EmailPengguna,
        password: req.body.KataSandi,
    };

    // Cek apakah user sudah ada
    const UserAda = await collection.findOne({ nama: data.nama });

    if (UserAda) {
        res.send("User telah ada, tolong ganti nama pengguna anda");
    } else {
        // Hash password dengan bcrypt
        const saltRounds = 10; // Banyak salt rounds untuk bcrypt
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; // Ganti original password dengan yang telah di-hashed

        const userdata = await collection.insertMany(data);
        console.log(userdata);
        res.redirect("/login"); // Redirect ke halaman login setelah signup
    }
});

// Pengguna masuk (login)
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ nama: req.body.NamaPengguna });
        if (!check) {
            return res.send("Nama pengguna tidak dapat ditemukan");
        }
        // Bandingkan password
        const isPasswordMatch = await bcrypt.compare(req.body.KataSandi, check.password);
        if (!isPasswordMatch) {
            return res.send("Password salah!");
        }

        // Simpan nama pengguna di session
        req.session.username = check.nama;
        res.redirect("/menu");
    } catch (error) {
        console.error(error);
        res.send("Kesalahan sistem. Silakan coba lagi.");
    }
});

// Mengelola koneksi Socket.IO
const connectedUsers = {}; // Untuk menyimpan nama pengguna berdasarkan socket ID

io.on("connection", (socket) => {
    console.log("Pengguna terhubung:", socket.id);

    // Sambungkan username dari session melalui event 'set-username'
    socket.on("set-username", (username) => {
        if (username) {
            connectedUsers[socket.id] = username; // Simpan username berdasarkan socket.id
            console.log(`Pengguna ${username} terhubung dengan ID ${socket.id}`);
        }
    });

    // Terima pesan dan kirim ke pengguna lain
    socket.on("send-message", async (message) => {
        const sender = connectedUsers[socket.id];
        if (sender) {
            // Kirim pesan hanya ke pengguna lain
            socket.broadcast.emit("receive-message", { sender, message });

            // Dapatkan email pengguna dari database dan kirim notifikasi
            const recipientSocketIds = Object.keys(connectedUsers).filter((id) => id !== socket.id);
            for (const id of recipientSocketIds) {
                const recipientUsername = connectedUsers[id];
                const recipient = await collection.findOne({ nama: recipientUsername });
                if (recipient && recipient.email) {
                    sendEmailNotification(recipient.email, sender, message);
                }
            }
        }
    });

    // Hapus pengguna dari objek saat terputus
    socket.on("disconnect", () => {
        const username = connectedUsers[socket.id];
        if (username) {
            console.log(`Pengguna ${username} terputus`);
            delete connectedUsers[socket.id];
        }
    });
});

// Jalankan server
const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server berjalan pada port: ${port}`);
});

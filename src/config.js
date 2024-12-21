const mongoose = require('mongoose');
const connect = mongoose.connect("mongodb://localhost:27017/ProjekAkhir");

//cek koneksi database
connect.then(() => {
    console.log("Database terkoneksi");
})
.catch(() => {
    console.log("Database tidak bisa terkoneksi");
})

//buat skema
const Loginschema = new mongoose.Schema({
    nama: {
        type:String,
        required: true
    },
    email: {
        type:String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

//menerima data
const collection = new mongoose.model("users", Loginschema);

module.exports = collection;
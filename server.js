require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const midtransClient = require("midtrans-client");

const app = express();

app.use(cors());
app.use(bodyParser.json());

/* MYSQL */

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err)=>{

if(err){

console.log(err);

}else{

console.log("MYSQL CONNECTED");

}

});

/* MIDTRANS */

let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/* REGISTER */

app.post("/register",(req,res)=>{

const {

username,
email,
password

} = req.body;

const sql =

"INSERT INTO users(username,email,password) VALUES(?,?,?)";

db.query(

sql,

[username,email,password],

(err,result)=>{

if(err){

return res.json({

success:false,
message:"Akun sudah ada"

});

}

res.json({

success:true

});

}

);

});

/* LOGIN */

app.post("/login",(req,res)=>{

const {

email,
password

} = req.body;

const sql =

"SELECT * FROM users WHERE email=? AND password=?";

db.query(

sql,

[email,password],

(err,result)=>{

if(result.length > 0){

res.json({

success:true,
user:result[0]

});

}else{

res.json({

success:false

});

}

}

);

});

/* TRANSAKSI */

app.post("/create-transaction", async(req,res)=>{

try{

const {

nama,
alamat,
email,
total,
cartItems

} = req.body;

/* ITEM DETAILS */

const item_details = cartItems.map((item,index)=>({

id:"ITEM"+index,

price: parseInt(item.harga),

quantity: parseInt(item.qty),

name:item.nama

}));

/* MIDTRANS */

const orderId =
"ORDER-"+Date.now();

const parameter = {

transaction_details:{

order_id: orderId,

gross_amount:
parseInt(total)

},

credit_card:{
secure:true
},

customer_details:{

first_name:nama,

email:email,

shipping_address:{
address:alamat
}

},

item_details:item_details

};

const transaction =

await snap.createTransaction(parameter);

/* PRODUK */

let produkGabung =

cartItems.map(item =>

`${item.nama} (${item.qty})`

).join(", ");

/* SIMPAN MYSQL */

const sql =

`INSERT INTO transaksi
(order_id,nama,alamat,email,produk,jumlah,metode,status,total,tanggal)

VALUES(?,?,?,?,?,?,?,?,?,?)`;

db.query(

sql,

[

orderId,

nama,
alamat,
email,

produkGabung,

cartItems.length,

"Midtrans",

"Pending",

total,

new Date().toLocaleString("id-ID")

]

);

res.json({

token:transaction.token

});

}catch(err){

console.log(err);

res.status(500).json({

error:err.message

});

}

});

/* CALLBACK MIDTRANS */


app.post(
"/midtrans-callback",
(req,res)=>{
b
console.log(
"CALLBACK BERHASIL MASUK"
);

console.log(req.body);

const data = req.body;

const orderId =
data.order_id;

const transactionStatus =
data.transaction_status;

/* METODE PEMBAYARAN */

let metode =

data.payment_type || "Unknown";

/* DETAIL BANK */

if(
data.va_numbers &&
data.va_numbers.length > 0
){

metode =

data.va_numbers[0].bank.toUpperCase();

}

/* QRIS */

if(
data.payment_type == "qris"
){

metode = "QRIS";

}

/* GOPAY */

if(
data.payment_type == "gopay"
){

metode = "GoPay";

}

/* SHOPEEPAY */

if(
data.payment_type == "shopeepay"
){

metode = "ShopeePay";

}

/* INDOMARET */

if(
data.payment_type == "cstore"
){

metode = "Indomaret";

}

/* STATUS */

let status = "Pending";

if(
transactionStatus == "settlement" ||
transactionStatus == "capture"
){

status = "Berhasil";

}

else if(
transactionStatus == "expire"
){

status = "Expired";

}

else if(
transactionStatus == "cancel"
){

status = "Cancel";

}

/* UPDATE DATABASE */

const sql =

`
UPDATE transaksi
SET status=?, metode=?
WHERE order_id=?
`;

db.query(

sql,

[status,metode,orderId],

(err,result)=>{

if(err){

console.log(err);

}else{

console.log(
"DATABASE BERHASIL UPDATE"
);

}

});

res.status(200).json({

message:"OK"

});

});



/* HOME */

app.get("/",(req,res)=>{

res.send("SERVER FIVECENTER AKTIF");

});

/* SERVER */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`SERVER RUNNING ${PORT}`);
});
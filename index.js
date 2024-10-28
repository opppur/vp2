const express = require("express");
const dateTime = require("./dateTime");
const fs = require("fs");
//et saada kõik päringust kätte
const bodyparser = require("body-parser");
//andmebaasi andmed
const dbInfo = require("../../vp2024config");
//andmebaasiga suhtlemine
const mysql = require("mysql2");
//fotode üleslaadimiseks
const multer = require("multer");
//fotomanipulatsiooniks
const sharp = require("sharp");

const app = express();

//määran view mootori
app.set("view engine", "ejs");
//määran jagatavate, avalike failide kausta
app.use(express.static("public"));
//kasutame body-parserit päringute parsimiseks (kui ainult tekst, siis false, kui ka pildid, siis true)
app.use(bodyparser.urlencoded({extended: true}));
//Seadistame fotode üleslaadimiseks vahevara (middleware), mis määrab kataloogi kuhu laetakse
const upload = multer({dest: "./public/gallery/orig"});

//andmebaasi ühendus
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

app.get("/", (req, res)=>{
	//res.send("Express läks käima!!")
	res.render("index");
});

app.get("/timenow", (req, res)=>{
	const dateNow = dateTime.dateFormattedEt();
	const timeNow = dateTime.timeFormattedEt();
	res.render("timenow", {nowD: dateNow, nowT: timeNow});
});

app.get("/vanasonad", (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=>{
		if(err){
			throw err;
		}
		else {
			folkWisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
		}
	});
});

app.get("/regvisit", (req, res)=>{
	res.render("regvisit");
});

app.post("/regvisit", (req, res)=>{
	const dateNow = dateTime.dateFormattedEt();
	const timeNow = dateTime.timeFormattedEt();
	//console.log(reg.body);
	//avan .txt faili selliselt, et kui seda ei eksisteeri, see luuakse
	fs.open("public/textfiles/log.txt", "a", (err, file)=> {
		if(err){
			throw err;
		}
		else {
			fs.appendFile("public/textfiles/log.txt", ";" + req.body.firstNameInput + " " + req.body.lastNameInput + " " + dateNow + ", " + timeNow, (err)=>{
				if(err){
					throw err;
				}
				else {
					console.log("Faili kirjutati!");
					res.render("regvisit");
				}
			});
		}
	});
});

app.get("/visitlog", (req, res)=>{
	let visitorName = [];
	fs.readFile("public/textfiles/log.txt", "utf8", (err, data)=>{
		if(err){
			throw err;
		}
		else {
			visitorName = data.split(";");
			res.render("visitlog", {h2: "Külalised", listData: visitorName});
		}
	});
});

app.get("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	//kontrollin kas vajalikud andmed on olemas
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		//console.log("Osa andmeid puudu");
		notice = "Osa andmeid on puudu";
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
	}
	else {
		let sqlReq = "INSERT INTO vp2visitlog (first_name, last_name) VALUES(?,?)";
		conn.query(sqlReq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlRes)=>{
			if(err) {
				notice = "Andmeid ei salvestatud";
				res.render("regvisitdb", {notice: notice});
				throw err;
			}
			else {
				notice = "Andmed salvestati!";
				res.render("regvisitdb", {notice: notice});
			}
		});
	}
});

app.get("/eestifilm", (req, res)=>{
	res.render("eestifilm");
});

app.get("/eestifilm/tegelased", (req, res)=>{
	//loon andmebaasipäringu
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	conn.query(sqlReq, (err,sqlRes)=>{
		if(err){
			res.render("tegelased", {persons: []});
			//throw err;
		}
		else {
			//console.log(sqlRes);
			res.render("tegelased", {persons:sqlRes});
		}
	});
	//res.render("tegelased");
});

app.get("/eestifilm/lisa", (req, res)=>{
	res.render("addperson");
});

app.get("/photoupload", (req, res)=>{
	res.render("photoupload")
});

app.post("/photoupload", upload.single("photoInput"), (req, res)=>{
	console.log(req.body);
	console.log(req.file);
	const fileName = "vp_" + Date.now() + ".jpg";
	fs.rename(req.file.path, req.file.destination + "/" + fileName, (err)=>{
		console.log("Faili nime muutmise viga: " + err);
	})
	sharp(req.file.destination + "/" + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
	sharp(req.file.destination + "/" + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
	//salvestame info andmebaasi
	let sqlReq = "INSERT INTO vp2photos (file_name, orig_name, alt_text, privacy, user_id) VALUES(?,?,?,?,?)";
	const userId = 1;
	conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
		if(err){
			throw(err);
		}
		else {
			res.render("photoupload");
		}
	});
	res.render("photoupload");
});

app.get("/gallery", (req, res)=>{
	let sqlReq = "SELECT file_name, alt_text FROM vp2photos WHERE privacy = ? AND deleted IS NULL";
	const privacy = 3;
	let photoList = [];
	conn.query(sqlReq, [privacy], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			//result.foreach(photo => {
				//photoList.push({href: "gallery/thumb/" + photo.file_name, alt: photo.alt_text});
			//}
			res.render("gallery", {listData: photoList});
		};
	});
	res.render("gallery");
});

app.listen(5207);
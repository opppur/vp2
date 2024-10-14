const express = require("express");
const dateTime = require("./dateTime");
const fs = require("fs");
//et saada kõik päringust kätte
const bodyparser = require("body-parser");
//andmebaasi andmed
const dbInfo = require("../../vp2024config");
//andmebaasiga suhtlemine
const mysql = require("mysql2");

const app = express();

//määran view mootori
app.set("view engine", "ejs");
//määran jagatavate, avalike failide kausta
app.use(express.static("public"));
//kasutame body-parserit päringute parsimiseks (kui ainult tekst, siis false, kui ka pildid, siis true)
app.use(bodyparser.urlencoded({extended: false}));

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
	res.render("regvisitdb", {notice: notice, firstName : firstName, lastName : lastName});
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
		res.render("regvisitdb", {notice: notice, firstName : firstName, lastName : lastName});
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

app.listen(5207);
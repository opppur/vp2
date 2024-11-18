const express = require("express");
const router = express.Router(); //suur "R" on oluline!!!
const general = require("../generalFnc");

const {
	newsHome, 
	addNews, 
	addingNews, 
	newsList
} = require("../controllers/newsController");

//kõikidele marsruutidele vahevara checkLogin
//router.use(general.checkLogin)

//marsruudid
//kuna kõik on nagunii "/news", siis lihtsalt kuna tahame kasutada ka kontrollereid, siis .get tuleb järgi
router.route("/").get(newsHome);

router.route("/add").get(addNews);

router.route("/add").post(addingNews);

router.route("/read").get(newsList);

module.exports = router;

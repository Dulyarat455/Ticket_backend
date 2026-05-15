const express  = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");


dotenv.config();


const  userController = require('./controllers/UserController')




app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));



// User

app.post('/api/user/create', (req, res) => userController.create(req,res))






app.listen(3001, ()=>{
    console.log("API Server Running...")   
})





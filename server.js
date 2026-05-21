const express  = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const path = require('path');
const fs = require('fs');


dotenv.config();


const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });



const  userController = require('./controllers/UserController')
const  sectionController = require('./controllers/SectionController')
const  groupController = require('./controllers/GroupController')
const  projectController = require('./controllers/ProjectController')
const  ticketController = require('./controllers/TicketController')


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));



// ===============================
// Upload Folder: ticketFile
// ===============================
const ticketFileDir = path.join(__dirname, "ticketFile");

if (!fs.existsSync(ticketFileDir)) {
  fs.mkdirSync(ticketFileDir, { recursive: true });
}

// ทำให้ frontend เปิดรูปได้ผ่าน URL เช่น:
// http://localhost:3001/ticketFile/filename.png
app.use("/ticketFile", express.static(ticketFileDir));

// ===============================
// Multer Config
// ===============================
const ticketStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ticketFileDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
  
    const safeName = baseName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, "");
  
    const now = new Date();
  
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
  
    const uniqueName = `ticket_${yyyy}${mm}${dd}_${hh}${min}${ss}_${Math.round(
      Math.random() * 1e6
    )}_${safeName || "image"}${ext}`;
  
    cb(null, uniqueName);
  }
});

const ticketFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }

  cb(null, true);
};

const uploadTicketFiles = multer({
  storage: ticketStorage,
  fileFilter: ticketFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB ต่อไฟล์
    files: 10                 // แนบได้สูงสุด 10 ไฟล์
  }
});





// User

app.post('/api/user/create', (req, res) => userController.create(req,res))
app.post('/api/user/signIn',(req, res) => userController.signIn(req, res))
app.post('/api/user/mapUserGroupSection', (req, res) => userController.mapUserGroupSection(req,res))


//section
app.post('/api/section/create', (req ,res) => sectionController.create(req,res))



//group
app.post('/api/group/create', (req, res) => groupController.create(req,res))


//project 
app.post('/api/project/create', (req, res) => projectController.create(req,res))
app.get('/api/project/list', (req, res) => projectController.list(req,res))


//ticket 
app.post(
    "/api/ticket/create",
    uploadTicketFiles.array("attachments", 10),
    (req, res) => ticketController.create(req, res)
  );

app.get("/api/ticket/list", (req, res) => ticketController.list(req,res));
app.post("/api/ticket/ownerIncharge", (req, res) => ticketController.ownerIncharge(req,res))








// ===============================
// Multer Error Handler
// ===============================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).send({
        message: "Upload file error",
        error: err.message
      });
    }
  
    if (err) {
      return res.status(400).send({
        message: "Invalid file upload",
        error: err.message
      });
    }
  
    next();
  });





app.listen(3001, ()=>{
    console.log("API Server Running...")   
})





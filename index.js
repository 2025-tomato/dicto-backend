//require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("./firebase");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.use("/scripts", require("./routes/scripts"));
app.use("/folders", require("./routes/folders"));
app.use("/analyze", require("./routes/analyze"));
app.use("/sessions", require("./routes/sessions"));
app.use("/feedback", require("./routes/feedback"));

app.listen(3000, () => {
  console.log("🚀 서버 실행 중: http://localhost:3000");
});



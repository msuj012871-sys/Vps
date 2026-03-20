const express = require("express");
const { spawn } = require("child_process");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(express.static("public"));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

let bots = {};

function getBots() {
    return fs.readdirSync("bots").filter(f => fs.statSync("bots/" + f).isDirectory());
}

function startBot(name) {
    if (bots[name]) return;

    const process = spawn("python", [`bots/${name}/bot.py`]);

    bots[name] = { process, logs: [] };

    process.stdout.on("data", d => bots[name].logs.push(d.toString()));
    process.stderr.on("data", d => bots[name].logs.push(d.toString()));

    process.on("close", () => delete bots[name]);
}

function stopBot(name) {
    if (bots[name]) {
        bots[name].process.kill();
        delete bots[name];
    }
}

app.get("/bots", (req, res) => {
    res.json(getBots());
});

app.post("/start/:name", (req, res) => {
    startBot(req.params.name);
    res.send("Started");
});

app.post("/stop/:name", (req, res) => {
    stopBot(req.params.name);
    res.send("Stopped");
});

app.get("/logs/:name", (req, res) => {
    res.json(bots[req.params.name]?.logs || ["No logs"]);
});

// 🔥 Upload system
app.post("/upload", upload.single("file"), (req, res) => {
    const name = req.body.name;
    const path = `bots/${name}`;

    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

    fs.renameSync(req.file.path, `${path}/bot.py`);
    res.send("Uploaded");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running"));
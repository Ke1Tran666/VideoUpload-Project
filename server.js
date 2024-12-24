const express = require("express");
const youtube = require("youtube-api");
const fs = require("fs");
const uuid = require("uuid");
const cors = require("cors");
const open = require("open");
const multer = require("multer");
const credentials = require("./credentials.json");

const app = express();
app.use(express.json());
app.use(cors());

// Cấu hình multer để lưu trữ video
const storage = multer.diskStorage({
    destination: "./uploads", // Thư mục lưu trữ video
    filename: (req, file, cb) => {
        const newFileName = `${uuid.v4()}-${file.originalname}`; // Sử dụng uuid.v4() để tạo UUID hợp lệ
        cb(null, newFileName);
    }
});

const uploadVideoFile = multer({
    storage: storage
}).single("videoFile");

// Route xử lý upload video
app.post("/upload", uploadVideoFile, (req, res) => {
    if (req.file) {
        const filename = req.file.filename;
        const { title, description } = req.body;

        // Mở URL OAuth để người dùng đăng nhập và cấp quyền
        const authUrl = oAuth.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/youtube.upload"],
            state: JSON.stringify({ filename, title, description })
        });

        open(authUrl); // Mở URL OAuth trong trình duyệt

        // Không gửi phản hồi ở đây, chỉ gửi khi OAuth callback hoàn tất
        res.send("Redirecting to YouTube OAuth...");
    } else {
        res.status(400).send("No file uploaded.");
    }
});

// Route OAuth callback để xử lý token và upload video
app.get("/oauth2callback", (req, res) => {
    // Redirect về trang thành công sau khi OAuth hoàn tất
    res.redirect("https://xwgkzj.csb.app/success");

    const { filename, title, description } = JSON.parse(req.query.state);

    oAuth.getToken(req.query.code, (err, tokens) => {
        if (err) {
            console.log(err);
            return res.status(500).send("OAuth token error.");
        }

        oAuth.setCredentials(tokens);

        // Upload video lên YouTube
        youtube.videos.insert({
            resource: {
                snippet: {
                    title,
                    description
                },
                status: {
                    privacyStatus: "private"
                }
            },
            part: "snippet, status",
            media: {
                body: fs.createReadStream(`./uploads/${filename}`)
            }
        }, (err, data) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error uploading video.");
            }

            console.log("Video uploaded successfully");
            // Phản hồi chỉ sau khi upload video thành công
            // Không gửi phản hồi ở đây nữa, vì đã có `res.redirect` trên.
        });
    });
});

// Cấu hình OAuth 2.0 với Google API
const oAuth = youtube.authenticate({
    type: "oauth",
    client_id: credentials.web.client_id,
    client_secret: credentials.web.client_secret,
    redirect_url: credentials.web.redirect_uris[0]
});

// Chạy server trên port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log("App is listening on Port 3000");
});
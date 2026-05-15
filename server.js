require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Replicate = require('replicate');
const fs = require('fs');
const googleTTS = require('google-tts-api');

const app = express();
const port = 3000;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.use(express.json());

app.post('/generate-video', upload.single('image'), async (req, res) => {
    try {
        const imageFile = req.file;
        const textToSpeak = req.body.text;

        if (!imageFile || !textToSpeak) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin!' });
        }

        // --- BƯỚC GIẢI QUYẾT LỖI 422 ---
        // Đọc file ảnh và biến nó thành chuỗi ký tự (Base64 String) cho AI dễ hiểu
        const imageAsBase64 = fs.readFileSync(imageFile.path, 'base64');
        const mimeType = imageFile.mimetype;
        const sourceImageString = `data:${mimeType};base64,${imageAsBase64}`;
        // -------------------------------

        const audioUrl = googleTTS.getAudioUrl(textToSpeak, { lang: 'vi', slow: false, host: 'https://translate.google.com' });

        const output = await replicate.run(
            "cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3",
            {
                input: {
                    source_image: sourceImageString, // Đã thay bằng chuỗi String
                    driven_audio: audioUrl,
                    enhancer: "gfpgan"
                }
            }
        );

        // Xóa file ảnh tạm trong thư mục uploads sau khi AI tạo xong (giữ máy chủ sạch sẽ)
        if (fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }

        res.json({ success: true, videoUrl: output });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'AI đang bận, vui lòng thử lại.' });
    }
});

app.listen(port, () => console.log(`Server chạy tại http://localhost:${port}`));

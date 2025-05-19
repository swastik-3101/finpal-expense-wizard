const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const router = express.Router();

const upload = multer({ dest: "uploads/" }); // temp storage

router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const formData = new FormData();
    formData.append("receipt", fs.createReadStream(req.file.path));

    // Send image to Python microservice (assumed running on port 5001)
    const response = await axios.post("http://localhost:5001/parse-receipt", formData, {
      headers: formData.getHeaders(),
    });

    fs.unlinkSync(req.file.path); // delete temp file

    return res.status(200).json({ data: response.data });
  } catch (error) {
    console.error("Upload error:", error.message);
    return res.status(500).json({ error: "Failed to process receipt" });
  }
});

module.exports = router;

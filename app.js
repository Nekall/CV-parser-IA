require('dotenv').config()
const express = require("express");
const formidable = require("formidable");
const fs = require("fs");
const PDFParser = require("pdf-parse");

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

const test = async () => {
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: "Hello world"}],
      });
      console.log(completion.data.choices[0].message);
}

test();

const app = express();
const port = 3333;

app.get("/", (req, res) => {
  res.write("<h1>Welcome on CV Parser AI</h1>");
  res.write("<button><a href='/input-pdf'>Upload PDF</a></button>");
  return res.end();
});

app.get("/input-pdf", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write(
    '<form action="file-upload" method="post" enctype="multipart/form-data">'
  );
  res.write('<input type="file" name="filetoupload"><br>');
  res.write('<input type="submit">');
  res.write("</form>");
  return res.end();
});

app.post("/file-upload", (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (err) throw err;

    const { filepath } = files.filetoupload;

    fs.readFile(filepath, function (err, data) {
      if (err) {
        console.error("Error while reading the PDF file:", err);
        res.status(500).send("Error while reading the PDF file");
        return;
      }

      PDFParser(data)
        .then(async function (result) {
          const text = result.text;
          console.log("Text from the PDF :", text);

          fs.unlink(filepath, function (err) {
            if (err) {
              console.error("Error when deleting the temporary PDF file:", err);
            } else {
              console.log("Temporary PDF file successfully deleted.");
            }
          });

          //res.write("File downloaded and successfully converted.");
          //res.write(text);
          //res.write(completion.data.choices[0].message);

          
          res.end();
        })
        .catch(function (err) {
          console.error("Error when converting PDF to text:", err);
          res.status(500).send("Error when converting PDF to text");
        });
    });
  });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

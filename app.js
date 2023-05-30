require("dotenv").config();
const express = require("express");
const formidable = require("formidable");
const fs = require("fs");
const PDFParser = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.SECRET_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
const port = 3333;

app.get("/", (req, res) => {
  res.write("<h1>Welcome on CV Parser AI</h1>");
  res.write("<button><a href='/input-pdf'>Upload PDF</a></button>");
  return res.end();
});

app.get("/input-pdf", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("The CV is being analyzed, please be patient");
  res.write("(It may take up to 1 minute)");
  res.write(
    '<form action="file-upload" method="post" enctype="multipart/form-data">'
  );
  res.write('<input type="file" name="filetoupload"><br>');
  res.write('<input value="Submit" type="submit">');
  res.write("</form>");
  return res.end();
});

app.post("/file-upload", (req, res) => {
  const form = new formidable.IncomingForm();

  if (form) {
    console.log("PDF successfully received");
  }

  form.parse(req, function (err, fields, files) {
    if (err) {
      console.error("Error while parsing the form:", err);
      res.status(500).send("Error while parsing the form");
      return;
    } else {
      console.log("PDF successfully parsed");
    }

    const { filepath } = files.filetoupload;

    fs.readFile(filepath, function (err, data) {
      if (err) {
        console.error("Error while reading the PDF file:", err);
        res.status(500).send("Error while reading the PDF file");
        return;
      } else {
        console.log("PDF successfully read");
      }

      PDFParser(data)
        .then(async function (result) {
          const text = result.text;

          fs.unlink(filepath, function (err) {
            if (err) {
              console.error("Error when deleting the temporary PDF file:", err);
            } else {
              console.log("Temporary PDF file successfully deleted");
            }
          });

          console.log("Extracted data send to the API");
          console.log("Starting the openAI call... (~ 1min)");

          try {
            const completionPromise = openai.createChatCompletion({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "user",
                  content: `Here is the data for a CV, send me the following data as JSON:
                  - Lastname
                  - Firstname
                  - Address
                  - Phone number
                  - Email address
                  - Date of birth
                  - Professional experience
                  - Education
                  - Competence
                  - Language skills
                  - Hobbies
                  - References
                                    
                    CV: ${text}`,
                },
              ],
            });

            const completion = await completionPromise;
            const response = completion.data.choices[0].message.content;

            const filename = `${uuidv4()}.json`;
            const jsonPath = `cv-json/${filename}`;

            fs.writeFile(jsonPath, response, function (err) {
              if (err) {
                console.error("Error when saving JSON file:", err);
                res.status(500).send("Error when saving JSON file");
                return;
              }

              console.log("JSON file saved successfully:", jsonPath);
              return res.end();
            });
          } catch (error) {
            console.error("Error during API call:", error);
            res.status(500).send("Error during API call");
          }
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

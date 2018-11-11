const express = require("express");
const app = express();
const scrapper = require("./scrapper/index");

app.get("/", async function(req, res, _) {
  const json = await scrapper.livescores();
  res.status(200).json(json);
});

app.listen(3030, function() {
  console.log("server up");
});

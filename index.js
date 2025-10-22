const express = require("express");
const dotenv = require("dotenv");
const { getResponse, getSimilar } = require("./ai_chatbot/ai_chatbot.js");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
async function f() {
  res = await getResponse("fuck you");
  console.log(res);
}
f();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Node.js Swipeat Chatbot Running!");
});

app.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query in JSON body" });
    }
    //const response = await getResponse(query);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

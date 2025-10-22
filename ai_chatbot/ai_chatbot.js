// === Node.js equivalent of your Python chatbot ===
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const { ChatOpenAI } = require("@langchain/openai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const time = require("perf_hooks").performance;

// === Load environment variables ===
const MODEL = process.env.MODEL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.BASE_URL;

// === Agentic tool ===
async function getSimilar(r) {
  content = "";
  score = 0;
  await axios
    .post("https://chromadb-api-1.onrender.com/ask", { query: r })
    .then((res) => {
      content = res.data.response.doc;
      score = res.data.response.score;
    })
    .catch((e) => console.log("error " + e.message));
  return [[{ page_content: content }, score]];
}

// === LLM setup ===
const llm = new ChatOpenAI({
  model: MODEL,
  openAIApiKey: OPENAI_API_KEY,
  temperature: 1,
  configuration: {
    baseURL: BASE_URL,
  },
  maxTokens: 500,
});

// === Verdict LLM (simpler approach without agent) ===
const verdictLlm = new ChatOpenAI({
  model: MODEL,
  openAIApiKey: OPENAI_API_KEY,
  temperature: 0, // Lower temperature for more consistent TRUE/FALSE responses
  configuration: {
    baseURL: BASE_URL,
  },
  maxTokens: 10,
});

// === Call agent verdict ===
async function callAgentVerdict(query, searchResultDoc, score) {
  const verdictPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a professional AI judge that double checks retrieved answer's relevance from preloaded answers in a vector database according to question. Answer with ONLY 'TRUE' or 'FALSE'. Negative scores below 0.3 will be automatically FALSE (if TRUE no need to search for answer by another AI, and will be directly pulled from DB/if FALSE another AI will make a custom answer)",
    ],
    [
      "human",
      "QUERY : what do u do ? \nPRELOADED_RESPONSE : To reach our 24/7 support team and for more questions: you need to send an email to our team in the profile settings \nSCORE BY VECTOR DB : -0.20790566614293593",
    ],
    ["ai", "FALSE"],
    [
      "human",
      "QUERY : how can i add my food for everyday use ? \nPRELOADED_RESPONSE : To add daily consumable food: you need to access add tab and either add manually or just use the camera icon and let our nutritionist AI do the work \nSCORE BY VECTOR DB : 0.6111423017515758",
    ],
    ["ai", "TRUE"],
    [
      "human",
      "QUERY : {query} \nPRELOADED_RESPONSE : {response} \nSCORE BY VECTOR DB : {score}",
    ],
  ]);

  const chain = verdictPrompt.pipe(verdictLlm);
  const result = await chain.invoke({
    query: query,
    response: searchResultDoc,
    score: score,
  });

  return result.content.trim();
}

// === Prompt templates ===
const appContext =
  "Swipeat is a mealtracking + goals making + macros tracking app: here is a list of possible actions in the app:\n" +
  "To consume food from the home tab: you need to swipe food stubs left or right\n" +
  "To check food info or edit its macros: you need to click on the info icon on top of the food stub\n" +
  "To delete food from food list: you need to click the red trashbin on the top left corner of the food stub\n" +
  "To access each macro progress: you need to click on the specific macro (protein/carbs/calories) bar\n" +
  "To multiple eating portions: you need to use the up and down buttons on the far right of food stub\n" +
  "To quick check food macros: you need to click on the food stub\n" +
  "To quick uncheck food macros: you need to click on the food stub again\n" +
  "To sort food list accordingly: you need to click on the floating button on the right of the food list\n" +
  "To refresh your food in case of an error or update failure: you need to click on the small reload button under the macros dashboard on the home tab\n" +
  "To refresh your consumed food list in case of an error or update failure: you need to click on the small reload button or pull the list down under days listing inside consumed tab\n" +
  "To check up to past 7 days progress: you need to click on the previous day date on the list of days above on the home tab\n" +
  "To edit macro goals or reset today's progress manually: you need to click on the pen on the top left of home tab\n" +
  "To search for foods by name: you need to use the search bar\n" +
  "To remove popping notifications: you need to click on the dismiss button on the notification\n" +
  "To add food on the go instantly: you need to proceed to home tab and use the center tab camera popping up\n" +
  "To check up past 7 days consumed food: you need to proceed to consumed tab and use the dates buttons to access the exact date\n" +
  "To add daily consumable food: you need to access add tab and either add manually or just use the camera icon and let our nutritionist AI do the work\n" +
  "To change portion from g/ml to kg/L: you need to click on the g/ml button; it will go back and forth for change\n" +
  "To set your goals automatically based on your anthropometric/physical measurements: you need to access goals tab and fill out 3 sub-tabs (calories -> protein -> carbs) in order\n" +
  "To check your analytics: you need to access analytics tab\n" +
  "To check your profile: you need to access profile tab\n" +
  "To change your anthropometric/physical measurements (weight/height/age): you need to access profile tab settings\n" +
  "To read our Terms & Conditions: you need to access them from the profile tab\n" +
  "To reach out to our FAQ bot support: you need to access the floating bubble on the profile tab\n" +
  "To reach our 24/7 support team and for more questions: you need to send an email to our team in the profile settings\n" +
  "To logout: you need to click on the logout button on the top right of profile tab\n" +
  "To login/create an account: you need to access login or create new account buttons after launching app and after being logged out\n" +
  "To access our premium service: you need to wait for the lazy developer to add premium features (it's disabled for now)\n" +
  "To consume your food daily: you need to wait till midnight according to your timezone on your device (it will be reset automatically)\n";

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful FAQ chatbot to health/fitness macro tracking app called swipeat users expert. Base all answers on the app context 100%, if questions are outside scope answer with -> 'SORRY THATS OUTSIDE OF THE APPS FAQ SCOPE PLEASE CONTACT OUT SUPPORT'. Full context: ${appContext}`,
  ],
  ["human", "Fuck you"],
  ["ai", "THATS OUTSIDE OF THE APPS FAQ SCOPE PLEASE CONTACT OUT SUPPORT."],
  ["human", "what time is it ?"],
  ["ai", "THATS OUTSIDE OF THE APPS FAQ SCOPE PLEASE CONTACT OUT SUPPORT."],
  ["human", "What does this app do ?"],
  ["ai", "Swipeat is a mealtracking + goals making + macros trakcing app."],
  ["human", "How do i add my daily meals"],
  [
    "ai",
    "To add daily consumable food : you need to access add tab and either add manually or just use the camera icon and let our nutritionist AI do the work.",
  ],
  [
    "human",
    "im tired of this i want to add my food instantly with Image recongnition?",
  ],
  [
    "ai",
    "To add food on the go instantly : you need to proceed to home tab and use the center tab camera popping up.",
  ],
  ["human", "There is a bug what do i do?"],
  [
    "ai",
    "To reach our 24/7 support team and for more questions : you need to send an email to our team in the profile settings",
  ],
  ["human", "{Question}"],
]);

// === Thresholds ===
const similarityThreshold = 0.6;
const aSimilarityThreshold = 0.3;

// === Get response function ===
async function getResponse(query) {
  const start = time.now();
  const resp = await getSimilar(query);
  const end = time.now();
  console.log("response ", resp);
  const [doc, score] = resp[0];
  const searchResultDoc = doc.page_content;
  console.log("Vector search elapsed time:", end - start);

  if (score > similarityThreshold) {
    return searchResultDoc;
  } else if (score >= aSimilarityThreshold) {
    // gray zone, call agent
    const judgeVerdict = await callAgentVerdict(query, searchResultDoc, score);
    if (judgeVerdict === "TRUE" || judgeVerdict.includes("TRUE")) {
      return searchResultDoc;
    } else {
      console.log("chatbot fallback after verdict");
      const chatbotChain = promptTemplate.pipe(llm);
      return (await chatbotChain.invoke({ Question: query })).content;
    }
  } else {
    // fallback to chatbot
    console.log("chatbot fallback");
    const chatbotChain = promptTemplate.pipe(llm);
    return (await chatbotChain.invoke({ Question: query })).content;
  }
}

module.exports = { getResponse, getSimilar };

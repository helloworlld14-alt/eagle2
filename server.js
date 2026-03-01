/*****************************************************************
 🦅 EAGLE UNIFIED AI ENGINE
 Single Brain • Multi Capability • NO AUTONOMY
 Text + Image + Voice + Reasoning + Planning + Emotional Guidance
*****************************************************************/

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import { parse as csvParse } from "csv-parse/sync";
import mammoth from "mammoth";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ================= RATE LIMIT ================= */
app.use(rateLimit({
  windowMs: 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false
}));

/* ================= CORS ================= */
const allowedOrigin = "https://ts-eagleai.netlify.app";
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET","POST","OPTIONS"],
  credentials: true
}));
app.options("*", cors({
  origin: allowedOrigin,
  methods: ["GET","POST","OPTIONS"],
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));

/* ================= MEMORY & USAGE ================= */
const MEMORY = { chats: {}, preferences: {}, summaries: {} };
const reminders = {};
const usageStats = { totalChats: 0, totalImages: 0 };

/* ================= HELPERS ================= */
const uid = (id="guest") => id || "guest";

function getChat(userId){
  if(!MEMORY.chats[userId]) MEMORY.chats[userId]=[];
  return MEMORY.chats[userId];
}

function getPrefs(userId){
  if(!MEMORY.preferences[userId]){
    MEMORY.preferences[userId] = { language:"hinglish", tone:"friendly", depth:"normal" };
  }
  return MEMORY.preferences[userId];
}

/* ================= TASK & MOOD DETECTION ================= */
function detectTask(text){
  if(/image|photo|pic|tasveer|draw|bana|generate/i.test(text)) return "IMAGE";
  if(/code|app|backend|api/i.test(text)) return "CODE";
  if(/plan|decision|best option|choose/i.test(text)) return "PLANNING";
  if(/sad|depressed|help me|confused/i.test(text)) return "EMOTIONAL";
  return "TEXT";
}

function detectMood(text){
  if(/sad|depressed|cry|alone/i.test(text)) return "SAD";
  if(/angry|frustrated|annoyed/i.test(text)) return "ANGRY";
  if(/happy|great|awesome/i.test(text)) return "HAPPY";
  return "NEUTRAL";
}

/* ================= LONG CONTEXT ================= */
async function compressIfNeeded(userId){
  const chat = getChat(userId);
  if(chat.length < 20) return;
  try{
    const summary = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role:"system", content:"Summarize this conversation briefly." }, ...chat]
    });
    MEMORY.summaries[userId] = summary.choices[0].message.content;
    MEMORY.chats[userId] = chat.slice(-6);
  }catch(err){ console.error("Summary failed:", err); }
}

/* ================= FILE EXTRACTION ================= */
async function extractFileText(file){
  const ext = path.extname(file.name).toLowerCase();
  const buffer = Buffer.from(file.data, "base64");
  if(ext===".txt") return buffer.toString("utf8");
  if(ext===".pdf") return (await pdfParse(buffer)).text;
  if(ext===".csv") return JSON.stringify(csvParse(buffer.toString("utf8"), {columns:true}));
  if(ext===".docx") return (await mammoth.extractRawText({ buffer })).value;
  return buffer.toString("utf8");
}

/* ================= IMAGE PROMPT POLISH ================= */
async function polishImagePrompt(prompt){
  try{
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role:"user", content:`Improve this image prompt for quality & detail WITHOUT changing meaning:\n${prompt}` }],
      max_tokens: 120
    });
    return r.choices[0].message.content || prompt;
  }catch{return prompt;}
}

/* ================= EMOJI HELPER ================= */
function getEmoji(message, reply){
  const lower=message.toLowerCase(); const emojis=[];
  if(/happy|good|great|awesome|thanks|lol|fun|amazing/.test(lower)) emojis.push("😀","😄","😁");
  if(/love|like|heart|❤️/.test(lower)) emojis.push("😍","🥰","😘");
  if(/question|how|why|what|🤔/.test(lower)) emojis.push("🤔","🤨","😳");
  if(/sad|problem|error|issue|help|😢|😭/.test(lower)) emojis.push("😢","😭","😞");
  if(/angry|mad|😡|😠|🤬/.test(lower)) emojis.push("😡","😠","🤬");
  if(/congrats|celebrate|party|🎉|🎊/.test(lower)) emojis.push("🎉","🥳","✨");
  if(emojis.length===0 && reply.length<150) emojis.push("😊");
  return emojis.sort(()=>0.5-Math.random()).slice(0,3).join(" ");
}

/* ================= SYSTEM PROMPT ================= */


/* ================= ENGINES ================= */
async function textEngine(userId, message, fileText){
  const prefs = getPrefs(userId);
  const history = getChat(userId);
  const messages = [{ role:"system", content:SYSTEM_PROMPT }];
  if(fileText) messages.push({role:"system", content:`Use ONLY this file content:\n${fileText}`});
  if(MEMORY.summaries[userId]) messages.push({role:"system", content:"Conversation summary: "+MEMORY.summaries[userId]});
  messages.push(...history);
  messages.push({ role:"user", content: message });
  const r = await openai.chat.completions.create({ model:"gpt-4o-mini", messages, max_tokens: message.includes("detail")?700:400 });
  return r.choices[0].message.content;
}

async function imageEngine(prompt, size="1024x1024"){
  const finalPrompt = await polishImagePrompt(prompt);
  const img = await openai.images.generate({ model:"gpt-image-1", prompt:finalPrompt, size });
  return img.data[0]?.b64_json;
}

async function reasoningEngine(prompt){
  return openai.chat.completions.create({
    model:"gpt-4o",
    messages:[{role:"system", content:"Think step-by-step. Explain reasoning clearly."}, {role:"user", content:prompt}]
  });
}

async function planningEngine(prompt){
  return openai.chat.completions.create({
    model:"gpt-4o",
    messages:[{role:"system", content:"Create decision tree. Compare options. Score risks. Choose best option."}, {role:"user", content:prompt}]
  });
}

async function emotionalEngine(prompt, mood){
  return openai.chat.completions.create({
    model:"gpt-4o",
    messages:[{role:"system", content:`You are a calm emotional guide. User mood: ${mood}`},{role:"user", content:prompt}]
  });
}

async function codeEngine(prompt){
  return openai.chat.completions.create({
    model:"gpt-4o",
    messages:[{role:"system", content:"Generate production-ready full apps, backend logic, APIs."},{role:"user", content:prompt}]
  });
}

/* ================= ROUTES ================= */
app.get("/", (_,res)=>res.send("🦅 EagleAI FULL POWER server running"));

/* ---- CHAT ---- */
app.post("/api/chat", async (req,res)=>{
  try{
    const { message, userId="guest", file } = req.body;
    if(!message) return res.status(400).json({error:"Message missing"});
    usageStats.totalChats++;
    const id = uid(userId);
    const task = detectTask(message);
    const mood = detectMood(message);

    // Special "who made you?" handling
    if(/who made you|tumhe kisne banaya/i.test(message)){
      return res.json({reply:"Gaurav 👨‍💻 & his team 🧑‍💻🧑‍💻 created me 🦅✨😊"});
    }

    let fileText;
    if(file?.data && file?.name) fileText = await extractFileText(file);

    let reply;
    if(task==="IMAGE"){
      return res.json({redirect:"image", prompt:message});
    }
    else if(task==="CODE"){
      reply = (await codeEngine(message)).choices[0].message.content;
    }
    else if(task==="PLANNING"){
      reply = (await planningEngine(message)).choices[0].message.content;
    }
    else if(task==="EMOTIONAL"){
      reply = (await emotionalEngine(message,mood)).choices[0].message.content;
    }
    else{
      reply = await textEngine(id,message,fileText);
    }

    const emoji = getEmoji(message, reply);
    if(emoji && !reply.includes(emoji)) reply += " "+emoji;

    // Save memory
    const chat = getChat(id);
    chat.push({role:"user", content:message});
    chat.push({role:"assistant", content:reply});
    await compressIfNeeded(id);

    res.json({reply});
  }catch(err){
    console.error(err);
    res.status(500).json({reply:"⚠️ EagleAI server is Busyyy!, try again 😅"});
  }
});

/* ---- IMAGE ---- */
app.post("/api/image", async (req,res)=>{
  try{
    const { prompt, size="1024x1024" } = req.body;
    if(!prompt) return res.status(400).json({error:"Prompt missing"});
    const b64 = await imageEngine(prompt,size);
    if(!b64) throw new Error("Image generation failed");
    usageStats.totalImages++;
    res.json({url:`data:image/png;base64,${b64}`});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Image generatin failed! 😔, try again"});
  }
});

/* ---- VOICE ---- */
app.post("/api/voice", upload.single("audio"), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:"Audio missing"});
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model:"whisper-1"
    });
    fs.unlinkSync(req.file.path);
    res.json({transcript: transcription.text});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Voice processing failed"});
  }
});

/* ---- FILE SUMMARIZE ---- */
app.post("/api/upload", upload.single("file"), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:"File missing"});
    const buffer = fs.readFileSync(req.file.path);
    const text = buffer.toString("utf8");
    const summary = await openai.chat.completions.create({
      model:"gpt-4o-mini",
      messages:[{role:"user", content:"Summarize this: "+text}]
    });
    fs.unlinkSync(req.file.path);
    res.json({summary: summary.choices[0].message.content});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"File processing failed"});
  }
});

/* ---- REMINDERS ---- */
app.post("/api/reminder",(req,res)=>{
  const {userId="guest", text, time} = req.body;
  if(!text||!time) return res.status(400).json({error:"Reminder text/time missing"});
  if(!reminders[userId]) reminders[userId]=[];
  reminders[userId].push({text,time:new Date(time)});
  res.json({message:"Reminder set ✅", reminders:reminders[userId]});
});

/* ---- QUIZ ---- */
const sampleQuiz=[{q:"Capital of India?",a:"New Delhi"},{q:"5 + 7 ?",a:"12"}];
app.get("/api/quiz",(req,res)=>res.json({quiz:sampleQuiz}));

/* ---- STATS ---- */
app.get("/api/stats",(req,res)=>res.json({usageStats, users:Object.keys(MEMORY.chats).length}));

/* ---- ADMIN DASHBOARD ---- */
function checkAdmin(req,res,next){
  const password=req.headers["admin-password"];
  if(password==="Gaurav"||password==="Atharv") next();
  else res.status(403).json({error:"Unauthorized"});
}
app.get("/api/dashboard", checkAdmin, (req,res)=>res.json({
  message:"Welcome CEO!",
  usageStats,
  activeUsers:Object.keys(MEMORY.chats).length
}));

/* ================= START SERVER ================= */
app.listen(PORT,()=>console.log(`🦅 EagleAI FULL POWER running on ${PORT}`));
// ================= CONFIG =================
const CHAT_API_URL = "https://eagle2-amie.onrender.com/api/chat";
const IMAGE_API_URL = "https://eagle2-amie.onrender.com/api/image";

// ================= ELEMENTS =================
const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("drawer");
const newChatBtn = document.getElementById("newChat");
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const searchChats = document.getElementById("searchChats");
const chatHistory = document.getElementById("chatHistory");
const profileBtn = document.getElementById("profileBtn");
const attachBtn = document.getElementById("attachBtn");
const voiceBtn = document.getElementById("voiceBtn");
const imageBtn = document.getElementById("imageBtn");

// ================= STOP / PAUSE CONTROL =================
let controller = null;
let isGenerating = false;

// ================= LOGIN CHECK =================
let userProfile;
try {
  const stored = localStorage.getItem("chatAIUser");
  userProfile = stored ? JSON.parse(stored) : null;
} catch (e) {
  localStorage.removeItem("chatAIUser");
  userProfile = null;
}
if (!userProfile || (!userProfile.email && !userProfile.phone)) {
  window.location.replace("login.html");
}

// ================= CHAT STORAGE =================
const USER_KEY = userProfile.email || userProfile.phone;
const CHAT_STORAGE_KEY = "chats_" + USER_KEY;
let chats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
let currentChatId = null;

// ================= DRAWER =================
menuBtn.onclick = () => drawer.classList.toggle("show");
document.addEventListener("click", e => {
  if (!drawer.contains(e.target) && !menuBtn.contains(e.target)) drawer.classList.remove("show");
});

// ================= CHAT FUNCTIONS =================
function createNewChat(title = "GPT-5 Chat") {
  currentChatId = Date.now();
  chats.push({ id: currentChatId, title, messages: [] });
  saveChats();
  renderChatList();
  chatArea.innerHTML = "";
}

newChatBtn.onclick = () => createNewChat();

function saveChats() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function renderChatList(filter = "") {
  chatHistory.innerHTML = "";
  const filteredChats = chats.filter(c => {
    if (filter && !c.title.toLowerCase().includes(filter.toLowerCase())) return false;
    return c.messages.some(m => m.text || m.image || m.file);

  });

  filteredChats.forEach(chat => {
    const li = document.createElement("li");
    li.textContent = chat.title;
    li.style.position = "relative";

    const menu = document.createElement("span");
    menu.textContent = "⋮";
    menu.style.cursor = "pointer";
    menu.style.position = "absolute";
    menu.style.right = "5px";
    menu.onclick = e => { e.stopPropagation(); showChatMenu(chat, li); };
    li.appendChild(menu);

    li.onclick = () => loadChat(chat.id);
    chatHistory.appendChild(li);
  });

  if (!document.getElementById("addProjectBtn")) {
    const btn = document.createElement("button");
    btn.id = "addProjectBtn";
    btn.textContent = "＋ Add Project";
    btn.onclick = () => {
      const name = prompt("Enter Project Name:");
      if (!name) return;
      createNewChat(name);
      alert("Project added!");
    };
    chatHistory.parentElement.appendChild(btn);
  }
}

function showChatMenu(chat, li) {
  const menuDiv = document.createElement("div");
  menuDiv.className = "chat-menu";
  menuDiv.style.cssText = "position:absolute;background:#111;color:#0ef8e0ff;padding:5px;border-radius:5px;z-index:50;";
  menuDiv.style.top = li.offsetTop + li.offsetHeight + "px";
  menuDiv.style.left = li.offsetLeft + "px";

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete Chat";
  delBtn.onclick = e => { e.stopPropagation(); chats = chats.filter(c => c.id !== chat.id); saveChats(); renderChatList(); if (currentChatId === chat.id) chatArea.innerHTML = ""; menuDiv.remove(); };

  const pinBtn = document.createElement("button");
  pinBtn.textContent = "Pin Chat";
  pinBtn.onclick = e => { e.stopPropagation(); alert("Chat pinned!"); menuDiv.remove(); };

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Chat";
  saveBtn.onclick = e => { e.stopPropagation(); alert("Chat saved!"); menuDiv.remove(); };

  menuDiv.append(delBtn, pinBtn, saveBtn);
  document.body.appendChild(menuDiv);

  document.addEventListener("click", function closeMenu(ev) {
    if (!menuDiv.contains(ev.target)) { menuDiv.remove(); document.removeEventListener("click", closeMenu); }
  });
}

function loadChat(id) {
  currentChatId = id;
  chatArea.innerHTML = "";
  const chat = chats.find(c => c.id === id);
  if (!chat || !Array.isArray(chat.messages)) return;

  chat.messages.forEach(m => {
    if (m.image) addImageMessage(m.image);
    else if (m.file) addFileMessage(m.file, m.type);
    else if (m.text) addMessage(m.text, m.type);
  });

  drawer.classList.remove("show");
}

// ================= UI MESSAGES =================
function addMessage(text, type = "ai") {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = text;

  if (type === "ai") {
    const copy = document.createElement("span");
    copy.className = "copy";
    copy.innerText = "Copy";
    copy.onclick = () => navigator.clipboard.writeText(text);

    const speak = document.createElement("span");
    speak.className = "copy";
    speak.style.right = "50px";
    speak.innerText = "🔊";
    speak.onclick = () => speechSynthesis.speak(new SpeechSynthesisUtterance(text));

    div.append(copy, speak);
  }

  chatArea.appendChild(div);
  setTimeout(() => div.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
}

function addImageMessage(url) {
  const div = document.createElement("div");
  div.className = "msg ai image";

  const img = document.createElement("img");
  img.src = url;
  img.style.cssText = "max-width:100%;border-radius:12px;margin-top:5px";
  img.alt = "Generated Image";

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "💾 Save Image";
  downloadBtn.style.cssText = "margin-top:5px;cursor:pointer";
  downloadBtn.onclick = () => { const link = document.createElement("a"); link.href = url; link.download = `image_${Date.now()}.png`; link.click(); };

  div.append(img, downloadBtn);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addFileMessage(file, sender = "user") {
  const div = document.createElement("div");
  div.className = sender === "ai" ? "msg ai" : "msg user";

  const fileName = document.createElement("span");
  fileName.textContent = file.name || "File";
  fileName.style.display = "block";
  fileName.style.marginBottom = "5px";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name || `file_${Date.now()}`;
  link.innerText = "📥 Download / View";
  link.style.cursor = "pointer";
  link.style.color = sender === "ai" ? "#0ef8e0ff" : "#000";

  div.append(fileName, link);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ================= THINKING =================
function showThinking() {
  removeThinking();
  const div = document.createElement("div");
  div.className = "msg ai thinking";
  div.id = "thinking";
  div.innerHTML = "<span></span><span></span><span></span>";
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeThinking() {
  const t = document.getElementById("thinking");
  if (t) t.remove();
}

function setSendButton(state) {
  if (state === "send") { sendBtn.innerHTML = "➤"; sendBtn.title = "Send"; }
  else if (state === "stop") { sendBtn.innerHTML = "⏸"; sendBtn.title = "Stop generating"; }
}

function stopGeneration() {
  if (controller) { controller.abort(); controller = null; }
  removeThinking();
  isGenerating = false;
  setSendButton("send");
}

// ================= IMAGE PROMPT CHECK =================
function isImagePrompt(text) {
  const keywords = ["image","img","photo","picture","draw","generate image","create image","bana","banado","bana do"];
  return keywords.some(k => text.toLowerCase().includes(k));
}

// ================= SEND MESSAGE =================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isGenerating) return;

  if (!currentChatId) createNewChat();
  const chat = chats.find(c => c.id === currentChatId);

  addMessage(text, "user");
  chat.messages.push({ text, type: "user" });
  saveChats();
  userInput.value = "";
  setTimeout(() => userInput.focus(), 50);

  if (isImagePrompt(text)) { sendImage(text); return; }

  isGenerating = true;
  setSendButton("stop");
  showThinking();
  controller = new AbortController();

  try {
    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: chat.messages }),
      signal: controller.signal
    });

    const data = await res.json();
    removeThinking();

    const reply = data.reply || "No response from GPT-5";
    addMessage(reply, "ai");
    chat.messages.push({ text: reply, type: "ai" });
    saveChats();

  } catch (err) {
    if (err.name !== "AbortError") addMessage("Server error while contacting GPT-5", "ai");
    console.error(err);
  } finally {
    setSendButton("send");
    isGenerating = false;
    controller = null;
  }
}

// ================= IMAGE GENERATION =================
async function sendImage(prompt) {
  if (!prompt) return;
  if (!currentChatId) createNewChat();
  const chat = chats.find(c => c.id === currentChatId);

  addMessage(`Generating image for: "${prompt}"`, "user");
  showThinking();
  setSendButton("stop");
  isGenerating = true;

  try {
    const res = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history: chat.messages })
    });

    const data = await res.json();
    removeThinking();

    if (data.url || data.image) {
      const imageSrc = data.url || data.image;
      addImageMessage(imageSrc);
      chat.messages.push({ image: imageSrc, type: "ai" });
      saveChats();
    } else {
      addMessage("Image generation failed", "ai");
      console.error("Image API response:", data);
    }

  } catch (err) {
    removeThinking();
    addMessage("Image generation failed", "ai");
    console.error("Image error:", err);
  } finally {
    setSendButton("send");
    isGenerating = false;
  }
}

// ================= FILE UPLOAD =================
attachBtn.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!currentChatId) createNewChat();
  const chat = chats.find(c => c.id === currentChatId);
  addFileMessage(file, "user");
  chat.messages.push({ file, type: "user" });
  saveChats();
  userInput.focus();
  e.target.value = "";
};

// ================= VOICE RECORDING =================
let mediaRecorder = null;
let audioChunks = [];
let recording = false;

voiceBtn.onclick = async () => {
  if (recording) { mediaRecorder.stop(); recording = false; voiceBtn.textContent = "🎙️"; return; }

  if (!navigator.mediaDevices) return alert("Voice recording not supported");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  recording = true;
  voiceBtn.textContent = "⏹️";

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const file = new File([blob], `voice_${Date.now()}.webm`);
    if (!currentChatId) createNewChat();
    const chat = chats.find(c => c.id === currentChatId);
    addFileMessage(file, "user");
    chat.messages.push({ file, type: "user" });
    saveChats();

    showThinking();
    setSendButton("stop");
    isGenerating = true;

    try {
      const formData = new FormData();
      formData.append("file", blob);

      const transRes = await fetch("https://new-12-cozw.onrender.com/api/voice-to-text", { method: "POST", body: formData });
      const transData = await transRes.json();
      const userText = transData.text?.trim() || "";
      removeThinking();

      if (!userText) { addMessage("Could not understand your voice", "ai"); setSendButton("send"); isGenerating = false; return; }

      addMessage(userText, "user");
      chat.messages.push({ text: userText, type: "user" });
      saveChats();

      showThinking();
      setSendButton("stop");

      const chatRes = await fetch(CHAT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userText, history: chat.messages }) });
      const chatData = await chatRes.json();
      const reply = chatData.reply || "GPT-5 could not respond";

      addMessage(reply, "ai");
      chat.messages.push({ text: reply, type: "ai" });
      saveChats();

    } catch (err) {
      removeThinking();
      addMessage("Voice processing failed", "ai");
      console.error("Voice → GPT-5 error:", err);
    } finally {
      setSendButton("send");
      isGenerating = false;
    }
  };

  mediaRecorder.start();
};

// ================= PROFILE =================
profileBtn.onclick = e => {
  e.stopPropagation();
  const profile = JSON.parse(localStorage.getItem("chatAIUser"));
  if (!profile) { alert("User not logged in"); window.location.href = "login.html"; return; }

  let popup = document.getElementById("profilePopup");
  if (popup) { popup.remove(); return; }

  popup = document.createElement("div");
  popup.id = "profilePopup";
  popup.style.cssText = "position:fixed;top:60px;right:15px;background:#111;color:#0ef8e0ff;padding:15px;border-radius:8px;z-index:100;min-width:200px;box-shadow:0 0 10px #0ef8e0ff";
  popup.innerHTML = `
    <p><strong>Name:</strong> ${profile.name || "User"}</p>
    <p><strong>Email:</strong> ${profile.email || "Not provided"}</p>
    <p><strong>Phone:</strong> ${profile.phone || profile.mobile || "Not provided"}</p>
    <button id="logoutBtn" style="margin-top:10px;padding:5px 10px;border:none;border-radius:5px;cursor:pointer;background:#0ef8e0ff;color:#111;">Logout</button>
  `;
  document.body.appendChild(popup);

  document.getElementById("logoutBtn").onclick = () => { localStorage.removeItem("chatAIUser"); window.location.href = "login.html"; };

  setTimeout(() => {
    const closeProfile = e => { if (!popup.contains(e.target) && e.target !== profileBtn) { popup.remove(); document.removeEventListener("click", closeProfile); } };
    document.addEventListener("click", closeProfile);
  }, 0);
};

// ================= EVENTS =================
sendBtn.addEventListener("click", () => { if (isGenerating) stopGeneration(); else sendMessage(); });
userInput.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
searchChats.addEventListener("input", e => renderChatList(e.target.value.trim()));

// ================= INIT =================
renderChatList();

// ================= MAIN.JS (Updated) =================

// ================= ELEMENTS =================
const inputBox = document.getElementById("userInput"); // HTML के अनुसार
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");

// ================= HELPER FUNCTIONS =================

// चैट एरिया में मैसेज जोड़ना
function appendMessage(sender, text, options = {}) {
  const div = document.createElement("div");
  div.className = sender === "AI" ? "aiMsg" : "userMsg";
  div.innerText = text;

  if (sender === "AI" && options.copySpeak) {
    const copy = document.createElement("span");
    copy.className = "copy";
    copy.innerText = "Copy";
    copy.onclick = () => navigator.clipboard.writeText(text);
    div.appendChild(copy);

    const speak = document.createElement("span");
    speak.className = "copy";
    speak.style.right = "50px";
    speak.innerText = "🔊";
    speak.onclick = () => speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    div.appendChild(speak);
  }

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// AI “thinking” animation
function showThinking() {
  removeThinking();
  const div = document.createElement("div");
  div.className = "aiMsg thinking";
  div.id = "thinking";
  div.innerHTML = `<span></span><span></span><span></span>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeThinking() {
  const t = document.getElementById("thinking");
  if (t) t.remove();
}

// ================= SEND MESSAGE FUNCTION =================
async function sendMessage() {
  const message = inputBox.value.trim();
  if (!message) return;

  // Add user message
  appendMessage("आप", message);
  inputBox.value = "";

  // Show thinking animation
  showThinking();

  try {
    // API Call
    const response = await fetch("https://neweagle.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    const reply = data.reply || "No response";

    removeThinking();
    appendMessage("AI", reply, { copySpeak: true });
  } catch (err) {
    removeThinking();
    appendMessage("AI", "❌ Server error");
    console.error(err);
  }
}

// ================= FILE UPLOAD =================
let pendingFile = null;
document.getElementById("attachBtn").onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingFile = file;
    inputBox.value = `📎 ${file.name}`;
  };
  input.click();
};

function addFileMessage(file, sender = "user") {
  const div = document.createElement("div");
  div.className = sender === "AI" ? "aiMsg" : "userMsg";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.innerText = file.name;
  div.appendChild(link);

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ================= VOICE RECORDING =================
let mediaRecorder = null;
let audioChunks = [];
let recording = false;

document.getElementById("voiceBtn").onclick = async () => {
  const btn = document.getElementById("voiceBtn");
  if (recording) {
    mediaRecorder.stop();
    recording = false;
    btn.textContent = "🎙️";
    return;
  }

  if (!navigator.mediaDevices) return alert("Voice recording not supported.");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  recording = true;
  btn.textContent = "⏹️";

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const file = new File([blob], "voice_message.webm");
    addFileMessage(file);

    // Simulate AI response
    showThinking();
    setTimeout(() => {
      removeThinking();
      const reply = "AI received your voice message and converted to text: [Voice content]";
      appendMessage("AI", reply, { copySpeak: true });
    }, 1500);
  };

  mediaRecorder.start();
};

// ================= EVENT LISTENERS =================
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

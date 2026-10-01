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

// ================= LOGIN CHECK =================
let userProfile;
try {
  const stored = localStorage.getItem("chatAIUser");
  userProfile = stored ? JSON.parse(stored) : null;
} catch(e){ localStorage.removeItem("chatAIUser"); userProfile=null; }
if(!userProfile || (!userProfile.email && !userProfile.phone)) window.location.replace("login.html");

// ================= CHAT STORAGE =================
const USER_KEY = userProfile.email || userProfile.phone;
const CHAT_STORAGE_KEY = "chats_" + USER_KEY;
let chats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
let currentChatId = null;

// ================= DRAWER =================
menuBtn.onclick = () => drawer.classList.toggle("show");
document.addEventListener("click", e => {
  if(!drawer.contains(e.target) && !menuBtn.contains(e.target)) drawer.classList.remove("show");
});

// ================= CHAT FUNCTIONS =================
function createNewChat(title="New Chat"){
  currentChatId = Date.now();
  chats.push({id:currentChatId,title,messages:[]});
  saveChats(); renderChatList(); chatArea.innerHTML="";
}
newChatBtn.onclick = () => createNewChat();
function saveChats(){ localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chats)); }

function renderChatList(filter=""){
  chatHistory.innerHTML="";
  chats.filter(c=>c.title.toLowerCase().includes(filter.toLowerCase()))
       .forEach(chat=>{
         const li = document.createElement("li");
         li.textContent=chat.title; li.style.position="relative";
         const menu = document.createElement("span");
         menu.textContent="⋮"; menu.style.cursor="pointer"; menu.style.position="absolute"; menu.style.right="5px";
         menu.onclick = e=>{ e.stopPropagation(); showChatMenu(chat,li); };
         li.appendChild(menu);
         li.onclick = () => loadChat(chat.id);
         chatHistory.appendChild(li);
       });
  if(!document.getElementById("addProjectBtn")){
    const btn = document.createElement("button");
    btn.id="addProjectBtn"; btn.textContent="＋ Add Project";
    btn.onclick=()=>{
      const name = prompt("Enter Project Name:"); if(!name) return;
      createNewChat(name); alert("Project added!");
    };
    chatHistory.parentElement.appendChild(btn);
  }
}

function showChatMenu(chat,li){
  const menuDiv=document.createElement("div");
  menuDiv.className="chat-menu";
  menuDiv.style.position="absolute"; menuDiv.style.background="#111"; menuDiv.style.color="#0ef8e0ff";
  menuDiv.style.padding="5px"; menuDiv.style.borderRadius="5px"; menuDiv.style.top=li.offsetTop+li.offsetHeight+"px";
  menuDiv.style.left=li.offsetLeft+"px"; menuDiv.style.zIndex="50";

  const delBtn=document.createElement("button");
  delBtn.textContent="Delete Chat"; delBtn.onclick=e=>{
    e.stopPropagation(); chats=chats.filter(c=>c.id!==chat.id); saveChats(); renderChatList();
    if(currentChatId===chat.id) chatArea.innerHTML=""; menuDiv.remove();
  };
  const pinBtn=document.createElement("button");
  pinBtn.textContent="Pin Chat"; pinBtn.onclick=e=>{ e.stopPropagation(); alert("Chat pinned!"); menuDiv.remove(); };
  const saveBtn=document.createElement("button");
  saveBtn.textContent="Save Chat"; saveBtn.onclick=e=>{ e.stopPropagation(); alert("Chat saved!"); menuDiv.remove(); };

  menuDiv.appendChild(delBtn); menuDiv.appendChild(pinBtn); menuDiv.appendChild(saveBtn);
  document.body.appendChild(menuDiv);
  document.addEventListener("click",function closeMenu(ev){
    if(!menuDiv.contains(ev.target)){ menuDiv.remove(); document.removeEventListener("click",closeMenu); }
  });
}

function loadChat(id){
  currentChatId=id; chatArea.innerHTML="";
  const chat=chats.find(c=>c.id===id);
  chat.messages.forEach(m=>{
    if(m.image) addImageMessage(m.image);
    else if(m.file) addFileMessage(m.file,m.type);
    else addMessage(m.text,m.type);
  });
  drawer.classList.remove("show");
}

// ================= UI MESSAGES =================
function addMessage(text,type="ai"){
  const div=document.createElement("div");
  div.className=`msg ${type}`; div.innerText=text;
  if(type==="ai"){
    const copy=document.createElement("span"); copy.className="copy"; copy.innerText="Copy"; copy.onclick=()=>navigator.clipboard.writeText(text);
    const speak=document.createElement("span"); speak.className="copy"; speak.style.right="50px"; speak.innerText="🔊"; speak.onclick=()=>speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    div.appendChild(copy); div.appendChild(speak);
  }
  chatArea.appendChild(div); chatArea.scrollTop=chatArea.scrollHeight;
}

function addImageMessage(url){
  const div=document.createElement("div"); div.className="msg ai";
  const img=document.createElement("img"); img.src=url; img.style.maxWidth="100%"; img.style.borderRadius="12px";
  div.appendChild(img); chatArea.appendChild(div); chatArea.scrollTop=chatArea.scrollHeight;
}

function addFileMessage(file,sender="user"){
  const div=document.createElement("div"); div.className=sender==="ai"?"msg ai":"msg user";
  const link=document.createElement("a"); link.href=URL.createObjectURL(file); link.download=file.name; link.innerText=file.name;
  div.appendChild(link); chatArea.appendChild(div); chatArea.scrollTop=chatArea.scrollHeight;
}

// ================= THINKING =================
function showThinking(){ removeThinking(); const div=document.createElement("div"); div.className="msg ai thinking"; div.id="thinking"; div.innerHTML="<span></span><span></span><span></span>"; chatArea.appendChild(div); chatArea.scrollTop=chatArea.scrollHeight; }
function removeThinking(){ const t=document.getElementById("thinking"); if(t) t.remove(); }

// ================= SEND MESSAGE =================
async function sendMessage(){
  const text=userInput.value.trim(); if(!text) return;
  if(!currentChatId) createNewChat();
  const chat=chats.find(c=>c.id===currentChatId);

  addMessage(text,"user"); chat.messages.push({text,type:"user"}); saveChats(); userInput.value=""; showThinking();

  try{
    const res=await fetch(CHAT_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});
    const data=await res.json();
    removeThinking();
    const reply=data.reply||"No response";
    addMessage(reply,"ai"); chat.messages.push({text:reply,type:"ai"}); saveChats();
  }catch(err){ removeThinking(); addMessage("Server error","ai"); console.error(err);}
}

// ================= IMAGE GENERATION =================
async function sendImage(prompt){
  if(!prompt) return; if(!currentChatId) createNewChat();
  const chat=chats.find(c=>c.id===currentChatId);
  addMessage(`Generating image for: "${prompt}"`,"user"); showThinking();
  try{
    const res=await fetch(IMAGE_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json(); removeThinking();
    if(data.url){ addImageMessage(data.url); chat.messages.push({image:data.url,type:"ai"}); saveChats(); }
    else addMessage("Image generation failed","ai");
  }catch(err){ removeThinking(); addMessage("Image generation failed","ai"); console.error(err);}
}

// ================= FILE UPLOAD =================
let pendingFile=null;
attachBtn.onclick=()=>{
  const input=document.createElement("input"); input.type="file";
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file) return; pendingFile=file; userInput.value=`📎 ${file.name}`;
  }; input.click();
};

// ================= VOICE RECORDING =================
let mediaRecorder=null; let audioChunks=[]; let recording=false;
voiceBtn.onclick=async()=>{
  const btn=voiceBtn;
  if(recording){ mediaRecorder.stop(); recording=false; btn.textContent="🎙️"; return; }
  if(!navigator.mediaDevices) return alert("Voice recording not supported");
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  mediaRecorder=new MediaRecorder(stream); audioChunks=[]; recording=true; btn.textContent="⏹️";
  mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);
  mediaRecorder.onstop=async()=>{
    const blob=new Blob(audioChunks,{type:"audio/webm"});
    const file=new File([blob],"voice_message.webm"); addFileMessage(file);
    showThinking();
    setTimeout(()=>{
      removeThinking();
      const reply="AI received your voice message and converted to text: [Voice content]";
      addMessage(reply,"ai"); const chat=chats.find(c=>c.id===currentChatId); chat.messages.push({text:reply,type:"ai"}); saveChats();
    },1500);
  };
  mediaRecorder.start();
};

// ================= PROFILE =================
profileBtn.onclick = (e) => {
  e.stopPropagation();
  const profile = JSON.parse(localStorage.getItem("chatAIUser"));
  if(!profile){ alert("User not logged in"); window.location.href="login.html"; return; }
  let popup=document.getElementById("profilePopup");
  if(popup){ popup.remove(); return; }
  popup=document.createElement("div"); popup.id="profilePopup"; popup.style.position="fixed"; popup.style.top="60px"; popup.style.right="15px"; popup.style.background="#111"; popup.style.color="#0ef8e0ff"; popup.style.padding="15px"; popup.style.borderRadius="8px"; popup.style.zIndex="100"; popup.style.minWidth="200px"; popup.style.boxShadow="0 0 10px #0ef8e0ff";
  popup.innerHTML=`<p><strong>Name:</strong> ${profile.name||"User"}</p><p><strong>Email:</strong> ${profile.email||"Not provided"}</p><p><strong>Phone:</strong> ${profile.phone||profile.mobile||"Not provided"}</p><button id="logoutBtn" style="margin-top:10px;padding:5px 10px;border:none;border-radius:5px;cursor:pointer;background:#0ef8e0ff;color:#111;">Logout</button>`;
  document.body.appendChild(popup);
  document.getElementById("logoutBtn").onclick=()=>{ localStorage.removeItem("chatAIUser"); window.location.href="login.html"; };
  const closeProfile=(e)=>{ if(!popup.contains(e.target) && e.target!==profileBtn){ popup.remove(); document.removeEventListener("click",closeProfile); }};
  setTimeout(()=>{ document.addEventListener("click",closeProfile); },0);
};

// ================= EVENTS =================
sendBtn.onclick=sendMessage;
userInput.addEventListener("keydown",e=>{ if(e.key==="Enter") sendMessage(); });
searchChats.oninput=e=>renderChatList(e.target.value);

// ================= INIT =================
renderChatList();

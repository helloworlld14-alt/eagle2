const ADMIN_PASSWORD = "founder123"; // change later

const adminLogin = document.getElementById("adminLogin");
const dashboard = document.getElementById("dashboard");
const userList = document.getElementById("userList");

function checkAdmin(){
  const pass = document.getElementById("adminPass").value;
  if(pass === ADMIN_PASSWORD){
    adminLogin.style.display="none";
    dashboard.style.display="block";
    loadUsers();
  }else{
    alert("Wrong password");
  }
}

function loadUsers(){
  userList.innerHTML="";
  const users = JSON.parse(localStorage.getItem("chatAIUsers")) || [];

  if(users.length === 0){
    userList.innerHTML="<p>No users yet</p>";
    return;
  }

  users.forEach((u,i)=>{
    const div=document.createElement("div");
    div.className="user-card";
    div.innerHTML=`
      <strong>${u.name || "User"}</strong><br>
      ${u.email || u.mobile}<br>
      <small>${u.loginType}</small>
      <div class="status ${u.active?"active":"expired"}">
        ${u.active?"Active":"Expired"}
      </div>
      <div class="actions">
        <button class="toggle" onclick="toggleUser(${i})">
          ${u.active?"Expire":"Activate"}
        </button>
        <button class="delete" onclick="deleteUser(${i})">Delete</button>
      </div>
    `;
    userList.appendChild(div);
  });
}

function toggleUser(i){
  const users = JSON.parse(localStorage.getItem("chatAIUsers")) || [];
  users[i].active = !users[i].active;
  localStorage.setItem("chatAIUsers", JSON.stringify(users));
  loadUsers();
}

function deleteUser(i){
  if(!confirm("Delete this user permanently?")) return;
  const users = JSON.parse(localStorage.getItem("chatAIUsers")) || [];
  users.splice(i,1);
  localStorage.setItem("chatAIUsers", JSON.stringify(users));
  loadUsers();
}

function downloadExcel(){
  let csv = "Name,Email/Mobile,LoginType,Status\n";
  const users = JSON.parse(localStorage.getItem("chatAIUsers")) || [];
  users.forEach(u=>{
    csv += `${u.name||""},${u.email||u.mobile},${u.loginType},${u.active?"Active":"Expired"}\n`;
  });

  const blob = new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="chat-ai-users.csv";
  a.click();
}

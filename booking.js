var BK_API="https://script.google.com/macros/s/AKfycbzeulk8nVhROOmrnysLKRLGqM_naMEgVhtPl50ch_GCilibJ7MXv2rWlGlq1hz1SWc/exec";
var bkSlot=null;

fetch(BK_API+"?action=slots").then(function(r){return r.json()}).then(function(d){
  document.getElementById("slots-loading").style.display="none";
  var el=document.getElementById("slots");
  var days={};
  d.slots.forEach(function(s){if(!days[s.date])days[s.date]=[];days[s.date].push(s)});
  var h="";
  for(var dt in days){
    var ss=days[dt];var p=dt.split("-");
    h+="<div style='margin:.5rem 0'><b>"+parseInt(p[2])+"."+p[1]+"</b> ";
    ss.forEach(function(s){
      h+="<span onclick='bkPick(this,\""+s.date+"\",\""+s.time+"\")'"
        +" style='display:inline-block;padding:.3rem .8rem;margin:.15rem;border:1px solid #ddd;border-radius:.3rem;cursor:pointer'>"+s.time+"</span>";
    });
    h+="</div>";
  }
  el.innerHTML=h||"<p>Нет свободных окон</p>";
}).catch(function(){document.getElementById("slots-loading").textContent=""});

function bkPick(el,date,time){
  document.querySelectorAll("#slots span").forEach(function(s){s.style.background="";s.style.color=""});
  el.style.background="#111";el.style.color="#fff";
  bkSlot={date:date,time:time};
  document.getElementById("bk-btn").disabled=false;
  document.getElementById("bk-btn").textContent=time+" — ЗАПРОСИТЬ ВРЕМЯ";
}

function bkBook(){
  var n=document.getElementById("bk-name").value;
  var c=document.getElementById("bk-contact").value;
  if(!n||!c||!bkSlot)return;
  document.getElementById("bk-btn").disabled=true;
  document.getElementById("bk-btn").textContent="...";
  var u=BK_API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+bkSlot.date+"&time="+bkSlot.time;
  fetch(u).then(function(r){return r.json()}).then(function(d){
    if(d.ok){document.getElementById("bk-msg").textContent="Заявка отправлена! Ольга свяжется с вами для подтверждения.";}
    else if(d.error=="slot_taken"){document.getElementById("bk-msg").textContent="Время занято. Выберите другое.";document.getElementById("bk-btn").disabled=false}
    else document.getElementById("bk-msg").textContent="Ошибка. Попробуйте позже.";
  }).catch(function(){document.getElementById("bk-msg").textContent="Ошибка сети.";document.getElementById("bk-btn").disabled=false});
}

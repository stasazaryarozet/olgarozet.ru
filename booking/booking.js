var API="https://script.google.com/macros/s/AKfycbzeulk8nVhROOmrnysLKRLGqM_naMEgVhtPl50ch_GCilibJ7MXv2rWlGlq1hz1SWc/exec";
var slot=null;

fetch(API+"?action=slots")
  .then(function(r){return r.json()})
  .then(function(d){
    document.getElementById("loading").style.display="none";
    document.getElementById("form").style.display="block";
    var el=document.getElementById("slots");
    var days={};
    var names={пн:"Понедельник",вт:"Вторник",ср:"Среда",чт:"Четверг",пт:"Пятница"};
    d.slots.forEach(function(s){
      if(!days[s.date])days[s.date]=[];
      days[s.date].push(s);
    });
    var h="";
    for(var dt in days){
      var ss=days[dt]; var p=dt.split("-");
      var label=(names[ss[0].weekday]||ss[0].weekday)+", "+parseInt(p[2])+"."+p[1];
      h+="<div class='day'><div class='day-label'>"+label+"</div>";
      ss.forEach(function(s){
        h+="<span class='slot' onclick='pick(this,\""+s.date+"\",\""+s.time+"\")'>"+s.time+"</span>";
      });
      h+="</div>";
    }
    el.innerHTML=h||"<p style='text-align:center;color:#999'>Нет свободного времени</p>";
  })
  .catch(function(){
    document.getElementById("loading").textContent="Не удалось загрузить расписание";
  });

function pick(el,date,time){
  document.querySelectorAll(".slot").forEach(function(s){s.classList.remove("on")});
  el.classList.add("on");
  slot={date:date,time:time};
  document.getElementById("btn").disabled=false;
  document.getElementById("btn").textContent=time+" — ЗАПРОСИТЬ ВРЕМЯ";
}

function book(){
  var n=document.getElementById("name").value.trim();
  var c=document.getElementById("contact").value.trim();
  if(!n||!c||!slot)return;
  document.getElementById("btn").disabled=true;
  document.getElementById("btn").textContent="Отправка...";
  var u=API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+slot.date+"&time="+slot.time;
  fetch(u)
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.ok){
        document.getElementById("msg").innerHTML="<b>Заявка отправлена!</b><br>Ольга свяжется с вами для подтверждения.";
        document.getElementById("form").style.display="none";
        document.getElementById("slots").style.display="none";
      } else if(d.error=="slot_taken"){
        document.getElementById("msg").textContent="Это время уже занято. Выберите другое.";
        document.getElementById("btn").disabled=false;
        document.getElementById("btn").textContent="ЗАПРОСИТЬ ВРЕМЯ";
      } else {
        document.getElementById("msg").textContent="Ошибка. Попробуйте позже.";
        document.getElementById("btn").disabled=false;
      }
    })
    .catch(function(){
      document.getElementById("msg").textContent="Ошибка сети. Попробуйте позже.";
      document.getElementById("btn").disabled=false;
    });
}

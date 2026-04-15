var CAL_KEY="AIzaSyCryyZdzrWCqNrN7slOnUJavVcOboFdT5I";
var CAL_ID="o.g.rozet@gmail.com";
var MARKER="Возможная консультация";
var API="https://script.google.com/macros/s/AKfycbzeulk8nVhROOmrnysLKRLGqM_naMEgVhtPl50ch_GCilibJ7MXv2rWlGlq1hz1SWc/exec";
var slot=null,allDays=[],submitted=false;

document.getElementById("tz").textContent="время показано по вашему часовому поясу";

(function(){
  var now=new Date();
  var url="https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(CAL_ID)
    +"/events?key="+CAL_KEY+"&q="+encodeURIComponent(MARKER)
    +"&timeMin="+new Date(now.getTime()+86400000).toISOString()
    +"&timeMax="+new Date(now.getTime()+14*86400000).toISOString()
    +"&singleEvents=true&orderBy=startTime";
  fetch(url).then(function(r){return r.json()}).then(function(d){
    document.getElementById("loading").style.display="none";
    var days={};
    (d.items||[]).forEach(function(e){
      var dt=new Date(e.start.dateTime);
      var key=dt.toISOString().slice(0,10);
      if(!days[key])days[key]=[];
      days[key].push({
        date:key,
        time:dt.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit",hour12:false}),
        id:e.id,
        label:dt.toLocaleDateString("ru",{weekday:"long",day:"numeric",month:"long"})
      });
    });
    allDays=Object.keys(days).map(function(k){return{key:k,slots:days[k]}});
    render(7);
    if(allDays.length>7)document.getElementById("more").style.display="block";
  }).catch(function(){
    document.getElementById("loading").innerHTML="Напишите Ольге: <a href='https://t.me/olgaroset'>@olgaroset</a> или <a href='mailto:o.g.rozet@gmail.com'>o.g.rozet@gmail.com</a>";
  });
})();

function render(n){
  var el=document.getElementById("slots");var h="";
  allDays.slice(0,n).forEach(function(d){
    h+="<div class='day'><div class='day-label'>"+d.slots[0].label+"</div>";
    d.slots.forEach(function(s){
      h+="<span class='t' onclick='pick(this,\""+s.date+"\",\""+s.time+"\",\""+s.id+"\")'>"+s.time+"</span>";
    });
    h+="</div>";
  });
  el.innerHTML=h||"<p style='text-align:center;color:#999'>Свободного времени нет</p>";
}
function showAll(){render(allDays.length);document.getElementById("more").style.display="none"}
function pick(el,d,t,id){
  document.querySelectorAll(".t").forEach(function(s){s.classList.remove("on")});
  el.classList.add("on");slot={date:d,time:t,id:id};
  document.getElementById("bk-btn").disabled=false;
  document.getElementById("bk-btn").textContent=t+" — ЗАПРОСИТЬ ВРЕМЯ";
}
function book(){
  if(submitted)return false;
  if(!slot)return false;
  var n=document.getElementById("bk-name").value.trim();
  var c=document.getElementById("bk-contact").value.trim();
  if(!n){document.getElementById("bk-name").focus();return false}
  if(!c){document.getElementById("bk-contact").focus();return false}
  var btn=document.getElementById("bk-btn");
  btn.disabled=true;btn.textContent="Отправка...";
  fetch(API+"?name="+encodeURIComponent(n)+"&contact="+encodeURIComponent(c)+"&date="+slot.date+"&time="+slot.time+"&id="+slot.id)
    .then(function(r){return r.json()}).then(function(d){
      if(d.ok){submitted=true;
        document.getElementById("bk-msg").innerHTML="<b>Заявка отправлена!</b><br>Ольга свяжется с вами для подтверждения.";
        document.getElementById("slots").style.display="none";
        document.getElementById("more").style.display="none";
        document.getElementById("bk-name").style.display="none";
        document.getElementById("bk-contact").style.display="none";
        btn.style.display="none";
      }else if(d.error=='name_required'){document.getElementById('bk-msg').textContent='Введите имя';document.getElementById('bk-name').focus();btn.disabled=false;btn.textContent='ЗАПРОСИТЬ ВРЕМЯ'}
      else if(d.error=='contact_required'){document.getElementById('bk-msg').textContent='Введите контакт';document.getElementById('bk-contact').focus();btn.disabled=false;btn.textContent='ЗАПРОСИТЬ ВРЕМЯ'}
      else{document.getElementById('bk-msg').textContent='Ошибка. Попробуйте позже.';btn.disabled=false;btn.textContent='ЗАПРОСИТЬ ВРЕМЯ'}
    }).catch(function(){document.getElementById("bk-msg").textContent="Ошибка сети.";btn.disabled=false;btn.textContent="ЗАПРОСИТЬ ВРЕМЯ"});
  return false; // prevent form submit
}

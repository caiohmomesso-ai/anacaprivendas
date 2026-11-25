
document.addEventListener('click', e=>{
  const c=e.target.closest('[data-demo]');
  if(c){ window.__demo=c.dataset.demo; iniciarApp(); return; }
  if(e.target.id==='trocademo'){ window.__demo=null;
    document.getElementById('app').classList.remove('on');
    document.getElementById('login').classList.remove('off'); }
});
const _render=render;
render=function(){ _render();
  const f=document.getElementById('fitademo');
  if(f){ f.style.display='flex';
    f.innerHTML='<b>Demonstração</b><span>dados de exemplo · nada é salvo</span>'+
      '<button id="trocademo">Trocar de perfil</button>'; }
};

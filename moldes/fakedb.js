
/* ============ modo demonstração: banco falso, tudo na memória ============ */
(function(){
  const DB={}; let seq=1;
  const TETO=1000;   // o mesmo teto por resposta que o Supabase aplica
  const uid=()=>'d'+(seq++).toString(36).padStart(7,'0');
  const ok=d=>({data:d,error:null});
  const tbl=n=>DB[n]||(DB[n]=[]);
  function builder(nome){
    const F=[]; let op='select',carga=null,conf=null,ord=[],lim=null,um=null,faixa=null;
    const api={}; const mais=f=>{F.push(f);return api;};
    api.select=()=>api;
    api.insert=v=>{op='insert';carga=v;return api;};
    api.update=v=>{op='update';carga=v;return api;};
    api.upsert=(v,o)=>{op='upsert';carga=v;conf=((o&&o.onConflict)||'').split(',').map(x=>x.trim()).filter(Boolean);return api;};
    api.delete=()=>{op='delete';return api;};
    api.eq=(c,v)=>mais(r=>r[c]===v);
    api.neq=(c,v)=>mais(r=>r[c]!==v);
    api.is=(c,v)=>mais(r=>(r[c]==null)===(v==null));
    api.in=(c,a)=>mais(r=>a.indexOf(r[c])>=0);
    api.gte=(c,v)=>mais(r=>r[c]>=v);
    api.lte=(c,v)=>mais(r=>r[c]<=v);
    api.gt=(c,v)=>mais(r=>r[c]>v);
    api.lt=(c,v)=>mais(r=>r[c]<v);
    api.ilike=(c,v)=>{const t=String(v).replace(/%/g,'').toUpperCase();
      return mais(r=>String(r[c]||'').toUpperCase().indexOf(t)>=0);};
    api.match=o=>{Object.keys(o).forEach(k=>mais(r=>r[k]===o[k]));return api;};
    // ordem por várias colunas, como o banco de verdade
    api.order=(c,o)=>{ord.push({c,asc:!o||o.ascending!==false});return api;};
    api.limit=n=>{lim=n;return api;};
    // o Supabase devolve no máximo mil linhas por resposta. A demonstração
    // imita esse teto, senão ela esconde justamente o erro que ele causava.
    api.range=(a,b)=>{faixa=[a,Math.min(b,a+TETO-1)];return api;};
    api.single=()=>{um=1;return api;};
    api.maybeSingle=()=>{um=1;return api;};
    api.then=(res,rej)=>Promise.resolve(roda()).then(res,rej);
    const filtra=()=>tbl(nome).filter(r=>F.every(f=>f(r)));
    function roda(){
      let d;
      if(op==='select'){ d=filtra();
        if(ord.length) d=d.slice().sort((a,b)=>{
          for(const o of ord){ const x=a[o.c],y=b[o.c];
            if(x>y) return o.asc?1:-1; if(x<y) return o.asc?-1:1; }
          return 0;
        });
        if(faixa) d=d.slice(faixa[0], faixa[1]+1);
        else if(lim) d=d.slice(0, Math.min(lim,TETO));
        else d=d.slice(0,TETO);
      } else if(op==='insert'){
        d=[].concat(carga).map(v=>Object.assign({id:uid(),criado_em:new Date().toISOString()},v));
        tbl(nome).push.apply(tbl(nome),d);
      } else if(op==='update'){ d=filtra(); d.forEach(r=>Object.assign(r,carga));
      } else if(op==='delete'){ const t=tbl(nome); d=filtra(); d.forEach(r=>{const i=t.indexOf(r); if(i>=0) t.splice(i,1);});
      } else if(op==='upsert'){
        d=[]; [].concat(carga).forEach(v=>{
          const ex=conf&&conf.length?tbl(nome).find(r=>conf.every(c=>r[c]===v[c])):null;
          if(ex){ Object.assign(ex,v); d.push(ex); }
          else { const n=Object.assign({id:uid(),criado_em:new Date().toISOString()},v); tbl(nome).push(n); d.push(n); }
        });
      }
      return ok(um?(d[0]||null):d);
    }
    return api;
  }
  window.supabase={createClient:()=>({
    from:builder,
    auth:{
      getSession:async()=>ok({session:window.__demo?{user:{id:window.__demo}}:null}),
      getUser:async()=>ok({user:window.__demo?{id:window.__demo}:null}),
      signInWithPassword:async()=>({data:null,error:{message:'Use os perfis da tela de demonstração.'}}),
      signOut:async()=>{window.__demo=null;return ok(null);}
    },
    channel:()=>({on(){return this;},subscribe(){return this;}}),
    removeChannel(){}
  })};

  /* ---------------- dados de exemplo ---------------- */
  let sd=20260908;
  const rnd=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  const esc=(a)=>a[Math.floor(rnd()*a.length)];
  const hj=new Date();
  const dstr=n=>{const d=new Date(hj);d.setDate(d.getDate()-n);
    return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
  const mais=(dt,n)=>{const d=new Date(dt+'T12:00:00');d.setDate(d.getDate()+n);
    return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};

  DB.lojas=[
    {id:'PSB',nome:'PSB',meta:108000,mva:217,mpa:1.27,mbs:10,mcv:50,limite_sangria:200,cb_pct:30,cb_libera:7,cb_validade:30,cb_multiplo:3,hora_abre:10,hora_fecha:22,aba_digital:true,fup_sumida:60},
    {id:'TAM',nome:'Tamboré',meta:170000,mva:222.22,mpa:1.16,mbs:11,mcv:50,limite_sangria:200,cb_pct:30,cb_libera:7,cb_validade:30,cb_multiplo:3,hora_abre:10,hora_fecha:22,aba_digital:false,fup_sumida:60}];
  DB.pessoas=[
    {id:'p0',loja_id:null,nome:'CAIO',papel:'dono',meta:0,ativa:true,ordem:0,user_id:'u_caio'},
    {id:'p1',loja_id:'PSB',nome:'AMANDA',papel:'gerente',meta:0,ativa:true,ordem:0,user_id:'u_amanda'},
    {id:'p2',loja_id:'PSB',nome:'ERIKA',papel:'vendedora',meta:37931,ativa:true,ordem:1,user_id:'u_erika'},
    {id:'p3',loja_id:'PSB',nome:'LAURA',papel:'vendedora',meta:34138,ativa:true,ordem:2,user_id:null},
    {id:'p4',loja_id:'PSB',nome:'THAYNA',papel:'vendedora',meta:37931,ativa:true,ordem:3,user_id:null},
    {id:'p5',loja_id:'TAM',nome:'KELLY',papel:'gerente',meta:0,ativa:true,ordem:0,user_id:null},
    {id:'p6',loja_id:'TAM',nome:'GILVANEIDE',papel:'vendedora',meta:56667,ativa:true,ordem:1,user_id:null},
    {id:'p7',loja_id:'TAM',nome:'ISA',papel:'vendedora',meta:56667,ativa:true,ordem:2,user_id:null},
    {id:'p8',loja_id:'TAM',nome:'LÍVIA',papel:'vendedora',meta:56667,ativa:true,ordem:3,user_id:null},
    {id:'p9',loja_id:'TAM',nome:'TABLET TAMBORÉ',papel:'tablet',meta:0,ativa:true,ordem:9,user_id:'u_tablet'}];
  DB.motivos=[['FALTOU NUMERAÇÃO',1],['FALTOU O MODELO',1],['NÃO GOSTOU DO MODELO',0],['ACHOU CARO',0],
    ['SÓ QUERIA SABER O PREÇO',0],['VAI PENSAR E VOLTA DEPOIS',0],['FORMA DE PAGAMENTO NÃO ACEITA',0],
    ['RESERVA DE PRODUTO',1],['TROCA',0],['ACOMPANHANTE',0]]
    .map((m,i)=>({id:'m'+i,texto:m[0],exige_sku:!!m[1],ordem:i+1}));
  DB.categorias_despesa=[
    ['ALUGUEL','OCUPAÇÃO'],['CONDOMÍNIO','OCUPAÇÃO'],['IPTU','OCUPAÇÃO'],['ENERGIA','OCUPAÇÃO'],
    ['ÁGUA','OCUPAÇÃO'],['FUNDO DE PROMOÇÃO DO SHOPPING','OCUPAÇÃO'],
    ['SALÁRIOS','PESSOAL'],['ENCARGOS','PESSOAL'],['COMISSÕES','PESSOAL'],['VALE TRANSPORTE','PESSOAL'],
    ['VALE REFEIÇÃO','PESSOAL'],['UNIFORME','PESSOAL'],['TREINAMENTO','PESSOAL'],
    ['TRÁFEGO PAGO','MARKETING'],['MATERIAL GRÁFICO','MARKETING'],['BRINDES E AÇÕES','MARKETING'],
    ['CONTABILIDADE','ADMINISTRATIVAS'],['SOFTWARE E SISTEMAS','ADMINISTRATIVAS'],
    ['TELEFONE E INTERNET','ADMINISTRATIVAS'],['PAPELARIA','ADMINISTRATIVAS'],['JURÍDICO','ADMINISTRATIVAS'],
    ['PRODUTOS DE LIMPEZA','MANUTENÇÃO E CONSUMO'],['MANUTENÇÃO PREDIAL','MANUTENÇÃO E CONSUMO'],
    ['MANUTENÇÃO DE EQUIPAMENTOS','MANUTENÇÃO E CONSUMO'],['COPA E COZINHA','MANUTENÇÃO E CONSUMO'],
    ['SACOLAS E EMBALAGENS','MANUTENÇÃO E CONSUMO'],
    ['TAXAS DE CARTÃO','FINANCEIRAS'],['TARIFAS BANCÁRIAS','FINANCEIRAS'],['JUROS E MULTAS','FINANCEIRAS'],
    ['ROYALTIES','ROYALTIES E FRANQUIA'],['FUNDO DE PROPAGANDA','ROYALTIES E FRANQUIA'],
    ['FRETE E ENTREGA','LOGÍSTICA'],['TRANSFERÊNCIA ENTRE LOJAS','LOGÍSTICA'],
    ['OUTRAS DESPESAS','OUTRAS']]
    .map((c,i)=>({id:'cd'+i,nome:c[0],grupo_dre:c[1],ordem:i,ativa:true}));
  DB.pausas=['ALMOÇO','LANCHE','ESTOQUE','ORGANIZAÇÃO DA LOJA','REUNIÃO','FOLGA','FÉRIAS']
    .map((t,i)=>({id:'z'+i,texto:t,ordem:i+1}));

  const EQ={PSB:['ERIKA','LAURA','THAYNA'],TAM:['GILVANEIDE','ISA','LÍVIA']};
  const PAGS=['DEBITO','CREDITO AV','CREDITO X','CREDITO X','PIX','PIX','DINHEIRO','LINK ZZNET'];
  const NOMES=['MARIA','RAFAELA ARAUJO','JULIANA COSTA','PATRICIA LIMA','FERNANDA DIAS','CAMILA SOUZA',
               'ALINE MOREIRA','BEATRIZ ROCHA','SIMONE ALVES','TATIANE NUNES','VANESSA PRADO','LUCIANA MELO',
               'DANIELA PINTO','RENATA BORGES','CAROLINA SÁ','MÔNICA TAVARES','PRISCILA GOMES','SANDRA REIS',
               'ELAINE CARDOSO','BIANCA FREITAS','MARCELA DUARTE','NATÁLIA PAIVA','SILVIA MENDES','ROBERTA LUZ'];
  const SKUS=['1274503-01 35','1274503-01 37','1198220-04 36','1305117-02 38','1274503-09 34','1198220-04 39'];
  DB.vendas=[];DB.atendimentos=[];DB.atend_manual=[];DB.caixa_mov=[];DB.dias=[];
  DB.despesas=[];DB.escala=[];DB.clientes=[];DB.bonus=[];DB.fila=[];DB.reaberturas=[];
  DB.plantao=[];DB.followups=[];

  NOMES.forEach((n,i)=>DB.clientes.push({id:'c'+i,loja_id:i%3?'PSB':'TAM',nome:n,
    telefone:'179'+String(90000000+i*1373).slice(0,8)}));

  for(let k=169;k>=0;k--){
    const data=dstr(k), dow=new Date(data+'T12:00:00').getDay();
    ['PSB','TAM'].forEach(lj=>{
      const eq=EQ[lj], base=lj==='PSB'?9:14;
      const qtd=Math.max(3,Math.round(base*(dow===0?.5:dow>=5?1.3:1)*(0.75+rnd()*0.5)));
      DB.dias.push({id:uid(),loja_id:lj,data,caixa_ini:200,caixa_outros:0,caixa_conf:null,fechado:k>0});
      let bol=17000+k*40;
      for(let v=0;v<qtd;v++){
        const vend=esc(eq), pag=esc(PAGS);
        const tot=Math.round((139.9+rnd()*420)*100)/100;
        const sap=rnd()<0.86?1:2, bol2=rnd()<0.09?1:0;
        DB.vendas.push({id:uid(),loja_id:lj,data,vendedora:vend,boleta:String(bol++),pagamento:pag,
          total:tot,sapatos:sap,bolsas:bol2,acessorios:rnd()<0.05?1:0,
          canal:rnd()<0.08?'ONLINE':'LOJA',obs:'',origem:'fila',criado_em:data+'T15:00:00Z'});
        if(rnd()<0.34){
          const dacasa=DB.clientes.filter(c=>c.loja_id===lj);
            const cl=dacasa[Math.floor(rnd()*dacasa.length)];
          if(cl){ const lib=mais(data,7);
            DB.bonus.push({id:uid(),loja_id:lj,cliente_id:cl.id,data,boleta:String(bol-1),vendedora:vend,
              valor_venda:tot,valor_bonus:Math.round(tot*30)/100,libera_em:lib,vence_em:mais(lib,30),
              resgatado_em:null,resgate_valor:null});
            const b=DB.bonus[DB.bonus.length-1];
            if(k>45 && rnd()<0.42){ b.resgatado_em=mais(b.libera_em,Math.floor(rnd()*25));
              b.resgate_valor=Math.round(b.valor_bonus*3.4*100)/100; }
            else if(k>8 && k<=45 && rnd()<0.22){ b.resgatado_em=mais(b.libera_em,Math.floor(rnd()*12));
              b.resgate_valor=Math.round(b.valor_bonus*3.2*100)/100; } }
        }
      }
      if(k<=45){
        eq.forEach(nm=>{
          const at=Math.round(qtd/eq.length*(1.7+rnd()));
          for(let a=0;a<at;a++){
            const vendeu=rnd()<0.47, hora=10+Math.floor(rnd()*11);
            const mt=esc(DB.motivos);
            DB.atendimentos.push({id:uid(),loja_id:lj,data,vendedora:nm,
              inicio:data+'T'+String(hora).padStart(2,'0')+':'+String(Math.floor(rnd()*59)).padStart(2,'0')+':00Z',
              fim:data+'T'+String(hora).padStart(2,'0')+':'+String(20+Math.floor(rnd()*35)).padStart(2,'0')+':00Z',
              vendeu, motivo:vendeu?null:mt.texto, sku:(!vendeu&&mt.exige_sku)?esc(SKUS):null,
              valor:(!vendeu&&mt.exige_sku)?Math.round((199+rnd()*300)*100)/100:null, boleta:null,
              canal:'LOJA', nome:null, telefone:null});
            // em 55% das perdas a vendedora pegou o contato: é delas que
            // nasce a lista de "chegou a peça"
            const ult=DB.atendimentos[DB.atendimentos.length-1];
            if(!vendeu && rnd()<0.55){
              const cl=esc(NOMES);
              ult.nome=cl; ult.telefone='179'+String(90000000+Math.floor(rnd()*9e7)).slice(0,8);
            }
          }
        });
      } else {
        eq.forEach(nm=>DB.atend_manual.push({id:uid(),loja_id:lj,data,vendedora:nm,
          qtd:Math.round(qtd/eq.length*(1.7+rnd()))}));
      }
      if(rnd()<0.5) DB.caixa_mov.push({id:uid(),loja_id:lj,data,tipo:'sangria',
        valor:Math.round((150+rnd()*400))*1,quem:lj==='PSB'?'AMANDA':'KELLY',
        destino:esc(['COFRE','DEPÓSITO BANCÁRIO']),obs:'',autorizado_por:lj==='PSB'?'AMANDA':'KELLY',
        criado_em:data+'T19:30:00Z'});
    });
  }
  /* ---- atendimento digital e plantão dos últimos 30 dias ---- */
  for(let k=30;k>=0;k--){
    const data=dstr(k);
    ['PSB','TAM'].forEach(lj=>{
      const eq=EQ[lj];
      const resp=eq[(k+(lj==='PSB'?0:1))%eq.length];
      DB.plantao.push({loja_id:lj,data,vendedora:resp,posto_por:lj==='PSB'?'AMANDA':'KELLY',
        criado_em:data+'T09:40:00Z'});
      const qtd=2+Math.floor(rnd()*5);
      for(let i=0;i<qtd;i++){
        const canal=rnd()<0.72?'WHATSAPP':'INSTAGRAM';
        const vendeu=rnd()<0.38, hora=10+Math.floor(rnd()*11);
        const mt=esc(DB.motivos), cl=esc(NOMES);
        const tel='179'+String(90000000+Math.floor(rnd()*9e7)).slice(0,8);
        const tot=Math.round((169.9+rnd()*480)*100)/100;
        const ini=data+'T'+String(hora).padStart(2,'0')+':'+String(Math.floor(rnd()*59)).padStart(2,'0')+':00Z';
        const a={id:uid(),loja_id:lj,data,vendedora:resp,canal,nome:cl,telefone:tel,
          inicio:ini, fim:ini, vendeu,
          motivo:vendeu?null:mt.texto, sku:(!vendeu&&mt.exige_sku)?esc(SKUS):null,
          valor:vendeu?tot:((!vendeu&&mt.exige_sku)?Math.round((199+rnd()*300)*100)/100:null),
          boleta:vendeu?String(19000+k*7+i):null};
        DB.atendimentos.push(a);
        if(vendeu) DB.vendas.push({id:uid(),loja_id:lj,data,vendedora:resp,boleta:a.boleta,
          pagamento:rnd()<0.5?'PIX':'LINK ZZNET',total:tot,sapatos:1,bolsas:0,acessorios:0,
          canal,obs:rnd()<0.5?'entrega por motoboy':'retirada na loja',origem:'digital',
          atendimento_id:a.id,criado_em:ini});
      }
    });
  }
  // sete clientes que compraram uma vez e nunca voltaram, para a lista de
  // "cliente sumida" ter o que mostrar
  ['ADRIANA PEIXOTO','CRISTINA VALE','HELOISA BRAGA','IVONE SANTOS',
   'MARISA FONTES','NEIDE CAMPOS','ROSANA TEIXEIRA'].forEach((n,i)=>{
    const lj=i%2?'PSB':'TAM', k=95+i*22;
    const c={id:'cd'+i,loja_id:lj,nome:n,telefone:'179'+String(91000000+i*2711).slice(0,8)};
    DB.clientes.push(c);
    const data=dstr(k), lib=mais(data,7), tot=Math.round((189.9+rnd()*300)*100)/100;
    DB.bonus.push({id:uid(),loja_id:lj,cliente_id:c.id,data,boleta:String(16000+i),
      vendedora:esc(EQ[lj]),valor_venda:tot,valor_bonus:Math.round(tot*30)/100,
      libera_em:lib,vence_em:mais(lib,30),resgatado_em:null,resgate_valor:null});
  });

  // alguns follow-ups já feitos, para a aba não nascer vazia de histórico
  ['PSB','TAM'].forEach(lj=>{
    const meus=DB.bonus.filter(b=>b.loja_id===lj).slice(-6);
    meus.forEach((b,i)=>{
      if(i%2) return;
      const c=DB.clientes.find(x=>x.id===b.cliente_id)||{};
      DB.followups.push({id:uid(),loja_id:lj,data:dstr(1+i),tipo:i%4?'VENCENDO':'POSVENDA',
        chave:b.id,cliente_id:b.cliente_id,nome:c.nome||null,telefone:c.telefone||null,
        resultado:esc(['FALEI','SEM_RESPOSTA','VENDEU']),obs:null,
        quem:lj==='PSB'?'AMANDA':'KELLY',criado_em:dstr(1+i)+'T16:00:00Z'});
    });
  });

  const cat=n=>(DB.categorias_despesa.find(c=>c.nome===n)||{}).id;
  const MODELO=[
    ['aluguel do mês','ALUGUEL',null,'PIX'],
    ['condomínio','CONDOMÍNIO',null,'PIX'],
    ['energia elétrica','ENERGIA',null,'DEB CAIO'],
    ['royalties Arezzo&Co','ROYALTIES',null,'PIX'],
    ['taxa de maquininha','TAXAS DE CARTÃO',null,'DEB CAIO'],
    ['produtos de limpeza','PRODUTOS DE LIMPEZA',null,'DEB CAIO'],
    ['sacolas personalizadas','SACOLAS E EMBALAGENS',null,'DEB CAIO'],
    ['água mineral e café','COPA E COZINHA',null,'DINHEIRO'],
    ['conserto do ar condicionado','MANUTENÇÃO DE EQUIPAMENTOS',null,'PIX'],
    ['impulsionamento Instagram','TRÁFEGO PAGO',null,'DEB CAIO'],
    ['motoboy entregas','FRETE E ENTREGA',null,'DINHEIRO'],
    ['papelaria e etiquetas','PAPELARIA',null,'DEB JULIANA'],
    ['uniforme da equipe','UNIFORME',null,'PIX'],
    ['honorários contábeis','CONTABILIDADE',null,'PIX'],
    ['lâmpadas da vitrine','MANUTENÇÃO PREDIAL',null,'DINHEIRO'],
    ['café para as clientes','COPA E COZINHA',null,'DINHEIRO']];
  const BASE={'ALUGUEL':[9000,14000],'CONDOMÍNIO':[2200,3400],'ENERGIA':[900,1700],
    'ROYALTIES':[4000,9000],'TAXAS DE CARTÃO':[1800,3600],'TRÁFEGO PAGO':[300,900],
    'FRETE E ENTREGA':[60,220],'UNIFORME':[300,800],'CONTABILIDADE':[800,1400]};
  for(let m=0;m<=4;m++){
    ['PSB','TAM'].forEach(lj=>{
      MODELO.forEach((x,i)=>{
        if(m>0 && rnd()<0.45) return;
        const faixa=BASE[x[1]]||[30,190];
        // umas poucas ficam sem categoria, de propósito
        const semCat = (m===0 && i%7===3);
        DB.despesas.push({id:uid(),loja_id:lj,
          data:dstr(m*30+Math.floor(rnd()*26)+1),
          valor:Math.round((faixa[0]+rnd()*(faixa[1]-faixa[0]))*100)/100,
          unidade:'ANACAPRI',pago_com:x[3],descricao:x[0],
          categoria_id: semCat?null:cat(x[1])});
      });
    });
  }

  const meses=[dstr(0).slice(0,7),dstr(32).slice(0,7),dstr(63).slice(0,7)];
  meses.forEach(mesAtual=>{
  const nDias=new Date(+mesAtual.slice(0,4),+mesAtual.slice(5,7),0).getDate();
  ['PSB','TAM'].forEach(lj=>EQ[lj].forEach((nm,idx)=>{
    for(let d=1;d<=nDias;d++){
      const data=mesAtual+'-'+String(d).padStart(2,'0');
      const dow=new Date(data+'T12:00:00').getDay();
      const folga=(dow===0)||((d+idx*2)%7===0);
      DB.escala.push({id:uid(),loja_id:lj,data,vendedora:nm,turno:folga?'F':(idx===2&&dow===6?'T':'I')});
    }
  }));
  });
  window.__DB=DB;
})();

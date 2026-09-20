import db from '@/lib/mockDb';

import React,{useState,useEffect} from 'react';
import {Menu, Moon, Sun, Search, LogOut, Clock} from 'lucide-react';

export default function Topbar({title,onMenu,dark,onDark,search,onSearch,onTab,workspaceMode,onSwitchMode}) {
  const [clock,setClock]=useState('');
  useEffect(()=>{const update=()=>{const t=new Date().toLocaleTimeString('en-US',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});setClock(`${t} | PH Time (GMT+8)`);};update();const i=setInterval(update,1000);return ()=>clearInterval(i);},[]);
  return <header className="plant-topbar"><div className="breadcrumb"><button className="icon-button" onClick={onMenu} aria-label="Toggle sidebar"><Menu size={19}/></button><strong>{title}</strong></div>{onSwitchMode&&<div className="ws-mode-switch"><button className={workspaceMode==='cm'?'active':''} onClick={()=>onSwitchMode('cm')}>Corrective Maintenance / Break-in Request</button><button className={workspaceMode==='pm'?'active':''} onClick={()=>onSwitchMode('pm')}>Preventive Maintenance</button></div>}<div className="topbar-actions"><span className="topbar-clock"><Clock size={15}/>{clock}</span><label className="global-search"><Search size={16}/><input placeholder="Search work orders..." aria-label="Search all work orders" value={search} onChange={e=>{onSearch(e.target.value);onTab('orders');}}/><kbd>⌕</kbd></label><button className="icon-button" onClick={onDark} aria-label={dark?'Switch to light mode':'Switch to dark mode'}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><span className="topbar-divider"/><button className="icon-button" aria-label="Sign out" onClick={()=>db.auth.logout('/login')}><LogOut size={18}/></button></div></header>;
}
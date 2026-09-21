import React from 'react';
import { Wrench, LayoutDashboard, ClipboardList, Zap, ChartNoAxesCombined, CalendarDays, CalendarClock, Settings, ArrowUpRight, ShieldCheck, X, UserCircle, Package, Network, Repeat } from 'lucide-react';
import WorkspaceModeSwitch from '@/components/plant/WorkspaceModeSwitch';
const cmItems=[['focus',LayoutDashboard,"Today's Focus"],['orders',ClipboardList,'Work Orders'],['breakins',Zap,'Break-In Hub'],['analytics',ChartNoAxesCombined,'Analytics'],['calendar',CalendarDays,'Work Calendar']];
const pmItems=[['pmfocus',LayoutDashboard,"Today's Focus"],['pm',ClipboardList,'Work Orders'],['pmanalytics',ChartNoAxesCombined,'Analytics'],['pmcalendar',CalendarClock,'Work Calendar']];
const masterItems=[['items',Package,'Item Master'],['systems',Network,'System Registry']];
export default function Sidebar({tab,onTab,workspaces,workspace,onWorkspace,user,admin,open,onClose,count,pmCount,onProfile,profileName,workspaceMode='cm',onSwitchMode}) {
  const items=workspaceMode==='pm'?pmItems:cmItems;
  const appName=workspace?.app_name||'LPDSI Limay 1';
  const selectTab=key=>{onTab(key);if(window.innerWidth<=768)onClose();};
  return <><div className={`sidebar-backdrop ${open?'is-open':''}`} onClick={onClose}/><aside className={`plant-sidebar ${open?'is-open':'is-hidden'}`}>
    <div className="brand"><span className="brand-mark"><Wrench size={23}/></span><span className="brand-copy"><strong>{appName}</strong><small>INSTRUMENTATION &amp; CONTROL</small></span><button className="mobile-only icon-button" onClick={onClose} aria-label="Close navigation"><X size={18}/></button></div>
    <WorkspaceModeSwitch mode={workspaceMode} onSwitch={onSwitchMode}/>
    <div className="nav-heading">{workspaceMode==='pm'?'PREVENTIVE MAINTENANCE':'CORRECTIVE MAINTENANCE'}</div><nav>{items.filter(([key])=>admin||!['analytics','pmanalytics'].includes(key)).map(([key,Icon,label])=><button key={key} onClick={()=>selectTab(key)} className={`nav-item ${tab===key?'selected':''}`}><Icon size={18}/><span>{label}</span>{key==='orders'&&<span className="nav-count">{count}</span>}{key==='breakins'&&<span className="nav-dot"/>}{key==='pm'&&<span className="nav-count">{pmCount||0}</span>}</button>)}</nav>
    {admin&&<><div className="nav-heading" style={{marginTop:14}}>MASTER DATA HUB</div><nav>{masterItems.map(([key,Icon,label])=><button key={key} onClick={()=>selectTab(key)} className={`nav-item ${tab===key?'selected':''}`}><Icon size={18}/><span>{label}</span></button>)}</nav></>}
     <div className="sidebar-bottom"><div className="workspace-security"><ShieldCheck size={19}/><strong>Your plant. Your workspace.</strong><p>Isolated data. Focused execution.</p><span>SECURE WORKSPACE <ArrowUpRight size={12}/></span></div>{admin&&<button className={`nav-item ${tab==='settings'?'selected':''}`} onClick={()=>selectTab('settings')}><Settings size={18}/>Workspace Settings</button>}
    {onProfile&&<button className="nav-item" onClick={()=>{onProfile();if(window.innerWidth<=768)onClose();}}><UserCircle size={18}/>Profile & Shift</button>}
    <div className="sidebar-user"><span className="user-avatar">{(profileName||'Supervisor').slice(0,2).toUpperCase()}</span><div><strong>{profileName||'Plant Supervisor'}</strong><small>{workspace?.designation||(admin?'Workspace Admin':'Field User')}</small></div><span className="online-dot"/></div></div>
  </aside><nav className="mobile-bottom">{items.filter(([key])=>!['breakins','pmcalendar'].includes(key)&&(admin||!['analytics','pmanalytics'].includes(key))).map(([key,Icon,label])=><button key={key} className={tab===key?'selected':''} onClick={()=>onTab(key)}><Icon size={19}/><span>{label==='Today\'s Focus'?'Focus':label==='PM Today\'s Focus'?'PM Focus':label.replace('Work ','')}</span></button>)}</nav></>;
}
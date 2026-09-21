import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Bell,CalendarClock,CheckCheck,Mail,MailOpen,PackageMinus,UserPlus,Zap} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {aged,lowStockItems,overduePMs,newAssignments,today} from '@/components/plant/plantUtils';

const ICONS={critical:Zap,overdue:CalendarClock,aged:AlertTriangle,stock:PackageMinus,due:CalendarClock,assignment:UserPlus};
const notificationDate=item=>{const raw=item?.updated_at||item?.created_at||item?.created_date||item?.planned_start||item?.planned_finish;const date=raw?new Date(raw):new Date();return Number.isNaN(date.getTime())?new Date():date;};
const timeLabel=date=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(date);

export default function NotificationCenter({orders=[],items=[],settings={},onOpenJob,onGoToPM,onGoToItems}){
  const storageKey='icms-promax-read-notifications';
  const [readIds,setReadIds]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem(storageKey)||'[]'));}catch{return new Set();}});
  const [category,setCategory]=useState('corrective');
  const t=today();
  const notifications=useMemo(()=>{
    const cmOrders=orders.filter(j=>j.maintenance_type!=='PM'),pmOrders=orders.filter(j=>j.maintenance_type==='PM'),entries=[];
    cmOrders.filter(j=>j.job_type==='Break-In'&&j.priority==='Critical'&&['Open','In-Progress'].includes(j.status)).forEach(j=>entries.push({id:`critical-${j.id}`,category:'corrective',type:'critical',title:'Emergency corrective work order',detail:`${j.wo_number} · ${j.description}`,date:notificationDate(j),job:j,action:'Open work order'}));
    cmOrders.filter(j=>aged(j)>0).forEach(j=>entries.push({id:`aged-${j.id}`,category:'corrective',type:'aged',title:'Corrective work order past SLA',detail:`${j.wo_number} · ${aged(j)} days aged`,date:notificationDate(j),job:j,action:'Review'}));
    overduePMs(pmOrders).forEach(j=>entries.push({id:`overdue-${j.id}`,category:'preventive',type:'overdue',title:'Preventive work order overdue',detail:`${j.wo_number} · ${j.description}`,date:notificationDate(j),job:j,action:'Open PM'}));
    pmOrders.filter(j=>{if(['Completed','Cancelled'].includes(j.status)||!j.planned_start)return false;const diff=Math.round((new Date(`${j.planned_start}T12:00:00`)-new Date(`${t}T12:00:00`))/86400000);return diff>=0&&diff<=3;}).forEach(j=>entries.push({id:`due-${j.id}`,category:'preventive',type:'due',title:'Preventive work order due soon',detail:`${j.wo_number} · Due ${j.planned_start}`,date:notificationDate(j),job:j,action:'Open PM'}));
    if(settings.notify_low_stock!==false)lowStockItems(items,settings.low_stock_threshold??5).forEach(item=>entries.push({id:`stock-${item.id||item.item_code}`,category:'corrective',type:'stock',title:'Spare part low on stock',detail:`${item.item_code||item.name||'Item'} · Reorder required`,date:notificationDate(item),goItems:true,action:'Item Master'}));
    if(settings.notify_assignments!==false)newAssignments(cmOrders).forEach(j=>entries.push({id:`assignment-${j.id}`,category:'corrective',type:'assignment',title:'Assigned work not started',detail:`${j.wo_number} · ${j.technician||'Assigned technician'}`,date:notificationDate(j),job:j,action:'Open work order'}));
    return entries.sort((a,b)=>b.date-a.date);
  },[orders,items,settings,t]);
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify([...readIds]));}catch{}},[readIds]);
  const unread=notifications.filter(n=>!readIds.has(n.id)).length;
  const visibleNotifications=notifications.filter(n=>n.category===category);
  const categoryUnread=visibleNotifications.filter(n=>!readIds.has(n.id)).length;
  const markRead=id=>setReadIds(previous=>new Set([...previous,id]));
  const markUnread=id=>setReadIds(previous=>{const next=new Set(previous);next.delete(id);return next;});
  const markAllRead=()=>setReadIds(previous=>new Set([...previous,...visibleNotifications.map(n=>n.id)]));
  const markAllUnread=()=>setReadIds(previous=>{const next=new Set(previous);visibleNotifications.forEach(n=>next.delete(n.id));return next;});
  const openNotification=n=>{markRead(n.id);if(n.goItems)onGoToItems?.();else if(n.job)onOpenJob?.(n.job);else if(n.type==='due'||n.type==='overdue')onGoToPM?.();};
  return <Popover><PopoverTrigger asChild><button type="button" className="secondary-button notification-trigger" aria-label={`${unread} unread notifications`} title="Notifications"><Bell size={16}/><span>Notifications</span>{unread>0&&<b>{unread>99?'99+':unread}</b>}</button></PopoverTrigger><PopoverContent align="end" sideOffset={8} className="notification-popover">
    <div className="notification-head"><div><strong>Notifications</strong><span>{unread} unread across all work orders</span></div><div className="notification-bulk-actions"><button type="button" onClick={markAllRead} disabled={!categoryUnread}><CheckCheck size={14}/>Mark all as read</button><button type="button" onClick={markAllUnread} disabled={!visibleNotifications.some(n=>readIds.has(n.id))}><Mail size={14}/>Mark all as unread</button></div></div>
    <div className="notification-categories" role="tablist" aria-label="Notification type"><button type="button" role="tab" aria-selected={category==='corrective'} className={category==='corrective'?'active':''} onClick={()=>setCategory('corrective')}>Corrective <b>{notifications.filter(n=>n.category==='corrective'&&!readIds.has(n.id)).length}</b></button><button type="button" role="tab" aria-selected={category==='preventive'} className={category==='preventive'?'active':''} onClick={()=>setCategory('preventive')}>Preventive <b>{notifications.filter(n=>n.category==='preventive'&&!readIds.has(n.id)).length}</b></button></div>
    <div className="notification-list">{visibleNotifications.length?visibleNotifications.map(n=>{const Icon=ICONS[n.type]||Bell,isRead=readIds.has(n.id);return <article key={n.id} className={`notification-item ${n.type} ${isRead?'read':'unread'}`}><button type="button" className="notification-main" onClick={()=>openNotification(n)}><span className="notification-type-icon"><Icon size={16}/></span><span className="notification-copy"><strong>{n.title}</strong><span>{n.detail}</span><time dateTime={n.date.toISOString()}>{timeLabel(n.date)}</time></span>{!isRead&&<i aria-label="Unread"/>}</button><div className="notification-actions"><button type="button" onClick={()=>openNotification(n)}>{n.action}</button>{isRead?<button type="button" onClick={()=>markUnread(n.id)}><MailOpen size={13}/>Mark as unread</button>:<button type="button" onClick={()=>markRead(n.id)}><CheckCheck size={13}/>Acknowledge</button>}</div></article>}):<div className="notification-empty"><Bell size={24}/><strong>All clear</strong><span>No {category} work order alerts.</span></div>}</div>
  </PopoverContent></Popover>;
}